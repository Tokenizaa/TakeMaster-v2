import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  AdminReportSummary,
  AuditLogEntry,
  BillingInvoice,
  Episode,
  EpisodeParticipant,
  Guest,
  LibraryAsset,
  Organization,
  OrganizationMembership,
  OrganizationRole,
  PaymentGatewayEvent,
  PaymentMethodType,
  Production,
  SaaSPlanDefinition,
  SaaSRegistrationPayload,
  SaaSSubscription,
  ScheduleEvent,
  ScriptVersion,
  Show,
  SubscriptionPlanId,
  User,
  UserAccountStatus,
  UserShowPermission,
} from '../domain/contracts';
import { AppError } from '../domain/validation';
import {
  buildSeedSubscriptionsForOrg,
  buildSeedWorkspaceForOrg,
  RSPLAY_SAAS_PLANS,
  SEED_MEMBERSHIPS,
  SEED_ORGANIZATIONS,
  SEED_USERS,
  SEED_USER_SHOW_PERMISSIONS,
} from './seeds';
import { resolveProgramKnowledge } from './programKnowledge';
import { incrementMetric, logStructured } from './logger';

const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DEFAULT_SQLITE_PATH = path.join(DATA_DIR, 'takemaster_v2.sqlite');

let sqliteDb: DatabaseSync | null = null;
let currentDbPath: string = '';
let supabaseClient: SupabaseClient | null = null;

if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  try {
    supabaseClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );
  } catch (err) {
    logStructured('WARN', 'supabase_client_init_warning', { error: String(err) });
  }
}

export function getDbConnection(customPath?: string): DatabaseSync {
  if (sqliteDb && !customPath) {
    return sqliteDb;
  }
  const targetPath = customPath || DEFAULT_SQLITE_PATH;
  if (!sqliteDb || currentDbPath !== targetPath) {
    sqliteDb = new DatabaseSync(targetPath);
    currentDbPath = targetPath;
    sqliteDb.exec('PRAGMA foreign_keys = ON;');
    sqliteDb.exec('PRAGMA journal_mode = WAL;');
    runMigrationsAndBootstrap(sqliteDb);
  }
  return sqliteDb;
}

export function resetDbConnectionForTests(customPath = ':memory:'): DatabaseSync {
  if (sqliteDb) {
    try {
      sqliteDb.close();
    } catch {
      // ignore close error
    }
  }
  sqliteDb = new DatabaseSync(customPath);
  currentDbPath = customPath;
  sqliteDb.exec('PRAGMA foreign_keys = ON;');
  runMigrationsAndBootstrap(sqliteDb);
  return sqliteDb;
}

function tryAddColumn(db: DatabaseSync, table: string, columnDef: string) {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${columnDef};`);
  } catch {
    // Column already exists
  }
}

function runMigrationsAndBootstrap(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      plan TEXT NOT NULL DEFAULT 'rsplay_studio_pro',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      job_title TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      login_code TEXT NOT NULL DEFAULT 'rsplay123',
      avatar_url TEXT,
      last_login_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS organization_members (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'producer',
      created_at TEXT NOT NULL,
      UNIQUE(organization_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS shows (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      host TEXT NOT NULL DEFAULT '',
      format TEXT NOT NULL DEFAULT 'Entrevista',
      default_duration_min INTEGER NOT NULL DEFAULT 45,
      editorial_style TEXT NOT NULL DEFAULT '',
      scenario TEXT NOT NULL DEFAULT '',
      cameras_json TEXT NOT NULL DEFAULT '[]',
      standard_structure_json TEXT NOT NULL DEFAULT '[]',
      default_opening TEXT NOT NULL DEFAULT '',
      default_closing TEXT NOT NULL DEFAULT '',
      catalog_status TEXT NOT NULL DEFAULT 'active',
      category TEXT NOT NULL DEFAULT 'Geral',
      target_audience TEXT NOT NULL DEFAULT '',
      distribution_channels_json TEXT NOT NULL DEFAULT '[]',
      created_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_show_permissions (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      show_id TEXT NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
      can_view INTEGER NOT NULL DEFAULT 1,
      can_edit_editorial INTEGER NOT NULL DEFAULT 1,
      can_edit_script INTEGER NOT NULL DEFAULT 1,
      can_operate_studio INTEGER NOT NULL DEFAULT 1,
      can_manage_schedule INTEGER NOT NULL DEFAULT 1,
      can_manage_assets INTEGER NOT NULL DEFAULT 1,
      can_export INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(organization_id, user_id, show_id)
    );

    CREATE TABLE IF NOT EXISTS saas_subscriptions (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      show_id TEXT REFERENCES shows(id) ON DELETE SET NULL,
      plan_id TEXT NOT NULL,
      plan_name TEXT NOT NULL,
      billing_cycle TEXT NOT NULL DEFAULT 'monthly',
      amount_cents INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'BRL',
      status TEXT NOT NULL DEFAULT 'active',
      auto_renew INTEGER NOT NULL DEFAULT 1,
      payment_gateway TEXT NOT NULL DEFAULT 'RSPlay Pay / Stripe',
      payment_method_type TEXT NOT NULL DEFAULT 'credit_card',
      payment_method_last4 TEXT NOT NULL DEFAULT '4242',
      payment_method_brand TEXT NOT NULL DEFAULT 'Mastercard',
      gateway_customer_id TEXT NOT NULL,
      gateway_subscription_id TEXT NOT NULL,
      current_period_start TEXT NOT NULL,
      current_period_end TEXT NOT NULL,
      last_renewal_at TEXT,
      canceled_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS billing_invoices (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      subscription_id TEXT NOT NULL REFERENCES saas_subscriptions(id) ON DELETE CASCADE,
      invoice_number TEXT NOT NULL,
      description TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'BRL',
      status TEXT NOT NULL DEFAULT 'paid',
      payment_method TEXT NOT NULL DEFAULT 'credit_card',
      gateway_transaction_id TEXT NOT NULL,
      auto_renewal_cycle INTEGER NOT NULL DEFAULT 0,
      due_date TEXT NOT NULL,
      paid_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payment_gateway_events (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      subscription_id TEXT REFERENCES saas_subscriptions(id) ON DELETE SET NULL,
      provider TEXT NOT NULL DEFAULT 'RSPlay Pay / Stripe',
      event_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'processed',
      payload_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS productions (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      show_id TEXT NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      season_number INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'in_production',
      target_episodes_count INTEGER NOT NULL DEFAULT 10,
      executive_producer TEXT NOT NULL DEFAULT '',
      start_date TEXT,
      end_date TEXT,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS participants (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT '',
      company TEXT NOT NULL DEFAULT '',
      bio TEXT NOT NULL DEFAULT '',
      contacts TEXT NOT NULL DEFAULT '',
      links_json TEXT NOT NULL DEFAULT '[]',
      notes TEXT NOT NULL DEFAULT '',
      previous_episodes_json TEXT NOT NULL DEFAULT '[]',
      previous_research_summary TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS episodes (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      show_id TEXT NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
      production_id TEXT REFERENCES productions(id) ON DELETE SET NULL,
      episode_number INTEGER NOT NULL DEFAULT 1,
      title TEXT NOT NULL,
      idea TEXT NOT NULL DEFAULT '',
      guest_name TEXT NOT NULL DEFAULT '',
      guest_id TEXT REFERENCES participants(id) ON DELETE SET NULL,
      host TEXT NOT NULL DEFAULT '',
      format TEXT NOT NULL DEFAULT 'Entrevista',
      target_duration_min INTEGER NOT NULL DEFAULT 45,
      objective TEXT NOT NULL DEFAULT '',
      additional_info TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft',
      diagnosis_json TEXT NOT NULL DEFAULT '{}',
      research_json TEXT NOT NULL DEFAULT '{}',
      outline_json TEXT NOT NULL DEFAULT '[]',
      questions_json TEXT NOT NULL DEFAULT '[]',
      script_json TEXT NOT NULL DEFAULT '[]',
      cameras_json TEXT NOT NULL DEFAULT '[]',
      assets_json TEXT NOT NULL DEFAULT '[]',
      shorts_json TEXT NOT NULL DEFAULT '[]',
      recording_markers_json TEXT NOT NULL DEFAULT '[]',
      technical_checklist_json TEXT NOT NULL DEFAULT '{}',
      editor_script_synthesis TEXT NOT NULL DEFAULT '',
      recording_time_elapsed INTEGER NOT NULL DEFAULT 0,
      created_by TEXT,
      updated_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS episode_participants (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      episode_id TEXT NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
      participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
      role_in_episode TEXT NOT NULL DEFAULT 'main_guest',
      confirmation_status TEXT NOT NULL DEFAULT 'confirmed',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      UNIQUE(episode_id, participant_id)
    );

    CREATE TABLE IF NOT EXISTS script_versions (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      episode_id TEXT NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
      version_number INTEGER NOT NULL DEFAULT 1,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      snapshot_json TEXT NOT NULL DEFAULT '{}',
      created_by TEXT,
      saved_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS schedule_events (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      show_id TEXT NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
      production_id TEXT REFERENCES productions(id) ON DELETE SET NULL,
      episode_id TEXT REFERENCES episodes(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'recording',
      status TEXT NOT NULL DEFAULT 'scheduled',
      scheduled_start TEXT NOT NULL,
      scheduled_end TEXT NOT NULL,
      studio_location TEXT NOT NULL DEFAULT '',
      assigned_team_json TEXT NOT NULL DEFAULT '[]',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS library_assets (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      show_id TEXT REFERENCES shows(id) ON DELETE SET NULL,
      episode_id TEXT REFERENCES episodes(id) ON DELETE SET NULL,
      type TEXT NOT NULL DEFAULT 'documento',
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      moment TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pendente',
      file_url TEXT,
      tags_json TEXT NOT NULL DEFAULT '[]',
      reusable INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      user_id TEXT,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      action TEXT NOT NULL,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );
  `);

  // Ensure existing databases have new columns on users
  tryAddColumn(db, 'users', `job_title TEXT NOT NULL DEFAULT ''`);
  tryAddColumn(db, 'users', `status TEXT NOT NULL DEFAULT 'active'`);
  tryAddColumn(db, 'users', `login_code TEXT NOT NULL DEFAULT 'rsplay123'`);
  tryAddColumn(db, 'users', `last_login_at TEXT`);

  const now = new Date().toISOString();
  const insertMig = db.prepare(
    `INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (?, ?)`
  );
  insertMig.run('0001_v2_core_schema.sql', now);
  insertMig.run('0002_v2_operations_and_rls.sql', now);
  insertMig.run('0003_rsplay_saas_rbac_and_billing.sql', now);

  const orgCountRow = db.prepare(`SELECT COUNT(*) as cnt FROM organizations`).get() as {
    cnt: number;
  };
  if (orgCountRow.cnt === 0) {
    seedInitialDatabase(db);
  } else {
    ensureRSPlaySaaSSeeds(db);
  }
}

function ensureRSPlaySaaSSeeds(db: DatabaseSync) {
  const now = new Date().toISOString();

  // Upsert seed organizations branding
  for (const org of SEED_ORGANIZATIONS) {
    db.prepare(
      `INSERT OR IGNORE INTO organizations (id, name, slug, plan, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(org.id, org.name, org.slug, org.plan, org.createdAt, org.updatedAt);
  }

  // Upsert seed users (including Clara Vasconcelos for Anatomia Criativa)
  for (const usr of SEED_USERS) {
    db.prepare(
      `INSERT OR IGNORE INTO users (id, email, name, job_title, status, login_code, avatar_url, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      usr.id,
      usr.email,
      usr.name,
      usr.jobTitle || '',
      usr.status || 'active',
      usr.loginCode || 'rsplay123',
      usr.avatarUrl || null,
      usr.createdAt,
      usr.updatedAt
    );

    db.prepare(
      `UPDATE users SET name = ?, job_title = ?, login_code = ? WHERE id = ? AND (job_title = '' OR job_title IS NULL)`
    ).run(usr.name, usr.jobTitle || '', usr.loginCode || 'rsplay123', usr.id);
  }

  // Upsert memberships
  for (const mem of SEED_MEMBERSHIPS) {
    db.prepare(
      `INSERT OR IGNORE INTO organization_members (id, organization_id, user_id, role, created_at)
       VALUES (?, ?, ?, ?, ?)`
    ).run(mem.id, mem.organizationId, mem.userId, mem.role, now);
  }

  // Ensure initial program permissions exist if table is empty
  const permCount = (
    db.prepare(`SELECT COUNT(*) as c FROM user_show_permissions`).get() as { c: number }
  ).c;
  if (permCount === 0) {
    for (const perm of SEED_USER_SHOW_PERMISSIONS) {
      const showExists = db
        .prepare(`SELECT id FROM shows WHERE id = ? AND organization_id = ?`)
        .get(perm.showId, perm.organizationId);
      if (showExists) {
        db.prepare(
          `INSERT OR IGNORE INTO user_show_permissions (
            id, organization_id, user_id, show_id, can_view, can_edit_editorial,
            can_edit_script, can_operate_studio, can_manage_schedule, can_manage_assets,
            can_export, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          perm.id,
          perm.organizationId,
          perm.userId,
          perm.showId,
          perm.canView ? 1 : 0,
          perm.canEditEditorial ? 1 : 0,
          perm.canEditScript ? 1 : 0,
          perm.canOperateStudio ? 1 : 0,
          perm.canManageSchedule ? 1 : 0,
          perm.canManageAssets ? 1 : 0,
          perm.canExport ? 1 : 0,
          now,
          now
        );
      }
    }
  }

  // Ensure subscriptions exist if table is empty
  const subCount = (
    db.prepare(`SELECT COUNT(*) as c FROM saas_subscriptions`).get() as { c: number }
  ).c;
  if (subCount === 0) {
    for (const org of SEED_ORGANIZATIONS) {
      seedOrganizationBilling(db, org.id);
    }
  }

  // Ensure ep-201 for show-2 exists in org-takemaster-studio
  const ep201Exists = db.prepare(`SELECT id FROM episodes WHERE id = 'ep-201'`).get();
  if (!ep201Exists) {
    const ws = buildSeedWorkspaceForOrg('org-takemaster-studio');
    const ep201 = ws.episodes.find((e) => e.id === 'ep-201');
    if (ep201) {
      insertEpisodeRecord(db, 'org-takemaster-studio', ep201);
    }
  }

  // Ensure RS Play Knowledge Base validation programs exist in org-takemaster-studio
  const wsMain = buildSeedWorkspaceForOrg('org-takemaster-studio');
  for (const kbShowId of [
    'show-advogada-do-leque',
    'show-as-pessoas-inspiram',
    'show-bem-viver',
  ]) {
    const exists = db.prepare(`SELECT id FROM shows WHERE id = ?`).get(kbShowId);
    if (!exists) {
      const targetShow = wsMain.shows.find((s) => s.id === kbShowId);
      if (targetShow) {
        insertShowRecord(db, 'org-takemaster-studio', targetShow);
      }
    }
  }
}

function seedOrganizationBilling(db: DatabaseSync, organizationId: string) {
  const billing = buildSeedSubscriptionsForOrg(organizationId);
  db.prepare(`DELETE FROM payment_gateway_events WHERE organization_id = ?`).run(organizationId);
  db.prepare(`DELETE FROM billing_invoices WHERE organization_id = ?`).run(organizationId);
  db.prepare(`DELETE FROM saas_subscriptions WHERE organization_id = ?`).run(organizationId);

  for (const sub of billing.subscriptions) {
    const showExists = sub.showId
      ? db.prepare(`SELECT id FROM shows WHERE id = ?`).get(sub.showId)
      : null;
    db.prepare(
      `INSERT OR REPLACE INTO saas_subscriptions (
        id, organization_id, show_id, plan_id, plan_name, billing_cycle,
        amount_cents, currency, status, auto_renew, payment_gateway,
        payment_method_type, payment_method_last4, payment_method_brand,
        gateway_customer_id, gateway_subscription_id, current_period_start,
        current_period_end, last_renewal_at, canceled_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      sub.id,
      organizationId,
      showExists ? sub.showId : null,
      sub.planId,
      sub.planName,
      sub.billingCycle,
      sub.amountCents,
      sub.currency,
      sub.status,
      sub.autoRenew ? 1 : 0,
      sub.paymentGateway,
      sub.paymentMethodType,
      sub.paymentMethodLast4,
      sub.paymentMethodBrand,
      sub.gatewayCustomerId,
      sub.gatewaySubscriptionId,
      sub.currentPeriodStart,
      sub.currentPeriodEnd,
      sub.lastRenewalAt || null,
      sub.canceledAt || null,
      sub.createdAt,
      sub.updatedAt
    );
  }

  for (const inv of billing.invoices) {
    db.prepare(
      `INSERT OR REPLACE INTO billing_invoices (
        id, organization_id, subscription_id, invoice_number, description,
        amount_cents, currency, status, payment_method, gateway_transaction_id,
        auto_renewal_cycle, due_date, paid_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      inv.id,
      organizationId,
      inv.subscriptionId,
      inv.invoiceNumber,
      inv.description,
      inv.amountCents,
      inv.currency,
      inv.status,
      inv.paymentMethod,
      inv.gatewayTransactionId,
      inv.autoRenewalCycle ? 1 : 0,
      inv.dueDate,
      inv.paidAt || null,
      inv.createdAt
    );
  }

  for (const gev of billing.gatewayEvents) {
    db.prepare(
      `INSERT OR REPLACE INTO payment_gateway_events (
        id, organization_id, subscription_id, provider, event_type,
        status, payload_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      gev.id,
      organizationId,
      gev.subscriptionId || null,
      gev.provider,
      gev.eventType,
      gev.status,
      JSON.stringify(gev.payload || {}),
      gev.createdAt
    );
  }
}

function seedInitialDatabase(db: DatabaseSync) {
  const now = new Date().toISOString();

  const insertOrg = db.prepare(`
    INSERT OR IGNORE INTO organizations (id, name, slug, plan, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  for (const org of SEED_ORGANIZATIONS) {
    insertOrg.run(org.id, org.name, org.slug, org.plan, org.createdAt, org.updatedAt);
  }

  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (id, email, name, job_title, status, login_code, avatar_url, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const usr of SEED_USERS) {
    insertUser.run(
      usr.id,
      usr.email,
      usr.name,
      usr.jobTitle || '',
      usr.status || 'active',
      usr.loginCode || 'rsplay123',
      usr.avatarUrl || null,
      usr.createdAt,
      usr.updatedAt
    );
  }

  const insertMem = db.prepare(`
    INSERT OR IGNORE INTO organization_members (id, organization_id, user_id, role, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  for (const mem of SEED_MEMBERSHIPS) {
    insertMem.run(mem.id, mem.organizationId, mem.userId, mem.role, now);
  }

  for (const org of SEED_ORGANIZATIONS) {
    populateOrganizationWorkspace(db, org.id);
  }
}

export function populateOrganizationWorkspace(db: DatabaseSync, organizationId: string) {
  const workspace = buildSeedWorkspaceForOrg(organizationId);
  const now = new Date().toISOString();

  // Clear existing data for this organization only
  db.prepare(`DELETE FROM user_show_permissions WHERE organization_id = ?`).run(organizationId);
  db.prepare(`DELETE FROM schedule_events WHERE organization_id = ?`).run(organizationId);
  db.prepare(`DELETE FROM library_assets WHERE organization_id = ?`).run(organizationId);
  db.prepare(`DELETE FROM script_versions WHERE organization_id = ?`).run(organizationId);
  db.prepare(`DELETE FROM episode_participants WHERE organization_id = ?`).run(organizationId);
  db.prepare(`DELETE FROM episodes WHERE organization_id = ?`).run(organizationId);
  db.prepare(`DELETE FROM productions WHERE organization_id = ?`).run(organizationId);
  db.prepare(`DELETE FROM participants WHERE organization_id = ?`).run(organizationId);
  db.prepare(`DELETE FROM shows WHERE organization_id = ?`).run(organizationId);

  for (const show of workspace.shows) {
    insertShowRecord(db, organizationId, show);
  }
  for (const prod of workspace.productions) {
    insertProductionRecord(db, organizationId, prod);
  }
  for (const guest of workspace.guests) {
    insertParticipantRecord(db, organizationId, guest);
  }
  for (const ep of workspace.episodes) {
    insertEpisodeRecord(db, organizationId, ep);
  }
  for (const sched of workspace.scheduleEvents) {
    insertScheduleEventRecord(db, organizationId, sched);
  }
  for (const asset of workspace.libraryAssets) {
    insertLibraryAssetRecord(db, organizationId, asset);
  }

  // Restore default program permissions for this organization
  for (const perm of SEED_USER_SHOW_PERMISSIONS.filter(
    (p) => p.organizationId === organizationId
  )) {
    db.prepare(
      `INSERT OR REPLACE INTO user_show_permissions (
        id, organization_id, user_id, show_id, can_view, can_edit_editorial,
        can_edit_script, can_operate_studio, can_manage_schedule, can_manage_assets,
        can_export, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      perm.id,
      perm.organizationId,
      perm.userId,
      perm.showId,
      perm.canView ? 1 : 0,
      perm.canEditEditorial ? 1 : 0,
      perm.canEditScript ? 1 : 0,
      perm.canOperateStudio ? 1 : 0,
      perm.canManageSchedule ? 1 : 0,
      perm.canManageAssets ? 1 : 0,
      perm.canExport ? 1 : 0,
      now,
      now
    );
  }

  // Restore billing & subscriptions for this organization
  seedOrganizationBilling(db, organizationId);
}

function safeJsonParse<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== 'string' || !raw.trim()) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function recordAuditLog(
  organizationId: string,
  userId: string | undefined,
  entityType: string,
  entityId: string,
  action: string,
  metadata: Record<string, any> = {}
) {
  const db = getDbConnection();
  const id = `aud-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO audit_logs (id, organization_id, user_id, entity_type, entity_id, action, metadata_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    organizationId,
    userId || null,
    entityType,
    entityId,
    action,
    JSON.stringify(metadata),
    now
  );
}

// --- MAPPERS FROM SQL ROWS TO CANONICAL CONTRACTS ---

function mapRowToShow(row: any): Show {
  return {
    id: row.id,
    organizationId: row.organization_id,
    title: row.title,
    description: row.description,
    host: row.host,
    format: row.format,
    defaultDurationMin: Number(row.default_duration_min),
    editorialStyle: row.editorial_style,
    scenario: row.scenario,
    cameras: safeJsonParse(row.cameras_json, []),
    standardStructure: safeJsonParse(row.standard_structure_json, []),
    defaultOpening: row.default_opening,
    defaultClosing: row.default_closing,
    catalogStatus: row.catalog_status || 'active',
    category: row.category || 'Geral',
    targetAudience: row.target_audience || '',
    distributionChannels: safeJsonParse(row.distribution_channels_json, []),
    createdBy: row.created_by || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowToProduction(row: any): Production {
  return {
    id: row.id,
    organizationId: row.organization_id,
    showId: row.show_id,
    title: row.title,
    seasonNumber: Number(row.season_number),
    status: row.status,
    targetEpisodesCount: Number(row.target_episodes_count),
    executiveProducer: row.executive_producer,
    startDate: row.start_date || undefined,
    endDate: row.end_date || undefined,
    notes: row.notes || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowToParticipant(row: any): Guest {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    role: row.role,
    company: row.company,
    bio: row.bio,
    contacts: row.contacts,
    links: safeJsonParse(row.links_json, []),
    notes: row.notes,
    previousEpisodes: safeJsonParse(row.previous_episodes_json, []),
    previousResearchSummary: row.previous_research_summary || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowToEpisode(db: DatabaseSync, row: any): Episode {
  const versionRows = db
    .prepare(
      `SELECT * FROM script_versions WHERE episode_id = ? AND organization_id = ? ORDER BY version_number ASC, saved_at ASC`
    )
    .all(row.id, row.organization_id) as any[];

  const versions: ScriptVersion[] = versionRows.map((v) => ({
    id: v.id,
    episodeId: v.episode_id,
    organizationId: v.organization_id,
    versionNumber: Number(v.version_number),
    name: v.name,
    description: v.description,
    savedAt: v.saved_at,
    snapshot: safeJsonParse(v.snapshot_json, {}),
  }));

  const epParticipantRows = db
    .prepare(
      `SELECT ep.*, p.name as participant_name, p.role as participant_role, p.company as participant_company
       FROM episode_participants ep
       JOIN participants p ON p.id = ep.participant_id
       WHERE ep.episode_id = ? AND ep.organization_id = ?`
    )
    .all(row.id, row.organization_id) as any[];

  const participants: EpisodeParticipant[] = epParticipantRows.map((ep) => ({
    id: ep.id,
    organizationId: ep.organization_id,
    episodeId: ep.episode_id,
    participantId: ep.participant_id,
    participantName: ep.participant_name,
    participantRole: ep.participant_role,
    participantCompany: ep.participant_company,
    roleInEpisode: ep.role_in_episode,
    confirmationStatus: ep.confirmation_status,
    notes: ep.notes || '',
    createdAt: ep.created_at,
  }));

  return {
    id: row.id,
    organizationId: row.organization_id,
    showId: row.show_id,
    productionId: row.production_id || undefined,
    episodeNumber: Number(row.episode_number),
    title: row.title,
    idea: row.idea,
    guestName: row.guest_name,
    guestId: row.guest_id || undefined,
    participants,
    host: row.host,
    format: row.format,
    targetDurationMin: Number(row.target_duration_min),
    objective: row.objective || '',
    additionalInfo: row.additional_info || '',
    status: row.status,
    diagnosis: safeJsonParse(row.diagnosis_json, {
      centralTheme: '',
      potentialStory: '',
      primaryConflict: '',
      primaryTransformation: '',
      whyWatch: '',
      whatToDiscover: '',
      researchPoints: [],
      highImpactMoments: [],
      approved: false,
    }),
    research: safeJsonParse(row.research_json, {
      aboutGuest: '',
      trajectory: '',
      company: '',
      keyDatesAndNumbers: '',
      previousInterviews: '',
      recurringThemes: '',
      contradictionsAndClarifications: '',
      compellingStories: '',
      sources: [],
    }),
    outline: safeJsonParse(row.outline_json, []),
    questions: safeJsonParse(row.questions_json, []),
    script: safeJsonParse(row.script_json, []),
    cameras: safeJsonParse(row.cameras_json, []),
    assets: safeJsonParse(row.assets_json, []),
    shorts: safeJsonParse(row.shorts_json, []),
    recordingMarkers: safeJsonParse(row.recording_markers_json, []),
    technicalChecklist: safeJsonParse(row.technical_checklist_json, {
      cam1Recording: false,
      cam2Recording: false,
      cam3Recording: false,
      micHost: false,
      micGuest: false,
      audioMonitored: false,
      lighting: false,
      memoryCardsStorage: false,
      batteries: false,
      syncClap: false,
      waterReady: false,
      silentPhones: false,
      customItems: [],
    }),
    versions,
    editorScriptSynthesis: row.editor_script_synthesis || '',
    recordingTimeElapsed: Number(row.recording_time_elapsed) || 0,
    createdBy: row.created_by || undefined,
    updatedBy: row.updated_by || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowToScheduleEvent(row: any): ScheduleEvent {
  return {
    id: row.id,
    organizationId: row.organization_id,
    showId: row.show_id,
    productionId: row.production_id || undefined,
    episodeId: row.episode_id || undefined,
    episodeTitle: row.episode_title || undefined,
    episodeNumber: row.episode_number ? Number(row.episode_number) : undefined,
    title: row.title,
    type: row.type,
    status: row.status,
    scheduledStart: row.scheduled_start,
    scheduledEnd: row.scheduled_end,
    studioLocation: row.studio_location,
    assignedTeam: safeJsonParse(row.assigned_team_json, []),
    notes: row.notes || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowToLibraryAsset(row: any): LibraryAsset {
  return {
    id: row.id,
    organizationId: row.organization_id,
    showId: row.show_id || undefined,
    episodeId: row.episode_id || undefined,
    episodeTitle: row.episode_title || undefined,
    type: row.type,
    title: row.title,
    description: row.description,
    moment: row.moment,
    status: row.status,
    fileUrl: row.file_url || undefined,
    tags: safeJsonParse(row.tags_json, []),
    reusable: Boolean(row.reusable),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowToUserShowPermission(row: any): UserShowPermission {
  return {
    id: row.id,
    organizationId: row.organization_id,
    userId: row.user_id,
    showId: row.show_id,
    showTitle: row.show_title || undefined,
    canView: Boolean(row.can_view),
    canEditEditorial: Boolean(row.can_edit_editorial),
    canEditScript: Boolean(row.can_edit_script),
    canOperateStudio: Boolean(row.can_operate_studio),
    canManageSchedule: Boolean(row.can_manage_schedule),
    canManageAssets: Boolean(row.can_manage_assets),
    canExport: Boolean(row.can_export),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowToSubscription(row: any): SaaSSubscription {
  return {
    id: row.id,
    organizationId: row.organization_id,
    showId: row.show_id || undefined,
    showTitle: row.show_title || undefined,
    planId: row.plan_id as SubscriptionPlanId,
    planName: row.plan_name,
    billingCycle: row.billing_cycle || 'monthly',
    amountCents: Number(row.amount_cents),
    currency: row.currency || 'BRL',
    status: row.status,
    autoRenew: Boolean(row.auto_renew),
    paymentGateway: row.payment_gateway,
    paymentMethodType: row.payment_method_type,
    paymentMethodLast4: row.payment_method_last4,
    paymentMethodBrand: row.payment_method_brand,
    gatewayCustomerId: row.gateway_customer_id,
    gatewaySubscriptionId: row.gateway_subscription_id,
    currentPeriodStart: row.current_period_start,
    currentPeriodEnd: row.current_period_end,
    lastRenewalAt: row.last_renewal_at || undefined,
    canceledAt: row.canceled_at || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// --- LOW-LEVEL INSERT HELPERS ---

function insertShowRecord(db: DatabaseSync, organizationId: string, show: Show) {
  db.prepare(
    `INSERT INTO shows (
      id, organization_id, title, description, host, format, default_duration_min,
      editorial_style, scenario, cameras_json, standard_structure_json,
      default_opening, default_closing, catalog_status, category, target_audience,
      distribution_channels_json, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    show.id,
    organizationId,
    show.title,
    show.description || '',
    show.host || '',
    show.format || 'Entrevista',
    show.defaultDurationMin || 45,
    show.editorialStyle || '',
    show.scenario || '',
    JSON.stringify(show.cameras || []),
    JSON.stringify(show.standardStructure || []),
    show.defaultOpening || '',
    show.defaultClosing || '',
    show.catalogStatus || 'active',
    show.category || 'Geral',
    show.targetAudience || '',
    JSON.stringify(show.distributionChannels || []),
    show.createdBy || null,
    show.createdAt,
    show.updatedAt
  );
}

function insertProductionRecord(db: DatabaseSync, organizationId: string, prod: Production) {
  db.prepare(
    `INSERT INTO productions (
      id, organization_id, show_id, title, season_number, status,
      target_episodes_count, executive_producer, start_date, end_date, notes,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    prod.id,
    organizationId,
    prod.showId,
    prod.title,
    prod.seasonNumber || 1,
    prod.status || 'in_production',
    prod.targetEpisodesCount || 10,
    prod.executiveProducer || '',
    prod.startDate || null,
    prod.endDate || null,
    prod.notes || '',
    prod.createdAt,
    prod.updatedAt
  );
}

function insertParticipantRecord(db: DatabaseSync, organizationId: string, guest: Guest) {
  const now = guest.updatedAt || guest.createdAt || new Date().toISOString();
  db.prepare(
    `INSERT INTO participants (
      id, organization_id, name, role, company, bio, contacts,
      links_json, notes, previous_episodes_json, previous_research_summary,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    guest.id,
    organizationId,
    guest.name,
    guest.role || '',
    guest.company || '',
    guest.bio || '',
    guest.contacts || '',
    JSON.stringify(guest.links || []),
    guest.notes || '',
    JSON.stringify(guest.previousEpisodes || []),
    guest.previousResearchSummary || '',
    guest.createdAt || now,
    now
  );
}

function insertEpisodeRecord(db: DatabaseSync, organizationId: string, ep: Episode) {
  db.prepare(
    `INSERT INTO episodes (
      id, organization_id, show_id, production_id, episode_number, title, idea,
      guest_name, guest_id, host, format, target_duration_min, objective,
      additional_info, status, diagnosis_json, research_json, outline_json,
      questions_json, script_json, cameras_json, assets_json, shorts_json,
      recording_markers_json, technical_checklist_json, editor_script_synthesis,
      recording_time_elapsed, created_by, updated_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    ep.id,
    organizationId,
    ep.showId,
    ep.productionId || null,
    ep.episodeNumber || 1,
    ep.title,
    ep.idea || '',
    ep.guestName || '',
    ep.guestId || null,
    ep.host || '',
    ep.format || 'Entrevista',
    ep.targetDurationMin || 45,
    ep.objective || '',
    ep.additionalInfo || '',
    ep.status || 'draft',
    JSON.stringify(ep.diagnosis || {}),
    JSON.stringify(ep.research || {}),
    JSON.stringify(ep.outline || []),
    JSON.stringify(ep.questions || []),
    JSON.stringify(ep.script || []),
    JSON.stringify(ep.cameras || []),
    JSON.stringify(ep.assets || []),
    JSON.stringify(ep.shorts || []),
    JSON.stringify(ep.recordingMarkers || []),
    JSON.stringify(ep.technicalChecklist || {}),
    ep.editorScriptSynthesis || '',
    ep.recordingTimeElapsed || 0,
    ep.createdBy || null,
    ep.updatedBy || null,
    ep.createdAt,
    ep.updatedAt
  );

  // Sync guestId into episode_participants relational link
  if (ep.guestId) {
    db.prepare(
      `INSERT OR IGNORE INTO episode_participants (
        id, organization_id, episode_id, participant_id, role_in_episode, confirmation_status, notes, created_at
      ) VALUES (?, ?, ?, ?, 'main_guest', 'confirmed', '', ?)`
    ).run(`epp-${ep.id}-${ep.guestId}`, organizationId, ep.id, ep.guestId, ep.createdAt);
  }

  // Sync script_versions table
  if (Array.isArray(ep.versions)) {
    for (let i = 0; i < ep.versions.length; i++) {
      const v = ep.versions[i];
      db.prepare(
        `INSERT OR REPLACE INTO script_versions (
          id, organization_id, episode_id, version_number, name, description, snapshot_json, saved_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        v.id || `ver-${ep.id}-${i + 1}`,
        organizationId,
        ep.id,
        v.versionNumber || i + 1,
        v.name || `Versão ${i + 1}`,
        v.description || '',
        JSON.stringify(v.snapshot || {}),
        v.savedAt || ep.updatedAt
      );
    }
  }
}

function insertScheduleEventRecord(db: DatabaseSync, organizationId: string, ev: ScheduleEvent) {
  db.prepare(
    `INSERT INTO schedule_events (
      id, organization_id, show_id, production_id, episode_id, title,
      type, status, scheduled_start, scheduled_end, studio_location,
      assigned_team_json, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    ev.id,
    organizationId,
    ev.showId,
    ev.productionId || null,
    ev.episodeId || null,
    ev.title,
    ev.type || 'recording',
    ev.status || 'scheduled',
    ev.scheduledStart,
    ev.scheduledEnd,
    ev.studioLocation || '',
    JSON.stringify(ev.assignedTeam || []),
    ev.notes || '',
    ev.createdAt,
    ev.updatedAt
  );
}

function insertLibraryAssetRecord(db: DatabaseSync, organizationId: string, asset: LibraryAsset) {
  db.prepare(
    `INSERT INTO library_assets (
      id, organization_id, show_id, episode_id, type, title,
      description, moment, status, file_url, tags_json, reusable,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    asset.id,
    organizationId,
    asset.showId || null,
    asset.episodeId || null,
    asset.type || 'documento',
    asset.title,
    asset.description || '',
    asset.moment || '',
    asset.status || 'pendente',
    asset.fileUrl || null,
    JSON.stringify(asset.tags || []),
    asset.reusable === false ? 0 : 1,
    asset.createdAt,
    asset.updatedAt
  );
}

// --- PUBLIC REPOSITORY API (WITH STRICT CONTEXT & PROGRAM-LEVEL RBAC ISOLATION) ---

export function listUsersAndOrganizations() {
  const db = getDbConnection();
  const users = db.prepare(`SELECT * FROM users ORDER BY created_at ASC`).all() as any[];
  const orgs = db.prepare(`SELECT * FROM organizations ORDER BY created_at ASC`).all() as any[];
  const memberships = db.prepare(`SELECT * FROM organization_members`).all() as any[];

  return {
    users: users.map(
      (u): User => ({
        id: u.id,
        email: u.email,
        name: u.name,
        jobTitle: u.job_title || '',
        status: (u.status as UserAccountStatus) || 'active',
        loginCode: u.login_code || 'rsplay123',
        avatarUrl: u.avatar_url || undefined,
        lastLoginAt: u.last_login_at || undefined,
        createdAt: u.created_at,
        updatedAt: u.updated_at,
      })
    ),
    organizations: orgs.map(
      (o): Organization => ({
        id: o.id,
        name: o.name,
        slug: o.slug,
        plan: o.plan,
        createdAt: o.created_at,
        updatedAt: o.updated_at,
      })
    ),
    memberships,
  };
}

export function getUserMemberships(userId: string): OrganizationMembership[] {
  const db = getDbConnection();
  const rows = db
    .prepare(
      `SELECT m.organization_id, m.role, o.name as org_name, o.slug as org_slug
       FROM organization_members m
       JOIN organizations o ON o.id = m.organization_id
       WHERE m.user_id = ?
       ORDER BY o.created_at ASC`
    )
    .all(userId) as any[];

  return rows.map((r) => ({
    organizationId: r.organization_id,
    organizationName: r.org_name,
    organizationSlug: r.org_slug,
    role: r.role as OrganizationRole,
  }));
}

export function getOrganizationById(organizationId: string): Organization | null {
  const db = getDbConnection();
  const row = db
    .prepare(`SELECT * FROM organizations WHERE id = ?`)
    .get(organizationId) as any;
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    plan: row.plan,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function verifyUserOrganizationAccess(
  userId: string,
  organizationId: string
): { organization: Organization; role: OrganizationRole } {
  const db = getDbConnection();
  const row = db
    .prepare(
      `SELECT m.role, o.*
       FROM organization_members m
       JOIN organizations o ON o.id = m.organization_id
       WHERE m.user_id = ? AND m.organization_id = ?`
    )
    .get(userId, organizationId) as any;

  if (!row) {
    throw new AppError(
      403,
      'FORBIDDEN_CONTEXT',
      `Usuário não possui acesso autorizado à organização (${organizationId}).`
    );
  }

  return {
    organization: {
      id: row.id,
      name: row.name,
      slug: row.slug,
      plan: row.plan,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
    role: row.role as OrganizationRole,
  };
}

// --- GRANULAR PROGRAM-LEVEL RBAC PERMISSIONS ---

export function getUserShowPermissions(
  organizationId: string,
  userId: string
): UserShowPermission[] {
  const db = getDbConnection();
  const rows = db
    .prepare(
      `SELECT usp.*, s.title as show_title
       FROM user_show_permissions usp
       JOIN shows s ON s.id = usp.show_id
       WHERE usp.organization_id = ? AND usp.user_id = ?
       ORDER BY s.created_at ASC`
    )
    .all(organizationId, userId) as any[];

  return rows.map(mapRowToUserShowPermission);
}

export function getEffectiveAllowedShowIds(
  organizationId: string,
  userId: string,
  role: OrganizationRole
): { isFullAccessAdmin: boolean; allowedShowIds: string[]; permissions: UserShowPermission[] } {
  const db = getDbConnection();
  const allShows = db
    .prepare(`SELECT id, title FROM shows WHERE organization_id = ? ORDER BY created_at ASC`)
    .all(organizationId) as { id: string; title: string }[];

  const permissions = getUserShowPermissions(organizationId, userId);

  if (role === 'owner' || role === 'admin') {
    const now = new Date().toISOString();
    const adminPerms: UserShowPermission[] = allShows.map((s) => ({
      id: `admin-${userId}-${s.id}`,
      organizationId,
      userId,
      showId: s.id,
      showTitle: s.title,
      canView: true,
      canEditEditorial: true,
      canEditScript: true,
      canOperateStudio: true,
      canManageSchedule: true,
      canManageAssets: true,
      canExport: true,
      createdAt: now,
      updatedAt: now,
    }));
    return {
      isFullAccessAdmin: true,
      allowedShowIds: allShows.map((s) => s.id),
      permissions: adminPerms,
    };
  }

  const viewableIds = permissions.filter((p) => p.canView).map((p) => p.showId);
  return {
    isFullAccessAdmin: false,
    allowedShowIds: viewableIds,
    permissions,
  };
}

export function assertUserCanAccessShow(
  organizationId: string,
  userId: string,
  role: OrganizationRole,
  showId: string,
  requiredCapability:
    | 'canView'
    | 'canEditEditorial'
    | 'canEditScript'
    | 'canOperateStudio'
    | 'canManageSchedule'
    | 'canManageAssets'
    | 'canExport' = 'canView'
) {
  if (role === 'owner' || role === 'admin') return;
  const perms = getUserShowPermissions(organizationId, userId);
  const showPerm = perms.find((p) => p.showId === showId);
  if (!showPerm || !showPerm.canView || !showPerm[requiredCapability]) {
    throw new AppError(
      403,
      'FORBIDDEN_CONTEXT',
      `Acesso restrito: seu login de programa não possui permissão (${requiredCapability}) para este programa na grade RSPlay TV.`
    );
  }
}

export function listOrganizationUsersWithPermissions(organizationId: string): User[] {
  const db = getDbConnection();
  const rows = db
    .prepare(
      `SELECT u.*, m.role as org_role
       FROM organization_members m
       JOIN users u ON u.id = m.user_id
       WHERE m.organization_id = ?
       ORDER BY u.created_at ASC`
    )
    .all(organizationId) as any[];

  return rows.map((u) => {
    const role = (u.org_role as OrganizationRole) || 'producer';
    const { permissions } = getEffectiveAllowedShowIds(organizationId, u.id, role);
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      jobTitle: u.job_title || '',
      status: (u.status as UserAccountStatus) || 'active',
      loginCode: u.login_code || 'rsplay123',
      avatarUrl: u.avatar_url || undefined,
      role,
      showPermissions: permissions,
      lastLoginAt: u.last_login_at || undefined,
      createdAt: u.created_at,
      updatedAt: u.updated_at,
    };
  });
}

export function createOrganizationUserWithShowPermissions(
  organizationId: string,
  payload: {
    name: string;
    email: string;
    jobTitle?: string;
    loginCode?: string;
    role?: OrganizationRole;
    showPermissions?: Partial<UserShowPermission>[];
  },
  actorUserId?: string
): User {
  const db = getDbConnection();
  const now = new Date().toISOString();
  const cleanEmail = (payload.email || '').trim().toLowerCase();
  if (!cleanEmail || !payload.name?.trim()) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Nome e e-mail corporativo são obrigatórios para criar um login de programa.'
    );
  }

  let userRow = db
    .prepare(`SELECT * FROM users WHERE lower(email) = ?`)
    .get(cleanEmail) as any;

  const userId = userRow?.id || `usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const role: OrganizationRole = payload.role || 'producer';

  if (!userRow) {
    db.prepare(
      `INSERT INTO users (id, email, name, job_title, status, login_code, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'active', ?, ?, ?)`
    ).run(
      userId,
      cleanEmail,
      payload.name.trim(),
      payload.jobTitle?.trim() || 'Equipe do Programa',
      payload.loginCode?.trim() || 'rsplay123',
      now,
      now
    );
  } else {
    db.prepare(
      `UPDATE users SET name = ?, job_title = ?, login_code = ?, status = 'active', updated_at = ? WHERE id = ?`
    ).run(
      payload.name.trim(),
      payload.jobTitle?.trim() || userRow.job_title || '',
      payload.loginCode?.trim() || userRow.login_code || 'rsplay123',
      now,
      userId
    );
  }

  db.prepare(
    `INSERT OR REPLACE INTO organization_members (id, organization_id, user_id, role, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(`mem-${organizationId}-${userId}`, organizationId, userId, role, now);

  if (Array.isArray(payload.showPermissions)) {
    updateUserShowPermissions(organizationId, userId, payload.showPermissions, actorUserId);
  }

  recordAuditLog(organizationId, actorUserId, 'user_account', userId, 'created_program_login', {
    email: cleanEmail,
    role,
    showsCount: payload.showPermissions?.length || 0,
  });

  const allUsers = listOrganizationUsersWithPermissions(organizationId);
  return allUsers.find((u) => u.id === userId)!;
}

export function updateUserShowPermissions(
  organizationId: string,
  targetUserId: string,
  permissions: Partial<UserShowPermission>[],
  actorUserId?: string
): User {
  const db = getDbConnection();
  const now = new Date().toISOString();

  db.prepare(
    `DELETE FROM user_show_permissions WHERE organization_id = ? AND user_id = ?`
  ).run(organizationId, targetUserId);

  for (const perm of permissions) {
    if (!perm.showId || !perm.canView) continue;
    // Verify show belongs to organization
    getShowById(organizationId, perm.showId);
    db.prepare(
      `INSERT OR REPLACE INTO user_show_permissions (
        id, organization_id, user_id, show_id, can_view, can_edit_editorial,
        can_edit_script, can_operate_studio, can_manage_schedule, can_manage_assets,
        can_export, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      perm.id || `perm-${targetUserId}-${perm.showId}`,
      organizationId,
      targetUserId,
      perm.showId,
      perm.canView ? 1 : 0,
      perm.canEditEditorial !== false ? 1 : 0,
      perm.canEditScript !== false ? 1 : 0,
      perm.canOperateStudio !== false ? 1 : 0,
      perm.canManageSchedule !== false ? 1 : 0,
      perm.canManageAssets !== false ? 1 : 0,
      perm.canExport !== false ? 1 : 0,
      now,
      now
    );
  }

  recordAuditLog(
    organizationId,
    actorUserId,
    'user_show_permissions',
    targetUserId,
    'updated_permissions',
    {
      allowedShows: permissions.filter((p) => p.canView).map((p) => p.showId),
    }
  );

  const allUsers = listOrganizationUsersWithPermissions(organizationId);
  const found = allUsers.find((u) => u.id === targetUserId);
  if (!found) {
    throw new AppError(404, 'NOT_FOUND', 'Usuário não encontrado na organização.');
  }
  return found;
}

export function updateOrganizationUserStatusOrRole(
  organizationId: string,
  targetUserId: string,
  updates: {
    role?: OrganizationRole;
    status?: UserAccountStatus;
    jobTitle?: string;
    loginCode?: string;
  },
  actorUserId?: string
): User {
  const db = getDbConnection();
  const now = new Date().toISOString();

  if (updates.role) {
    db.prepare(
      `UPDATE organization_members SET role = ? WHERE organization_id = ? AND user_id = ?`
    ).run(updates.role, organizationId, targetUserId);
  }

  const currentUser = db.prepare(`SELECT * FROM users WHERE id = ?`).get(targetUserId) as any;
  if (!currentUser) {
    throw new AppError(404, 'NOT_FOUND', 'Usuário não encontrado.');
  }

  db.prepare(
    `UPDATE users SET status = ?, job_title = ?, login_code = ?, updated_at = ? WHERE id = ?`
  ).run(
    updates.status || currentUser.status || 'active',
    updates.jobTitle !== undefined ? updates.jobTitle : currentUser.job_title || '',
    updates.loginCode || currentUser.login_code || 'rsplay123',
    now,
    targetUserId
  );

  recordAuditLog(organizationId, actorUserId, 'user_account', targetUserId, 'updated_profile', {
    role: updates.role,
    status: updates.status,
  });

  const allUsers = listOrganizationUsersWithPermissions(organizationId);
  return allUsers.find((u) => u.id === targetUserId)!;
}

// --- SAAS SUBSCRIPTIONS, BILLING & PAYMENT GATEWAY ---

export function listSaaSPlans(): SaaSPlanDefinition[] {
  return RSPLAY_SAAS_PLANS;
}

export function listOrganizationSubscriptions(organizationId: string): SaaSSubscription[] {
  const db = getDbConnection();
  const rows = db
    .prepare(
      `SELECT sub.*, s.title as show_title
       FROM saas_subscriptions sub
       LEFT JOIN shows s ON s.id = sub.show_id
       WHERE sub.organization_id = ?
       ORDER BY sub.created_at DESC`
    )
    .all(organizationId) as any[];

  return rows.map(mapRowToSubscription);
}

export function listBillingInvoices(organizationId: string): BillingInvoice[] {
  const db = getDbConnection();
  const rows = db
    .prepare(
      `SELECT * FROM billing_invoices WHERE organization_id = ? ORDER BY created_at DESC`
    )
    .all(organizationId) as any[];

  return rows.map((r) => ({
    id: r.id,
    organizationId: r.organization_id,
    subscriptionId: r.subscription_id,
    invoiceNumber: r.invoice_number,
    description: r.description,
    amountCents: Number(r.amount_cents),
    currency: r.currency || 'BRL',
    status: r.status,
    paymentMethod: r.payment_method,
    gatewayTransactionId: r.gateway_transaction_id,
    autoRenewalCycle: Boolean(r.auto_renewal_cycle),
    dueDate: r.due_date,
    paidAt: r.paid_at || undefined,
    createdAt: r.created_at,
  }));
}

export function listPaymentGatewayEvents(organizationId: string): PaymentGatewayEvent[] {
  const db = getDbConnection();
  const rows = db
    .prepare(
      `SELECT * FROM payment_gateway_events WHERE organization_id = ? ORDER BY created_at DESC LIMIT 40`
    )
    .all(organizationId) as any[];

  return rows.map((r) => ({
    id: r.id,
    organizationId: r.organization_id,
    subscriptionId: r.subscription_id || undefined,
    provider: r.provider,
    eventType: r.event_type,
    status: r.status,
    payload: safeJsonParse(r.payload_json, {}),
    createdAt: r.created_at,
  }));
}

export function subscribeOrUpdatePlan(
  organizationId: string,
  payload: {
    planId: SubscriptionPlanId;
    showId?: string;
    paymentMethodType?: PaymentMethodType;
    paymentMethodLast4?: string;
    paymentMethodBrand?: string;
    autoRenew?: boolean;
  },
  actorUserId?: string
): {
  subscription: SaaSSubscription;
  invoice: BillingInvoice;
  gatewayEvent: PaymentGatewayEvent;
} {
  const db = getDbConnection();
  const plan =
    RSPLAY_SAAS_PLANS.find((p) => p.id === payload.planId) || RSPLAY_SAAS_PLANS[1];
  const now = new Date();
  const nowIso = now.toISOString();
  const periodEndIso = new Date(now.getTime() + 30 * 24 * 3600 * 1000).toISOString();

  if (payload.showId) {
    getShowById(organizationId, payload.showId);
  }

  const existingSubs = listOrganizationSubscriptions(organizationId);
  const targetSub =
    existingSubs.find((s) => (payload.showId ? s.showId === payload.showId : !s.showId)) ||
    existingSubs[0];

  const subId = targetSub?.id || `sub-${Date.now()}`;
  const methodType: PaymentMethodType = payload.paymentMethodType || 'credit_card';
  const last4 =
    payload.paymentMethodLast4 ||
    (methodType === 'pix_automatico' ? 'PIX' : methodType === 'boleto_corporativo' ? 'BOL' : '4829');
  const brand =
    payload.paymentMethodBrand ||
    (methodType === 'pix_automatico'
      ? 'PIX Automático Banco Central'
      : methodType === 'boleto_corporativo'
      ? 'Boleto Registrado'
      : 'Mastercard Corporativo');
  const autoRenew = payload.autoRenew !== false;

  db.prepare(
    `INSERT OR REPLACE INTO saas_subscriptions (
      id, organization_id, show_id, plan_id, plan_name, billing_cycle,
      amount_cents, currency, status, auto_renew, payment_gateway,
      payment_method_type, payment_method_last4, payment_method_brand,
      gateway_customer_id, gateway_subscription_id, current_period_start,
      current_period_end, last_renewal_at, canceled_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 'monthly', ?, 'BRL', 'active', ?, 'RSPlay Pay / Stripe', ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`
  ).run(
    subId,
    organizationId,
    payload.showId || null,
    plan.id,
    plan.name,
    plan.monthlyPriceCents,
    autoRenew ? 1 : 0,
    methodType,
    last4,
    brand,
    targetSub?.gatewayCustomerId || `cus_rsplay_${organizationId.slice(-6)}`,
    targetSub?.gatewaySubscriptionId || `sub_gw_${Date.now().toString().slice(-6)}`,
    nowIso,
    periodEndIso,
    nowIso,
    targetSub?.createdAt || nowIso,
    nowIso
  );

  // Update organization active plan tier
  db.prepare(`UPDATE organizations SET plan = ?, updated_at = ? WHERE id = ?`).run(
    plan.id,
    nowIso,
    organizationId
  );

  const invNumber = `RSP-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const invoice: BillingInvoice = {
    id: `inv-${Date.now()}`,
    organizationId,
    subscriptionId: subId,
    invoiceNumber: invNumber,
    description: `Assinatura Mensal — ${plan.name}`,
    amountCents: plan.monthlyPriceCents,
    currency: 'BRL',
    status: 'paid',
    paymentMethod: methodType,
    gatewayTransactionId: `tx_gw_${Math.random().toString(36).slice(2, 10)}`,
    autoRenewalCycle: false,
    dueDate: nowIso,
    paidAt: nowIso,
    createdAt: nowIso,
  };

  db.prepare(
    `INSERT INTO billing_invoices (
      id, organization_id, subscription_id, invoice_number, description,
      amount_cents, currency, status, payment_method, gateway_transaction_id,
      auto_renewal_cycle, due_date, paid_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`
  ).run(
    invoice.id,
    organizationId,
    subId,
    invoice.invoiceNumber,
    invoice.description,
    invoice.amountCents,
    invoice.currency,
    invoice.status,
    invoice.paymentMethod,
    invoice.gatewayTransactionId,
    invoice.dueDate,
    invoice.paidAt,
    invoice.createdAt
  );

  const gatewayEvent: PaymentGatewayEvent = {
    id: `gev-${Date.now()}`,
    organizationId,
    subscriptionId: subId,
    provider: 'RSPlay Pay / Stripe',
    eventType: 'customer.subscription.updated',
    status: 'processed',
    payload: {
      planId: plan.id,
      planName: plan.name,
      invoiceNumber: invNumber,
      autoRenew,
      paymentMethod: methodType,
    },
    createdAt: nowIso,
  };

  db.prepare(
    `INSERT INTO payment_gateway_events (
      id, organization_id, subscription_id, provider, event_type, status, payload_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    gatewayEvent.id,
    organizationId,
    subId,
    gatewayEvent.provider,
    gatewayEvent.eventType,
    gatewayEvent.status,
    JSON.stringify(gatewayEvent.payload),
    gatewayEvent.createdAt
  );

  recordAuditLog(organizationId, actorUserId, 'saas_subscription', subId, 'subscribed_plan', {
    planId: plan.id,
    amountCents: plan.monthlyPriceCents,
    autoRenew,
  });

  const updatedSub = listOrganizationSubscriptions(organizationId).find((s) => s.id === subId)!;
  return { subscription: updatedSub, invoice, gatewayEvent };
}

export function toggleSubscriptionAutoRenew(
  organizationId: string,
  subscriptionId: string,
  autoRenew: boolean,
  actorUserId?: string
): SaaSSubscription {
  const db = getDbConnection();
  const subs = listOrganizationSubscriptions(organizationId);
  const sub = subs.find((s) => s.id === subscriptionId);
  if (!sub) {
    throw new AppError(404, 'NOT_FOUND', 'Assinatura não encontrada para esta organização.');
  }

  const nowIso = new Date().toISOString();
  db.prepare(
    `UPDATE saas_subscriptions SET auto_renew = ?, updated_at = ? WHERE id = ? AND organization_id = ?`
  ).run(autoRenew ? 1 : 0, nowIso, subscriptionId, organizationId);

  db.prepare(
    `INSERT INTO payment_gateway_events (
      id, organization_id, subscription_id, provider, event_type, status, payload_json, created_at
    ) VALUES (?, ?, ?, 'RSPlay Pay / Stripe', ?, 'processed', ?, ?)`
  ).run(
    `gev-${Date.now()}`,
    organizationId,
    subscriptionId,
    autoRenew ? 'subscription.auto_renew_enabled' : 'subscription.auto_renew_disabled',
    JSON.stringify({ subscriptionId, autoRenew }),
    nowIso
  );

  recordAuditLog(
    organizationId,
    actorUserId,
    'saas_subscription',
    subscriptionId,
    autoRenew ? 'enabled_auto_renew' : 'disabled_auto_renew',
    { autoRenew }
  );

  return listOrganizationSubscriptions(organizationId).find((s) => s.id === subscriptionId)!;
}

export function processAutomaticRenewalCycle(
  organizationId: string,
  subscriptionId: string,
  simulateFailure = false,
  actorUserId?: string
): {
  subscription: SaaSSubscription;
  invoice: BillingInvoice;
  gatewayEvent: PaymentGatewayEvent;
} {
  const db = getDbConnection();
  const subs = listOrganizationSubscriptions(organizationId);
  const sub = subs.find((s) => s.id === subscriptionId);
  if (!sub) {
    throw new AppError(404, 'NOT_FOUND', 'Assinatura não encontrada.');
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const currentEnd = new Date(sub.currentPeriodEnd);
  const baseStart = isNaN(currentEnd.getTime()) ? now : currentEnd;
  const nextEnd = new Date(baseStart.getTime() + 30 * 24 * 3600 * 1000).toISOString();
  const newStatus = simulateFailure ? 'past_due' : 'active';

  db.prepare(
    `UPDATE saas_subscriptions
     SET status = ?, current_period_start = ?, current_period_end = ?, last_renewal_at = ?, updated_at = ?
     WHERE id = ? AND organization_id = ?`
  ).run(
    newStatus,
    simulateFailure ? sub.currentPeriodStart : nowIso,
    simulateFailure ? sub.currentPeriodEnd : nextEnd,
    nowIso,
    nowIso,
    subscriptionId,
    organizationId
  );

  const invNumber = `RSP-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const invoice: BillingInvoice = {
    id: `inv-${Date.now()}`,
    organizationId,
    subscriptionId,
    invoiceNumber: invNumber,
    description: simulateFailure
      ? `Tentativa de Renovação Automática (Falha no Cartão/Gateway) — ${sub.planName}`
      : `Renovação Automática Mensal — ${sub.planName}`,
    amountCents: sub.amountCents,
    currency: sub.currency,
    status: simulateFailure ? 'failed' : 'paid',
    paymentMethod: sub.paymentMethodType,
    gatewayTransactionId: `tx_auto_${Math.random().toString(36).slice(2, 10)}`,
    autoRenewalCycle: true,
    dueDate: nowIso,
    paidAt: simulateFailure ? undefined : nowIso,
    createdAt: nowIso,
  };

  db.prepare(
    `INSERT INTO billing_invoices (
      id, organization_id, subscription_id, invoice_number, description,
      amount_cents, currency, status, payment_method, gateway_transaction_id,
      auto_renewal_cycle, due_date, paid_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`
  ).run(
    invoice.id,
    organizationId,
    subscriptionId,
    invoice.invoiceNumber,
    invoice.description,
    invoice.amountCents,
    invoice.currency,
    invoice.status,
    invoice.paymentMethod,
    invoice.gatewayTransactionId,
    invoice.dueDate,
    invoice.paidAt || null,
    invoice.createdAt
  );

  const gatewayEvent: PaymentGatewayEvent = {
    id: `gev-${Date.now()}`,
    organizationId,
    subscriptionId,
    provider: sub.paymentGateway,
    eventType: simulateFailure
      ? 'invoice.auto_renewal_failed'
      : 'invoice.auto_renewal_succeeded',
    status: simulateFailure ? 'failed_retry_scheduled' : 'processed',
    payload: {
      invoiceNumber: invNumber,
      amountCents: sub.amountCents,
      paymentMethodLast4: sub.paymentMethodLast4,
      nextPeriodEnd: simulateFailure ? sub.currentPeriodEnd : nextEnd,
    },
    createdAt: nowIso,
  };

  db.prepare(
    `INSERT INTO payment_gateway_events (
      id, organization_id, subscription_id, provider, event_type, status, payload_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    gatewayEvent.id,
    organizationId,
    subscriptionId,
    gatewayEvent.provider,
    gatewayEvent.eventType,
    gatewayEvent.status,
    JSON.stringify(gatewayEvent.payload),
    gatewayEvent.createdAt
  );

  recordAuditLog(
    organizationId,
    actorUserId,
    'payment_gateway',
    subscriptionId,
    simulateFailure ? 'auto_renewal_failed' : 'auto_renewal_succeeded',
    { invoiceNumber: invNumber, amountCents: sub.amountCents }
  );

  const updatedSub = listOrganizationSubscriptions(organizationId).find(
    (s) => s.id === subscriptionId
  )!;
  return { subscription: updatedSub, invoice, gatewayEvent };
}

export function buildAdminReportSummary(organizationId: string): AdminReportSummary {
  const subs = listOrganizationSubscriptions(organizationId);
  const invoices = listBillingInvoices(organizationId);
  const users = listOrganizationUsersWithPermissions(organizationId);
  const shows = listShows(organizationId);
  const episodes = listEpisodes(organizationId);
  const scheduleEvents = listScheduleEvents(organizationId);

  const activeSubs = subs.filter((s) => s.status === 'active' || s.status === 'trialing');
  const mrrCents = activeSubs.reduce((acc, s) => acc + s.amountCents, 0);
  const autoRenewEnabledCount = subs.filter((s) => s.autoRenew).length;
  const paidInvoicesTotalCents = invoices
    .filter((i) => i.status === 'paid')
    .reduce((acc, i) => acc + i.amountCents, 0);
  const pendingInvoicesTotalCents = invoices
    .filter((i) => i.status === 'open' || i.status === 'failed')
    .reduce((acc, i) => acc + i.amountCents, 0);

  const showsReport = shows.map((sh) => {
    const shEpisodes = episodes.filter((e) => e.showId === sh.id);
    const publishedOrReadyCount = shEpisodes.filter((e) =>
      ['ready', 'recording', 'recorded', 'editing', 'published'].includes(e.status)
    ).length;
    const totalPlannedMinutes = shEpisodes.reduce(
      (acc, e) => acc + (e.targetDurationMin || sh.defaultDurationMin || 45),
      0
    );
    const scheduledSessionsCount = scheduleEvents.filter((ev) => ev.showId === sh.id).length;
    const authorizedUsersCount = users.filter(
      (u) =>
        u.role === 'owner' ||
        u.role === 'admin' ||
        u.showPermissions?.some((p) => p.showId === sh.id && p.canView)
    ).length;

    return {
      showId: sh.id,
      showTitle: sh.title,
      format: sh.format,
      host: sh.host,
      episodesCount: shEpisodes.length,
      publishedOrReadyCount,
      totalPlannedMinutes,
      scheduledSessionsCount,
      authorizedUsersCount,
    };
  });

  return {
    mrrCents,
    activeSubscriptionsCount: activeSubs.length,
    autoRenewEnabledCount,
    paidInvoicesTotalCents,
    pendingInvoicesTotalCents,
    usersCount: users.length,
    showsReport,
  };
}

// --- SHOWS ---

export function listShows(organizationId: string, allowedShowIds?: string[]): Show[] {
  const db = getDbConnection();
  const rows = db
    .prepare(`SELECT * FROM shows WHERE organization_id = ? ORDER BY created_at ASC`)
    .all(organizationId) as any[];
  const all = rows.map(mapRowToShow);
  if (Array.isArray(allowedShowIds)) {
    return all.filter((s) => allowedShowIds.includes(s.id));
  }
  return all;
}

export function getShowById(organizationId: string, showId: string): Show {
  const db = getDbConnection();
  const row = db.prepare(`SELECT * FROM shows WHERE id = ?`).get(showId) as any;
  if (!row) {
    throw new AppError(404, 'NOT_FOUND', `Programa (${showId}) não encontrado.`);
  }
  if (row.organization_id !== organizationId) {
    throw new AppError(
      403,
      'FORBIDDEN_CONTEXT',
      'Acesso negado: este programa pertence a outra organização.'
    );
  }
  return mapRowToShow(row);
}

export function createShow(
  organizationId: string,
  payload: Partial<Show>,
  userId?: string
): Show {
  const db = getDbConnection();
  const now = new Date().toISOString();
  const show: Show = {
    id: payload.id || `show-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId,
    title: payload.title || 'Novo Programa',
    description: payload.description || '',
    host: payload.host || 'Apresentador Principal',
    format: payload.format || 'Entrevista',
    defaultDurationMin: payload.defaultDurationMin || 45,
    editorialStyle: payload.editorialStyle || 'Jornalístico, humano e investigativo',
    scenario: payload.scenario || 'Estúdio Principal',
    catalogStatus: payload.catalogStatus || 'active',
    category: payload.category || 'Geral',
    targetAudience: payload.targetAudience || '',
    distributionChannels: payload.distributionChannels || ['RSPlay TV', 'YouTube', 'Spotify'],
    cameras:
      payload.cameras && payload.cameras.length > 0
        ? payload.cameras
        : [
            {
              id: 'cam-1',
              name: 'CAM 1',
              label: 'Geral / Master',
              purpose: 'Plano aberto',
              framing: 'Plano Geral (Wide)',
              active: true,
            },
            {
              id: 'cam-2',
              name: 'CAM 2',
              label: 'Close Convidado',
              purpose: 'Emoção e respostas densas',
              framing: 'Close-up Intimista',
              active: true,
            },
            {
              id: 'cam-3',
              name: 'CAM 3',
              label: 'Close Apresentador',
              purpose: 'Perguntas e teleprompter',
              framing: 'Plano Médio (Medium)',
              active: true,
            },
          ],
    standardStructure:
      payload.standardStructure && payload.standardStructure.length > 0
        ? payload.standardStructure
        : ['Abertura', 'Bloco 1: Origem', 'Bloco 2: Virada', 'Encerramento'],
    defaultOpening: payload.defaultOpening || 'Bem-vindos a mais um episódio na RSPlay TV.',
    defaultClosing: payload.defaultClosing || 'Obrigado pela audiência e até o próximo programa.',
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  };

  insertShowRecord(db, organizationId, show);

  // If created by a non-admin user, automatically grant full permissions on this show to creator
  if (userId) {
    db.prepare(
      `INSERT OR IGNORE INTO user_show_permissions (
        id, organization_id, user_id, show_id, can_view, can_edit_editorial,
        can_edit_script, can_operate_studio, can_manage_schedule, can_manage_assets,
        can_export, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 1, 1, 1, 1, 1, 1, 1, ?, ?)`
    ).run(`perm-${userId}-${show.id}`, organizationId, userId, show.id, now, now);
  }

  recordAuditLog(organizationId, userId, 'show', show.id, 'created', { title: show.title });
  return getShowById(organizationId, show.id);
}

export function updateShow(
  organizationId: string,
  showId: string,
  payload: Partial<Show>,
  userId?: string
): Show {
  const existing = getShowById(organizationId, showId);
  const db = getDbConnection();
  const now = new Date().toISOString();

  const merged: Show = {
    ...existing,
    ...payload,
    id: existing.id,
    organizationId,
    updatedAt: now,
  };

  db.prepare(
    `UPDATE shows SET
      title = ?, description = ?, host = ?, format = ?, default_duration_min = ?,
      editorial_style = ?, scenario = ?, cameras_json = ?, standard_structure_json = ?,
      default_opening = ?, default_closing = ?, catalog_status = ?, category = ?,
      target_audience = ?, distribution_channels_json = ?, updated_at = ?
     WHERE id = ? AND organization_id = ?`
  ).run(
    merged.title,
    merged.description,
    merged.host,
    merged.format,
    merged.defaultDurationMin,
    merged.editorialStyle,
    merged.scenario,
    JSON.stringify(merged.cameras),
    JSON.stringify(merged.standardStructure),
    merged.defaultOpening,
    merged.defaultClosing,
    merged.catalogStatus || 'active',
    merged.category || 'Geral',
    merged.targetAudience || '',
    JSON.stringify(merged.distributionChannels || []),
    now,
    showId,
    organizationId
  );

  recordAuditLog(organizationId, userId, 'show', showId, 'updated', { title: merged.title });
  return getShowById(organizationId, showId);
}

export function deleteShow(organizationId: string, showId: string, userId?: string) {
  const existing = getShowById(organizationId, showId);
  const db = getDbConnection();
  db.prepare(`DELETE FROM shows WHERE id = ? AND organization_id = ?`).run(showId, organizationId);
  recordAuditLog(organizationId, userId, 'show', showId, 'deleted', { title: existing.title });
}

// --- PRODUCTIONS (SEASONS / FRONTS) ---

export function listProductions(
  organizationId: string,
  showId?: string,
  allowedShowIds?: string[]
): Production[] {
  const db = getDbConnection();
  const rows = showId
    ? (db
        .prepare(
          `SELECT * FROM productions WHERE organization_id = ? AND show_id = ? ORDER BY season_number ASC, created_at ASC`
        )
        .all(organizationId, showId) as any[])
    : (db
        .prepare(`SELECT * FROM productions WHERE organization_id = ? ORDER BY created_at ASC`)
        .all(organizationId) as any[]);
  const all = rows.map(mapRowToProduction);
  if (Array.isArray(allowedShowIds)) {
    return all.filter((p) => allowedShowIds.includes(p.showId));
  }
  return all;
}

export function getProductionById(organizationId: string, productionId: string): Production {
  const db = getDbConnection();
  const row = db.prepare(`SELECT * FROM productions WHERE id = ?`).get(productionId) as any;
  if (!row) {
    throw new AppError(404, 'NOT_FOUND', `Produção (${productionId}) não encontrada.`);
  }
  if (row.organization_id !== organizationId) {
    throw new AppError(
      403,
      'FORBIDDEN_CONTEXT',
      'Acesso negado: esta produção pertence a outra organização.'
    );
  }
  return mapRowToProduction(row);
}

export function createProduction(
  organizationId: string,
  payload: Partial<Production>,
  userId?: string
): Production {
  getShowById(organizationId, payload.showId!);

  const db = getDbConnection();
  const now = new Date().toISOString();
  const prod: Production = {
    id: payload.id || `prod-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId,
    showId: payload.showId!,
    title: payload.title || 'Nova Temporada',
    seasonNumber: payload.seasonNumber || 1,
    status: payload.status || 'in_production',
    targetEpisodesCount: payload.targetEpisodesCount || 10,
    executiveProducer: payload.executiveProducer || 'Produção Executiva',
    startDate: payload.startDate,
    endDate: payload.endDate,
    notes: payload.notes || '',
    createdAt: now,
    updatedAt: now,
  };

  insertProductionRecord(db, organizationId, prod);
  recordAuditLog(organizationId, userId, 'production', prod.id, 'created', { title: prod.title });
  return getProductionById(organizationId, prod.id);
}

export function updateProduction(
  organizationId: string,
  productionId: string,
  payload: Partial<Production>,
  userId?: string
): Production {
  const existing = getProductionById(organizationId, productionId);
  if (payload.showId && payload.showId !== existing.showId) {
    getShowById(organizationId, payload.showId);
  }
  const db = getDbConnection();
  const now = new Date().toISOString();
  const merged: Production = {
    ...existing,
    ...payload,
    id: existing.id,
    organizationId,
    updatedAt: now,
  };

  db.prepare(
    `UPDATE productions SET
      show_id = ?, title = ?, season_number = ?, status = ?,
      target_episodes_count = ?, executive_producer = ?, start_date = ?,
      end_date = ?, notes = ?, updated_at = ?
     WHERE id = ? AND organization_id = ?`
  ).run(
    merged.showId,
    merged.title,
    merged.seasonNumber,
    merged.status,
    merged.targetEpisodesCount,
    merged.executiveProducer,
    merged.startDate || null,
    merged.endDate || null,
    merged.notes,
    now,
    productionId,
    organizationId
  );

  recordAuditLog(organizationId, userId, 'production', productionId, 'updated', {
    title: merged.title,
  });
  return getProductionById(organizationId, productionId);
}

export function deleteProduction(organizationId: string, productionId: string, userId?: string) {
  const existing = getProductionById(organizationId, productionId);
  const db = getDbConnection();
  db.prepare(`DELETE FROM productions WHERE id = ? AND organization_id = ?`).run(
    productionId,
    organizationId
  );
  recordAuditLog(organizationId, userId, 'production', productionId, 'deleted', {
    title: existing.title,
  });
}

// --- PARTICIPANTS / GUESTS ---

export function listParticipants(organizationId: string): Guest[] {
  const db = getDbConnection();
  const rows = db
    .prepare(`SELECT * FROM participants WHERE organization_id = ? ORDER BY created_at DESC`)
    .all(organizationId) as any[];
  return rows.map(mapRowToParticipant);
}

export function getParticipantById(organizationId: string, participantId: string): Guest {
  const db = getDbConnection();
  const row = db.prepare(`SELECT * FROM participants WHERE id = ?`).get(participantId) as any;
  if (!row) {
    throw new AppError(404, 'NOT_FOUND', `Participante/Convidado (${participantId}) não encontrado.`);
  }
  if (row.organization_id !== organizationId) {
    throw new AppError(
      403,
      'FORBIDDEN_CONTEXT',
      'Acesso negado: este convidado pertence a outra organização.'
    );
  }
  return mapRowToParticipant(row);
}

export function createParticipant(
  organizationId: string,
  payload: Partial<Guest>,
  userId?: string
): Guest {
  const db = getDbConnection();
  const now = new Date().toISOString();
  const guest: Guest = {
    id: payload.id || `guest-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId,
    name: payload.name || 'Convidado',
    role: payload.role || '',
    company: payload.company || '',
    bio: payload.bio || '',
    contacts: payload.contacts || '',
    links: payload.links || [],
    notes: payload.notes || '',
    previousEpisodes: payload.previousEpisodes || [],
    previousResearchSummary: payload.previousResearchSummary || '',
    createdAt: now,
    updatedAt: now,
  };

  insertParticipantRecord(db, organizationId, guest);
  recordAuditLog(organizationId, userId, 'participant', guest.id, 'created', { name: guest.name });
  return getParticipantById(organizationId, guest.id);
}

export function updateParticipant(
  organizationId: string,
  participantId: string,
  payload: Partial<Guest>,
  userId?: string
): Guest {
  const existing = getParticipantById(organizationId, participantId);
  const db = getDbConnection();
  const now = new Date().toISOString();
  const merged: Guest = {
    ...existing,
    ...payload,
    id: existing.id,
    organizationId,
    updatedAt: now,
  };

  db.prepare(
    `UPDATE participants SET
      name = ?, role = ?, company = ?, bio = ?, contacts = ?,
      links_json = ?, notes = ?, previous_episodes_json = ?,
      previous_research_summary = ?, updated_at = ?
     WHERE id = ? AND organization_id = ?`
  ).run(
    merged.name,
    merged.role,
    merged.company,
    merged.bio,
    merged.contacts,
    JSON.stringify(merged.links || []),
    merged.notes,
    JSON.stringify(merged.previousEpisodes || []),
    merged.previousResearchSummary || '',
    now,
    participantId,
    organizationId
  );

  recordAuditLog(organizationId, userId, 'participant', participantId, 'updated', {
    name: merged.name,
  });
  return getParticipantById(organizationId, participantId);
}

export function deleteParticipant(organizationId: string, participantId: string, userId?: string) {
  const existing = getParticipantById(organizationId, participantId);
  const db = getDbConnection();
  db.prepare(`DELETE FROM participants WHERE id = ? AND organization_id = ?`).run(
    participantId,
    organizationId
  );
  recordAuditLog(organizationId, userId, 'participant', participantId, 'deleted', {
    name: existing.name,
  });
}

// --- EPISODES ---

export function listEpisodes(
  organizationId: string,
  showId?: string,
  allowedShowIds?: string[]
): Episode[] {
  const db = getDbConnection();
  const rows = showId
    ? (db
        .prepare(
          `SELECT * FROM episodes WHERE organization_id = ? AND show_id = ? ORDER BY episode_number DESC, updated_at DESC`
        )
        .all(organizationId, showId) as any[])
    : (db
        .prepare(`SELECT * FROM episodes WHERE organization_id = ? ORDER BY updated_at DESC`)
        .all(organizationId) as any[]);

  const all = rows.map((r) => mapRowToEpisode(db, r));
  if (Array.isArray(allowedShowIds)) {
    return all.filter((ep) => allowedShowIds.includes(ep.showId));
  }
  return all;
}

export function getEpisodeById(organizationId: string, episodeId: string): Episode {
  const db = getDbConnection();
  const row = db.prepare(`SELECT * FROM episodes WHERE id = ?`).get(episodeId) as any;
  if (!row) {
    throw new AppError(404, 'NOT_FOUND', `Episódio (${episodeId}) não encontrado.`);
  }
  if (row.organization_id !== organizationId) {
    throw new AppError(
      403,
      'FORBIDDEN_CONTEXT',
      'Acesso negado: este episódio pertence a outra organização.'
    );
  }
  return mapRowToEpisode(db, row);
}

export function createEpisode(
  organizationId: string,
  payload: Partial<Episode>,
  userId?: string
): Episode {
  const parentShow = getShowById(organizationId, payload.showId!);
  if (payload.productionId) {
    const prod = getProductionById(organizationId, payload.productionId);
    if (prod.showId !== parentShow.id) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'A produção/temporada informada não pertence ao programa selecionado.'
      );
    }
  }

  let validGuestId = payload.guestId;
  if (validGuestId) {
    getParticipantById(organizationId, validGuestId);
  }

  const db = getDbConnection();
  const now = new Date().toISOString();

  let resolvedProductionId = payload.productionId;
  if (!resolvedProductionId) {
    const firstProd = db
      .prepare(`SELECT id FROM productions WHERE organization_id = ? AND show_id = ? LIMIT 1`)
      .get(organizationId, parentShow.id) as { id: string } | undefined;
    if (firstProd) resolvedProductionId = firstProd.id;
  }

  const countRow = db
    .prepare(`SELECT COUNT(*) as cnt FROM episodes WHERE organization_id = ? AND show_id = ?`)
    .get(organizationId, parentShow.id) as { cnt: number };

  const episode: Episode = {
    id: payload.id || `ep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId,
    showId: parentShow.id,
    productionId: resolvedProductionId,
    episodeNumber: payload.episodeNumber || countRow.cnt + 1,
    title: payload.title || 'Novo Episódio',
    idea: payload.idea || '',
    guestName: payload.guestName || '',
    guestId: validGuestId,
    host: payload.host || parentShow.host || 'Apresentador',
    format: payload.format || parentShow.format || 'Entrevista',
    targetDurationMin: payload.targetDurationMin || parentShow.defaultDurationMin || 45,
    objective: payload.objective || '',
    additionalInfo: payload.additionalInfo || '',
    status: payload.status || 'draft',
    diagnosis: payload.diagnosis || {
      centralTheme: '',
      potentialStory: '',
      primaryConflict: '',
      primaryTransformation: '',
      whyWatch: '',
      whatToDiscover: '',
      researchPoints: [],
      highImpactMoments: [],
      approved: false,
    },
    research: payload.research || {
      aboutGuest: '',
      trajectory: '',
      company: '',
      keyDatesAndNumbers: '',
      previousInterviews: '',
      recurringThemes: '',
      contradictionsAndClarifications: '',
      compellingStories: '',
      sources: [],
    },
    outline: payload.outline || [],
    questions: payload.questions || [],
    script: payload.script || [],
    cameras:
      payload.cameras && payload.cameras.length > 0 ? payload.cameras : parentShow.cameras || [],
    assets: payload.assets || [],
    shorts: payload.shorts || [],
    recordingMarkers: payload.recordingMarkers || [],
    technicalChecklist: payload.technicalChecklist || {
      cam1Recording: false,
      cam2Recording: false,
      cam3Recording: false,
      micHost: false,
      micGuest: false,
      audioMonitored: false,
      lighting: false,
      memoryCardsStorage: false,
      batteries: false,
      syncClap: false,
      waterReady: false,
      silentPhones: false,
      customItems: [],
    },
    versions: payload.versions || [],
    editorScriptSynthesis: payload.editorScriptSynthesis || '',
    recordingTimeElapsed: payload.recordingTimeElapsed || 0,
    createdBy: userId,
    updatedBy: userId,
    createdAt: now,
    updatedAt: now,
  };

  insertEpisodeRecord(db, organizationId, episode);
  recordAuditLog(organizationId, userId, 'episode', episode.id, 'created', {
    title: episode.title,
    showId: episode.showId,
  });

  return getEpisodeById(organizationId, episode.id);
}

export function updateEpisode(
  organizationId: string,
  episodeId: string,
  payload: Partial<Episode>,
  userId?: string
): Episode {
  const existing = getEpisodeById(organizationId, episodeId);
  if (payload.showId && payload.showId !== existing.showId) {
    getShowById(organizationId, payload.showId);
  }
  if (payload.guestId && payload.guestId !== existing.guestId) {
    getParticipantById(organizationId, payload.guestId);
  }

  const db = getDbConnection();
  const now = new Date().toISOString();

  const merged: Episode = {
    ...existing,
    ...payload,
    id: existing.id,
    organizationId,
    updatedBy: userId || existing.updatedBy,
    updatedAt: now,
  };

  db.prepare(
    `UPDATE episodes SET
      show_id = ?, production_id = ?, episode_number = ?, title = ?, idea = ?,
      guest_name = ?, guest_id = ?, host = ?, format = ?, target_duration_min = ?,
      objective = ?, additional_info = ?, status = ?, diagnosis_json = ?,
      research_json = ?, outline_json = ?, questions_json = ?, script_json = ?,
      cameras_json = ?, assets_json = ?, shorts_json = ?, recording_markers_json = ?,
      technical_checklist_json = ?, editor_script_synthesis = ?, recording_time_elapsed = ?,
      updated_by = ?, updated_at = ?
     WHERE id = ? AND organization_id = ?`
  ).run(
    merged.showId,
    merged.productionId || null,
    merged.episodeNumber,
    merged.title,
    merged.idea,
    merged.guestName,
    merged.guestId || null,
    merged.host,
    merged.format,
    merged.targetDurationMin,
    merged.objective || '',
    merged.additionalInfo || '',
    merged.status,
    JSON.stringify(merged.diagnosis),
    JSON.stringify(merged.research),
    JSON.stringify(merged.outline),
    JSON.stringify(merged.questions),
    JSON.stringify(merged.script),
    JSON.stringify(merged.cameras),
    JSON.stringify(merged.assets),
    JSON.stringify(merged.shorts),
    JSON.stringify(merged.recordingMarkers),
    JSON.stringify(merged.technicalChecklist),
    merged.editorScriptSynthesis || '',
    merged.recordingTimeElapsed || 0,
    merged.updatedBy || null,
    now,
    episodeId,
    organizationId
  );

  if (merged.guestId) {
    db.prepare(
      `INSERT OR IGNORE INTO episode_participants (
        id, organization_id, episode_id, participant_id, role_in_episode, confirmation_status, notes, created_at
      ) VALUES (?, ?, ?, ?, 'main_guest', 'confirmed', '', ?)`
    ).run(`epp-${episodeId}-${merged.guestId}`, organizationId, episodeId, merged.guestId, now);
  }

  if (Array.isArray(payload.versions)) {
    db.prepare(`DELETE FROM script_versions WHERE episode_id = ? AND organization_id = ?`).run(
      episodeId,
      organizationId
    );
    for (let i = 0; i < payload.versions.length; i++) {
      const v = payload.versions[i];
      db.prepare(
        `INSERT OR REPLACE INTO script_versions (
          id, organization_id, episode_id, version_number, name, description, snapshot_json, created_by, saved_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        v.id || `ver-${episodeId}-${i + 1}`,
        organizationId,
        episodeId,
        v.versionNumber || i + 1,
        v.name || `Versão ${i + 1}`,
        v.description || '',
        JSON.stringify(v.snapshot || {}),
        userId || null,
        v.savedAt || now
      );
    }
  }

  if (Array.isArray(payload.assets)) {
    for (const ast of payload.assets) {
      if (!ast || !ast.id || !ast.title) continue;
      const libId = ast.id.startsWith('lib-') ? ast.id : `lib-${ast.id}`;
      db.prepare(
        `INSERT OR REPLACE INTO library_assets (
          id, organization_id, show_id, episode_id, type, title, description,
          moment, status, file_url, tags_json, reusable, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        libId,
        organizationId,
        merged.showId,
        episodeId,
        ast.type || 'documento',
        ast.title,
        ast.description || '',
        ast.moment || '',
        ast.status || 'pendente',
        ast.fileUrl || null,
        JSON.stringify(ast.tags || []),
        ast.reusable === false ? 0 : 1,
        now,
        now
      );
    }
  }

  incrementMetric('autosavesTotal');
  return getEpisodeById(organizationId, episodeId);
}

export function deleteEpisode(organizationId: string, episodeId: string, userId?: string) {
  const existing = getEpisodeById(organizationId, episodeId);
  const db = getDbConnection();
  db.prepare(`DELETE FROM episodes WHERE id = ? AND organization_id = ?`).run(
    episodeId,
    organizationId
  );
  recordAuditLog(organizationId, userId, 'episode', episodeId, 'deleted', {
    title: existing.title,
  });
}

// --- SCHEDULE EVENTS (AGENDA DE PRODUÇÃO) ---

export function listScheduleEvents(
  organizationId: string,
  showId?: string,
  allowedShowIds?: string[]
): ScheduleEvent[] {
  const db = getDbConnection();
  const baseQuery = `
    SELECT se.*, e.title as episode_title, e.episode_number
    FROM schedule_events se
    LEFT JOIN episodes e ON e.id = se.episode_id
    WHERE se.organization_id = ?
  `;
  const rows = showId
    ? (db
        .prepare(`${baseQuery} AND se.show_id = ? ORDER BY se.scheduled_start ASC`)
        .all(organizationId, showId) as any[])
    : (db
        .prepare(`${baseQuery} ORDER BY se.scheduled_start ASC`)
        .all(organizationId) as any[]);

  const all = rows.map(mapRowToScheduleEvent);
  if (Array.isArray(allowedShowIds)) {
    return all.filter((ev) => allowedShowIds.includes(ev.showId));
  }
  return all;
}

export function getScheduleEventById(
  organizationId: string,
  scheduleId: string
): ScheduleEvent {
  const db = getDbConnection();
  const row = db
    .prepare(
      `SELECT se.*, e.title as episode_title, e.episode_number
       FROM schedule_events se
       LEFT JOIN episodes e ON e.id = se.episode_id
       WHERE se.id = ?`
    )
    .get(scheduleId) as any;

  if (!row) {
    throw new AppError(404, 'NOT_FOUND', `Evento de agenda (${scheduleId}) não encontrado.`);
  }
  if (row.organization_id !== organizationId) {
    throw new AppError(
      403,
      'FORBIDDEN_CONTEXT',
      'Acesso negado: este compromisso de agenda pertence a outra organização.'
    );
  }
  return mapRowToScheduleEvent(row);
}

export function createScheduleEvent(
  organizationId: string,
  payload: Partial<ScheduleEvent>,
  userId?: string
): ScheduleEvent {
  getShowById(organizationId, payload.showId!);
  if (payload.episodeId) {
    getEpisodeById(organizationId, payload.episodeId);
  }

  const db = getDbConnection();
  const now = new Date().toISOString();
  const ev: ScheduleEvent = {
    id: payload.id || `sched-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId,
    showId: payload.showId!,
    productionId: payload.productionId,
    episodeId: payload.episodeId,
    title: payload.title || 'Novo Compromisso de Estúdio',
    type: payload.type || 'recording',
    status: payload.status || 'scheduled',
    scheduledStart: payload.scheduledStart || now,
    scheduledEnd:
      payload.scheduledEnd || new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
    studioLocation: payload.studioLocation || 'Estúdio Principal',
    assignedTeam: payload.assignedTeam || [],
    notes: payload.notes || '',
    createdAt: now,
    updatedAt: now,
  };

  insertScheduleEventRecord(db, organizationId, ev);
  recordAuditLog(organizationId, userId, 'schedule_event', ev.id, 'created', { title: ev.title });
  return getScheduleEventById(organizationId, ev.id);
}

export function updateScheduleEvent(
  organizationId: string,
  scheduleId: string,
  payload: Partial<ScheduleEvent>,
  userId?: string
): ScheduleEvent {
  const existing = getScheduleEventById(organizationId, scheduleId);
  if (payload.showId && payload.showId !== existing.showId) {
    getShowById(organizationId, payload.showId);
  }
  if (payload.episodeId && payload.episodeId !== existing.episodeId) {
    getEpisodeById(organizationId, payload.episodeId);
  }

  const db = getDbConnection();
  const now = new Date().toISOString();
  const merged: ScheduleEvent = {
    ...existing,
    ...payload,
    id: existing.id,
    organizationId,
    updatedAt: now,
  };

  db.prepare(
    `UPDATE schedule_events SET
      show_id = ?, production_id = ?, episode_id = ?, title = ?,
      type = ?, status = ?, scheduled_start = ?, scheduled_end = ?,
      studio_location = ?, assigned_team_json = ?, notes = ?, updated_at = ?
     WHERE id = ? AND organization_id = ?`
  ).run(
    merged.showId,
    merged.productionId || null,
    merged.episodeId || null,
    merged.title,
    merged.type,
    merged.status,
    merged.scheduledStart,
    merged.scheduledEnd,
    merged.studioLocation,
    JSON.stringify(merged.assignedTeam || []),
    merged.notes || '',
    now,
    scheduleId,
    organizationId
  );

  recordAuditLog(organizationId, userId, 'schedule_event', scheduleId, 'updated', {
    title: merged.title,
  });
  return getScheduleEventById(organizationId, scheduleId);
}

export function deleteScheduleEvent(
  organizationId: string,
  scheduleId: string,
  userId?: string
) {
  const existing = getScheduleEventById(organizationId, scheduleId);
  const db = getDbConnection();
  db.prepare(`DELETE FROM schedule_events WHERE id = ? AND organization_id = ?`).run(
    scheduleId,
    organizationId
  );
  recordAuditLog(organizationId, userId, 'schedule_event', scheduleId, 'deleted', {
    title: existing.title,
  });
}

// --- LIBRARY ASSETS (BIBLIOTECA TRANSVERSAL DE ASSETS) ---

export function listLibraryAssets(
  organizationId: string,
  showId?: string,
  allowedShowIds?: string[]
): LibraryAsset[] {
  const db = getDbConnection();
  const baseQuery = `
    SELECT la.*, e.title as episode_title
    FROM library_assets la
    LEFT JOIN episodes e ON e.id = la.episode_id
    WHERE la.organization_id = ?
  `;
  const rows = showId
    ? (db
        .prepare(`${baseQuery} AND la.show_id = ? ORDER BY la.updated_at DESC`)
        .all(organizationId, showId) as any[])
    : (db
        .prepare(`${baseQuery} ORDER BY la.updated_at DESC`)
        .all(organizationId) as any[]);

  const all = rows.map(mapRowToLibraryAsset);
  if (Array.isArray(allowedShowIds)) {
    return all.filter((a) => !a.showId || allowedShowIds.includes(a.showId));
  }
  return all;
}

export function getLibraryAssetById(organizationId: string, assetId: string): LibraryAsset {
  const db = getDbConnection();
  const row = db
    .prepare(
      `SELECT la.*, e.title as episode_title
       FROM library_assets la
       LEFT JOIN episodes e ON e.id = la.episode_id
       WHERE la.id = ?`
    )
    .get(assetId) as any;

  if (!row) {
    throw new AppError(404, 'NOT_FOUND', `Asset da biblioteca (${assetId}) não encontrado.`);
  }
  if (row.organization_id !== organizationId) {
    throw new AppError(
      403,
      'FORBIDDEN_CONTEXT',
      'Acesso negado: este asset pertence a outra organização.'
    );
  }
  return mapRowToLibraryAsset(row);
}

export function createLibraryAsset(
  organizationId: string,
  payload: Partial<LibraryAsset>,
  userId?: string
): LibraryAsset {
  if (payload.showId) {
    getShowById(organizationId, payload.showId);
  }
  if (payload.episodeId) {
    getEpisodeById(organizationId, payload.episodeId);
  }

  const db = getDbConnection();
  const now = new Date().toISOString();
  const asset: LibraryAsset = {
    id: payload.id || `lib-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId,
    showId: payload.showId,
    episodeId: payload.episodeId,
    type: payload.type || 'documento',
    title: payload.title || 'Novo Material de Produção',
    description: payload.description || '',
    moment: payload.moment || 'Uso transversal no programa',
    status: payload.status || 'obtido',
    fileUrl: payload.fileUrl,
    tags: payload.tags || [],
    reusable: payload.reusable !== false,
    createdAt: now,
    updatedAt: now,
  };

  insertLibraryAssetRecord(db, organizationId, asset);
  recordAuditLog(organizationId, userId, 'library_asset', asset.id, 'created', {
    title: asset.title,
  });
  return getLibraryAssetById(organizationId, asset.id);
}

export function updateLibraryAsset(
  organizationId: string,
  assetId: string,
  payload: Partial<LibraryAsset>,
  userId?: string
): LibraryAsset {
  const existing = getLibraryAssetById(organizationId, assetId);
  const db = getDbConnection();
  const now = new Date().toISOString();
  const merged: LibraryAsset = {
    ...existing,
    ...payload,
    id: existing.id,
    organizationId,
    updatedAt: now,
  };

  db.prepare(
    `UPDATE library_assets SET
      show_id = ?, episode_id = ?, type = ?, title = ?, description = ?,
      moment = ?, status = ?, file_url = ?, tags_json = ?, reusable = ?, updated_at = ?
     WHERE id = ? AND organization_id = ?`
  ).run(
    merged.showId || null,
    merged.episodeId || null,
    merged.type,
    merged.title,
    merged.description,
    merged.moment,
    merged.status,
    merged.fileUrl || null,
    JSON.stringify(merged.tags || []),
    merged.reusable ? 1 : 0,
    now,
    assetId,
    organizationId
  );

  recordAuditLog(organizationId, userId, 'library_asset', assetId, 'updated', {
    title: merged.title,
  });
  return getLibraryAssetById(organizationId, assetId);
}

export function deleteLibraryAsset(organizationId: string, assetId: string, userId?: string) {
  const existing = getLibraryAssetById(organizationId, assetId);
  const db = getDbConnection();
  db.prepare(`DELETE FROM library_assets WHERE id = ? AND organization_id = ?`).run(
    assetId,
    organizationId
  );
  recordAuditLog(organizationId, userId, 'library_asset', assetId, 'deleted', {
    title: existing.title,
  });
}

export function listAuditLogs(organizationId: string, limit = 40): AuditLogEntry[] {
  const db = getDbConnection();
  const rows = db
    .prepare(
      `SELECT * FROM audit_logs WHERE organization_id = ? ORDER BY created_at DESC LIMIT ?`
    )
    .all(organizationId, limit) as any[];

  return rows.map((r) => ({
    id: r.id,
    organizationId: r.organization_id,
    userId: r.user_id || undefined,
    entityType: r.entity_type,
    entityId: r.entity_id,
    action: r.action,
    metadata: safeJsonParse(r.metadata_json, {}),
    createdAt: r.created_at,
  }));
}

export function checkDatabaseHealth() {
  const db = getDbConnection();
  const ping = db.prepare(`SELECT 1 as ok`).get() as { ok: number };
  const migrations = db
    .prepare(`SELECT version, applied_at FROM schema_migrations ORDER BY version ASC`)
    .all() as { version: string; applied_at: string }[];
  const orgsCount = (db.prepare(`SELECT COUNT(*) as c FROM organizations`).get() as { c: number }).c;
  const showsCount = (db.prepare(`SELECT COUNT(*) as c FROM shows`).get() as { c: number }).c;
  const episodesCount = (db.prepare(`SELECT COUNT(*) as c FROM episodes`).get() as { c: number }).c;

  return {
    connected: ping?.ok === 1,
    engine: supabaseClient ? 'supabase-postgres+sqlite-mirror' : 'relational-sql-v2',
    supabaseConfigured: Boolean(supabaseClient),
    migrationsApplied: migrations.map((m) => m.version),
    stats: {
      organizations: orgsCount,
      shows: showsCount,
      episodes: episodesCount,
    },
  };
}

/**
 * First-time SaaS Account Registration & Payer Gateway Onboarding
 * Creates user, links/creates/imports program from RS Play Knowledge Base, grants show permissions,
 * and activates recurring monthly subscription + paid invoice on the gateway.
 */
export function registerSaaSAccountWithSubscription(
  payload: SaaSRegistrationPayload,
  organizationId = 'org-takemaster-studio'
): {
  user: User;
  show: Show;
  subscription: SaaSSubscription;
  invoice: BillingInvoice;
  gatewayEvent: PaymentGatewayEvent;
} {
  const name = String(payload.name || '').trim();
  const email = String(payload.email || '').trim().toLowerCase();
  const loginCode = String(payload.loginCode || 'rsplay123').trim() || 'rsplay123';
  const role: OrganizationRole = payload.role || 'producer';

  if (name.length < 2) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Informe o nome completo para o cadastro.');
  }
  if (!email.includes('@')) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Informe um e-mail corporativo válido.');
  }

  let targetShow: Show | null = null;
  const allShows = listShows(organizationId);

  if (payload.showMode === 'existing' && payload.existingShowId) {
    targetShow = allShows.find((s) => s.id === payload.existingShowId) || allShows[0] || null;
  } else if (payload.showMode === 'knowledge_base' && payload.knowledgeBaseSlug) {
    const existingBySlug = allShows.find(
      (s) =>
        s.id === `show-${payload.knowledgeBaseSlug}` ||
        s.title.toLowerCase() === payload.knowledgeBaseSlug?.replace(/-/g, ' ').toLowerCase()
    );
    if (existingBySlug) {
      targetShow = existingBySlug;
    } else {
      const { summary } = resolveProgramKnowledge(
        { title: payload.knowledgeBaseSlug },
        payload.knowledgeBaseSlug
      );
      targetShow = createShow(organizationId, {
        id: `show-${summary.slug}`,
        title: summary.nome,
        host:
          summary.apresentador !== 'não identificado na base'
            ? summary.apresentador.split(' — ')[0]
            : name,
        description:
          summary.descricao !== 'não identificado na base'
            ? summary.descricao
            : `Programa oficial ${summary.nome} na RS Play TV.`,
        format: 'Entrevista',
        defaultDurationMin: 30,
        editorialStyle:
          summary.proposta !== 'não identificado na base'
            ? summary.proposta.slice(0, 260)
            : summary.descricao,
        category: summary.temasPrincipais[0] || 'RS Play TV',
        targetAudience:
          summary.publico !== 'não identificado na base' ? summary.publico : 'Audiência RS Play TV',
        distributionChannels: ['Claro TV+ (Canal 524)', 'Ecossistema RS Play', 'YouTube'],
        catalogStatus: 'active',
      });
    }
  } else if (payload.showMode === 'new' && payload.newShowTitle?.trim()) {
    targetShow = createShow(organizationId, {
      title: payload.newShowTitle.trim(),
      host: payload.newShowHost?.trim() || name,
      format: payload.newShowFormat || 'Entrevista',
      defaultDurationMin: 30,
      description: `Programa ${payload.newShowTitle.trim()} cadastrado no onboarding RSPlay TV SaaS.`,
      editorialStyle: 'Entrevistas e conteúdo dinâmico em estúdio multicâmera.',
      catalogStatus: 'active',
    });
  }

  if (!targetShow) {
    targetShow = allShows[0];
  }

  const createdUser = createOrganizationUserWithShowPermissions(
    organizationId,
    {
      name,
      email,
      jobTitle: payload.jobTitle?.trim() || `Produtor(a) / Apresentador(a) — ${targetShow.title}`,
      loginCode,
      role,
      showPermissions: [
        {
          showId: targetShow.id,
          canView: true,
          canEditEditorial: role !== 'viewer',
          canEditScript: role !== 'viewer',
          canOperateStudio: role !== 'viewer',
          canManageSchedule: role !== 'viewer',
          canManageAssets: role !== 'viewer',
          canExport: true,
        },
      ],
    },
    'self-onboarding'
  );

  const billingRes = subscribeOrUpdatePlan(
    organizationId,
    {
      planId: payload.planId || 'rsplay_programa_individual',
      showId: targetShow.id,
      paymentMethodType: payload.paymentMethodType || 'pix_automatico',
      paymentMethodBrand:
        payload.paymentMethodBrand ||
        (payload.paymentMethodType === 'pix_automatico'
          ? 'PIX Automático Banco Central'
          : 'Mastercard Corporativo'),
      paymentMethodLast4:
        payload.paymentMethodLast4 ||
        (payload.paymentMethodType === 'pix_automatico' ? 'PIX' : '4829'),
      autoRenew: payload.autoRenew !== false,
    },
    createdUser.id
  );

  return {
    user: createdUser,
    show: targetShow,
    subscription: billingRes.subscription,
    invoice: billingRes.invoice,
    gatewayEvent: billingRes.gatewayEvent,
  };
}
