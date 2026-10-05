import { DatabaseSync } from 'node:sqlite';
import {
  AdminReportSummary,
  BillingInvoice,
  OrganizationRole,
  PaymentGatewayEvent,
  PaymentMethodType,
  SaaSPlanDefinition,
  SaaSSubscription,
  SubscriptionPlanId,
  User,
  UserShowPermission,
} from '../domain/contracts';
import { AppError } from '../domain/validation';
import {
  buildSeedSubscriptionsForOrg,
  RSPLAY_SAAS_PLANS,
  SEED_MEMBERSHIPS,
  SEED_ORGANIZATIONS,
  SEED_USER_SHOW_PERMISSIONS,
  SEED_USERS,
} from './seeds';
import {
  getDbConnection,
  listEpisodes,
  listScheduleEvents,
  listShows,
  recordAuditLog,
} from './persistence';

function safeJsonParse<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== 'string' || !raw.trim()) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function runSaasMigrationsAndSeed(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_show_permissions (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      show_id TEXT NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
      can_view INTEGER NOT NULL DEFAULT 1,
      can_edit_editorial INTEGER NOT NULL DEFAULT 1,
      can_edit_script INTEGER NOT NULL DEFAULT 1,
      can_operate_studio INTEGER NOT NULL DEFAULT 1,
      can_manage_schedule INTEGER NOT NULL DEFAULT 0,
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
      plan_id TEXT NOT NULL DEFAULT 'rsplay_studio_pro',
      plan_name TEXT NOT NULL DEFAULT 'Plano Estúdio Pro RSPlay',
      billing_cycle TEXT NOT NULL DEFAULT 'monthly',
      amount_cents INTEGER NOT NULL DEFAULT 129000,
      currency TEXT NOT NULL DEFAULT 'BRL',
      status TEXT NOT NULL DEFAULT 'active',
      auto_renew INTEGER NOT NULL DEFAULT 1,
      payment_gateway TEXT NOT NULL DEFAULT 'RSPlay Pay / Stripe',
      payment_method_type TEXT NOT NULL DEFAULT 'credit_card',
      payment_method_last4 TEXT NOT NULL DEFAULT '4242',
      payment_method_brand TEXT NOT NULL DEFAULT 'Mastercard Corporate',
      gateway_customer_id TEXT NOT NULL DEFAULT '',
      gateway_subscription_id TEXT NOT NULL DEFAULT '',
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
      auto_renewal_cycle INTEGER NOT NULL DEFAULT 1,
      due_date TEXT NOT NULL,
      paid_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payment_gateway_events (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      subscription_id TEXT,
      provider TEXT NOT NULL DEFAULT 'RSPlay Pay / Stripe',
      event_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'processed',
      payload_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );
  `);

  const cols = db.prepare(`PRAGMA table_info(users)`).all() as { name: string }[];
  if (!cols.some((c) => c.name === 'job_title')) {
    db.exec(`ALTER TABLE users ADD COLUMN job_title TEXT NOT NULL DEFAULT 'Produtor'`);
  }
  if (!cols.some((c) => c.name === 'status')) {
    db.exec(`ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active'`);
  }
  if (!cols.some((c) => c.name === 'login_code')) {
    db.exec(`ALTER TABLE users ADD COLUMN login_code TEXT NOT NULL DEFAULT 'rsplay123'`);
  }
  if (!cols.some((c) => c.name === 'last_login_at')) {
    db.exec(`ALTER TABLE users ADD COLUMN last_login_at TEXT`);
  }

  const now = new Date().toISOString();
  db.prepare(`INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (?, ?)`).run(
    '0003_v2_rsplay_saas_rbac_billing.sql',
    now
  );

  // Upsert seed users & memberships
  const upsertUser = db.prepare(`
    INSERT OR REPLACE INTO users (id, email, name, job_title, status, login_code, avatar_url, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const usr of SEED_USERS) {
    upsertUser.run(
      usr.id,
      usr.email,
      usr.name,
      usr.jobTitle || 'Produtor',
      usr.status || 'active',
      usr.loginCode || 'rsplay123',
      usr.avatarUrl || null,
      usr.createdAt,
      usr.updatedAt
    );
  }

  for (const org of SEED_ORGANIZATIONS) {
    db.prepare(`UPDATE organizations SET name = ?, plan = ? WHERE id = ?`).run(
      org.name,
      org.plan,
      org.id
    );
  }

  const insertMem = db.prepare(`
    INSERT OR IGNORE INTO organization_members (id, organization_id, user_id, role, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  for (const mem of SEED_MEMBERSHIPS) {
    insertMem.run(mem.id, mem.organizationId, mem.userId, mem.role, now);
  }

  const permCount = (
    db.prepare(`SELECT COUNT(*) as cnt FROM user_show_permissions`).get() as { cnt: number }
  ).cnt;
  if (permCount === 0) {
    seedShowPermissions(db);
  }

  const subCount = (
    db.prepare(`SELECT COUNT(*) as cnt FROM saas_subscriptions`).get() as { cnt: number }
  ).cnt;
  if (subCount === 0) {
    for (const org of SEED_ORGANIZATIONS) {
      seedOrganizationBilling(db, org.id);
    }
  }
}

export function seedShowPermissions(db: DatabaseSync) {
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO user_show_permissions (
      id, organization_id, user_id, show_id, can_view, can_edit_editorial,
      can_edit_script, can_operate_studio, can_manage_schedule, can_manage_assets,
      can_export, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const p of SEED_USER_SHOW_PERMISSIONS) {
    const showExists = db.prepare(`SELECT id FROM shows WHERE id = ?`).get(p.showId);
    if (showExists) {
      stmt.run(
        p.id,
        p.organizationId,
        p.userId,
        p.showId,
        p.canView ? 1 : 0,
        p.canEditEditorial ? 1 : 0,
        p.canEditScript ? 1 : 0,
        p.canOperateStudio ? 1 : 0,
        p.canManageSchedule ? 1 : 0,
        p.canManageAssets ? 1 : 0,
        p.canExport ? 1 : 0,
        now,
        now
      );
    }
  }
}

export function seedOrganizationBilling(db: DatabaseSync, organizationId: string) {
  const billing = buildSeedSubscriptionsForOrg(organizationId);
  db.prepare(`DELETE FROM payment_gateway_events WHERE organization_id = ?`).run(organizationId);
  db.prepare(`DELETE FROM billing_invoices WHERE organization_id = ?`).run(organizationId);
  db.prepare(`DELETE FROM saas_subscriptions WHERE organization_id = ?`).run(organizationId);

  for (const sub of billing.subscriptions) {
    db.prepare(`
      INSERT INTO saas_subscriptions (
        id, organization_id, show_id, plan_id, plan_name, billing_cycle,
        amount_cents, currency, status, auto_renew, payment_gateway,
        payment_method_type, payment_method_last4, payment_method_brand,
        gateway_customer_id, gateway_subscription_id, current_period_start,
        current_period_end, last_renewal_at, canceled_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      sub.id,
      organizationId,
      sub.showId || null,
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
    db.prepare(`
      INSERT INTO billing_invoices (
        id, organization_id, subscription_id, invoice_number, description,
        amount_cents, currency, status, payment_method, gateway_transaction_id,
        auto_renewal_cycle, due_date, paid_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
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
    db.prepare(`
      INSERT INTO payment_gateway_events (
        id, organization_id, subscription_id, provider, event_type, status, payload_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
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

  return rows.map((r) => ({
    id: r.id,
    organizationId: r.organization_id,
    userId: r.user_id,
    showId: r.show_id,
    showTitle: r.show_title,
    canView: Boolean(r.can_view),
    canEditEditorial: Boolean(r.can_edit_editorial),
    canEditScript: Boolean(r.can_edit_script),
    canOperateStudio: Boolean(r.can_operate_studio),
    canManageSchedule: Boolean(r.can_manage_schedule),
    canManageAssets: Boolean(r.can_manage_assets),
    canExport: Boolean(r.can_export),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export function resolveUserAllowedShows(
  organizationId: string,
  userId: string,
  role: OrganizationRole
): {
  isFullAccessAdmin: boolean;
  allowedShowIds: string[];
  showPermissions: UserShowPermission[];
} {
  const db = getDbConnection();
  const allOrgShows = db
    .prepare(`SELECT id, title FROM shows WHERE organization_id = ? ORDER BY created_at ASC`)
    .all(organizationId) as { id: string; title: string }[];

  const isFullAccessAdmin = role === 'owner' || role === 'admin';
  const explicitPermissions = getUserShowPermissions(organizationId, userId);

  if (isFullAccessAdmin) {
    const now = new Date().toISOString();
    const syntheticPerms: UserShowPermission[] = allOrgShows.map((s) => ({
      id: `admin-perm-${userId}-${s.id}`,
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
      allowedShowIds: allOrgShows.map((s) => s.id),
      showPermissions: syntheticPerms,
    };
  }

  const allowedShowIds = explicitPermissions
    .filter((p) => p.canView)
    .map((p) => p.showId);

  return {
    isFullAccessAdmin: false,
    allowedShowIds,
    showPermissions: explicitPermissions,
  };
}

export function listOrganizationUsersWithPermissions(organizationId: string): User[] {
  const db = getDbConnection();
  const rows = db
    .prepare(
      `SELECT u.*, m.role
       FROM organization_members m
       JOIN users u ON u.id = m.user_id
       WHERE m.organization_id = ?
       ORDER BY u.created_at ASC`
    )
    .all(organizationId) as any[];

  return rows.map((u) => {
    const resolved = resolveUserAllowedShows(organizationId, u.id, u.role);
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      jobTitle: u.job_title || 'Produtor',
      status: u.status || 'active',
      loginCode: u.login_code || 'rsplay123',
      role: u.role as OrganizationRole,
      showPermissions: resolved.showPermissions,
      lastLoginAt: u.last_login_at || undefined,
      createdAt: u.created_at,
      updatedAt: u.updated_at,
    };
  });
}

export function createOrganizationUserWithPermissions(
  organizationId: string,
  payload: {
    name: string;
    email: string;
    jobTitle?: string;
    loginCode?: string;
    role?: OrganizationRole;
    allowedShowIds: string[];
    permissions?: {
      canEditEditorial?: boolean;
      canEditScript?: boolean;
      canOperateStudio?: boolean;
      canManageSchedule?: boolean;
      canManageAssets?: boolean;
      canExport?: boolean;
    };
  },
  actorUserId?: string
): User {
  if (!payload.name || payload.name.trim().length < 2) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Nome do usuário deve ter pelo menos 2 caracteres.');
  }
  if (!payload.email || !payload.email.includes('@')) {
    throw new AppError(400, 'VALIDATION_ERROR', 'E-mail de login individual inválido.');
  }

  const db = getDbConnection();
  const now = new Date().toISOString();
  const cleanEmail = payload.email.trim().toLowerCase();

  const existingUser = db
    .prepare(`SELECT * FROM users WHERE LOWER(email) = ?`)
    .get(cleanEmail) as any;

  const userId =
    existingUser?.id || `usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  if (!existingUser) {
    db.prepare(
      `INSERT INTO users (id, email, name, job_title, status, login_code, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'active', ?, ?, ?)`
    ).run(
      userId,
      cleanEmail,
      payload.name.trim(),
      (payload.jobTitle || 'Operador de Programa').trim(),
      (payload.loginCode || 'rsplay123').trim(),
      now,
      now
    );
  } else {
    db.prepare(
      `UPDATE users SET name = ?, job_title = ?, login_code = ?, updated_at = ? WHERE id = ?`
    ).run(
      payload.name.trim(),
      (payload.jobTitle || existingUser.job_title || 'Produtor').trim(),
      (payload.loginCode || existingUser.login_code || 'rsplay123').trim(),
      now,
      userId
    );
  }

  const role: OrganizationRole = payload.role || 'producer';
  db.prepare(
    `INSERT OR REPLACE INTO organization_members (id, organization_id, user_id, role, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(`mem-${organizationId}-${userId}`, organizationId, userId, role, now);

  db.prepare(
    `DELETE FROM user_show_permissions WHERE organization_id = ? AND user_id = ?`
  ).run(organizationId, userId);

  const perms = payload.permissions || {};
  for (const showId of payload.allowedShowIds || []) {
    const showExists = db
      .prepare(`SELECT id FROM shows WHERE id = ? AND organization_id = ?`)
      .get(showId, organizationId);
    if (!showExists) continue;

    db.prepare(
      `INSERT INTO user_show_permissions (
        id, organization_id, user_id, show_id, can_view, can_edit_editorial,
        can_edit_script, can_operate_studio, can_manage_schedule, can_manage_assets,
        can_export, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      `perm-${userId}-${showId}`,
      organizationId,
      userId,
      showId,
      perms.canEditEditorial === false ? 0 : 1,
      perms.canEditScript === false ? 0 : 1,
      perms.canOperateStudio === false ? 0 : 1,
      perms.canManageSchedule ? 1 : 0,
      perms.canManageAssets === false ? 0 : 1,
      perms.canExport === false ? 0 : 1,
      now,
      now
    );
  }

  recordAuditLog(organizationId, actorUserId, 'user_access', userId, 'created_user_login', {
    email: cleanEmail,
    role,
    allowedShowIds: payload.allowedShowIds,
  });

  const allUsers = listOrganizationUsersWithPermissions(organizationId);
  return allUsers.find((u) => u.id === userId)!;
}

export function updateOrganizationUserPermissions(
  organizationId: string,
  targetUserId: string,
  payload: {
    name?: string;
    jobTitle?: string;
    status?: 'active' | 'suspended' | 'invited';
    loginCode?: string;
    role?: OrganizationRole;
    allowedShowIds?: string[];
    permissions?: {
      canEditEditorial?: boolean;
      canEditScript?: boolean;
      canOperateStudio?: boolean;
      canManageSchedule?: boolean;
      canManageAssets?: boolean;
      canExport?: boolean;
    };
  },
  actorUserId?: string
): User {
  const db = getDbConnection();
  const now = new Date().toISOString();

  const existing = db.prepare(`SELECT * FROM users WHERE id = ?`).get(targetUserId) as any;
  if (!existing) {
    throw new AppError(404, 'NOT_FOUND', 'Usuário não encontrado.');
  }

  db.prepare(
    `UPDATE users SET
      name = ?, job_title = ?, status = ?, login_code = ?, updated_at = ?
     WHERE id = ?`
  ).run(
    payload.name !== undefined ? payload.name.trim() : existing.name,
    payload.jobTitle !== undefined ? payload.jobTitle.trim() : existing.job_title,
    payload.status !== undefined ? payload.status : existing.status,
    payload.loginCode !== undefined ? payload.loginCode.trim() : existing.login_code,
    now,
    targetUserId
  );

  if (payload.role) {
    db.prepare(
      `UPDATE organization_members SET role = ? WHERE organization_id = ? AND user_id = ?`
    ).run(payload.role, organizationId, targetUserId);
  }

  if (Array.isArray(payload.allowedShowIds)) {
    db.prepare(
      `DELETE FROM user_show_permissions WHERE organization_id = ? AND user_id = ?`
    ).run(organizationId, targetUserId);

    const perms = payload.permissions || {};
    for (const showId of payload.allowedShowIds) {
      const showExists = db
        .prepare(`SELECT id FROM shows WHERE id = ? AND organization_id = ?`)
        .get(showId, organizationId);
      if (!showExists) continue;

      db.prepare(
        `INSERT INTO user_show_permissions (
          id, organization_id, user_id, show_id, can_view, can_edit_editorial,
          can_edit_script, can_operate_studio, can_manage_schedule, can_manage_assets,
          can_export, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        `perm-${targetUserId}-${showId}`,
        organizationId,
        targetUserId,
        showId,
        perms.canEditEditorial === false ? 0 : 1,
        perms.canEditScript === false ? 0 : 1,
        perms.canOperateStudio === false ? 0 : 1,
        perms.canManageSchedule ? 1 : 0,
        perms.canManageAssets === false ? 0 : 1,
        perms.canExport === false ? 0 : 1,
        now,
        now
      );
    }
  }

  recordAuditLog(
    organizationId,
    actorUserId,
    'user_access',
    targetUserId,
    'updated_permissions',
    {
      role: payload.role,
      allowedShowIds: payload.allowedShowIds,
      status: payload.status,
    }
  );

  const allUsers = listOrganizationUsersWithPermissions(organizationId);
  const found = allUsers.find((u) => u.id === targetUserId);
  if (!found) {
    throw new AppError(404, 'NOT_FOUND', 'Usuário não encontrado na organização.');
  }
  return found;
}

export function deleteOrganizationUser(
  organizationId: string,
  targetUserId: string,
  actorUserId?: string
) {
  if (targetUserId === 'usr-producer-01') {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Não é permitido remover a conta administradora principal da RSPlay TV.'
    );
  }
  const db = getDbConnection();
  db.prepare(
    `DELETE FROM user_show_permissions WHERE organization_id = ? AND user_id = ?`
  ).run(organizationId, targetUserId);
  db.prepare(
    `DELETE FROM organization_members WHERE organization_id = ? AND user_id = ?`
  ).run(organizationId, targetUserId);
  recordAuditLog(organizationId, actorUserId, 'user_access', targetUserId, 'removed_user', {});
}

function mapRowToSubscription(row: any): SaaSSubscription {
  return {
    id: row.id,
    organizationId: row.organization_id,
    showId: row.show_id || undefined,
    showTitle: row.show_title || undefined,
    planId: row.plan_id,
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

function mapRowToInvoice(row: any): BillingInvoice {
  return {
    id: row.id,
    organizationId: row.organization_id,
    subscriptionId: row.subscription_id,
    invoiceNumber: row.invoice_number,
    description: row.description,
    amountCents: Number(row.amount_cents),
    currency: row.currency || 'BRL',
    status: row.status,
    paymentMethod: row.payment_method,
    gatewayTransactionId: row.gateway_transaction_id,
    autoRenewalCycle: Boolean(row.auto_renewal_cycle),
    dueDate: row.due_date,
    paidAt: row.paid_at || undefined,
    createdAt: row.created_at,
  };
}

export function listSaasPlans(): SaaSPlanDefinition[] {
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

export function getActiveSubscription(organizationId: string): SaaSSubscription | undefined {
  const subs = listOrganizationSubscriptions(organizationId);
  return subs.find((s) => s.status === 'active' || s.status === 'trialing') || subs[0];
}

export function listBillingInvoices(organizationId: string): BillingInvoice[] {
  const db = getDbConnection();
  const rows = db
    .prepare(
      `SELECT * FROM billing_invoices WHERE organization_id = ? ORDER BY created_at DESC`
    )
    .all(organizationId) as any[];
  return rows.map(mapRowToInvoice);
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

export function contractOrUpdateSubscription(
  organizationId: string,
  payload: {
    planId: SubscriptionPlanId;
    billingCycle?: 'monthly' | 'annual';
    paymentMethodType?: PaymentMethodType;
    cardLast4?: string;
    cardBrand?: string;
    autoRenew?: boolean;
    showId?: string;
  },
  actorUserId?: string
): {
  subscription: SaaSSubscription;
  invoice: BillingInvoice;
  gatewayEvent: PaymentGatewayEvent;
} {
  const plan = RSPLAY_SAAS_PLANS.find((p) => p.id === payload.planId);
  if (!plan) {
    throw new AppError(400, 'VALIDATION_ERROR', `Plano SaaS inválido: ${payload.planId}`);
  }

  const db = getDbConnection();
  const now = new Date();
  const nowIso = now.toISOString();
  const billingCycle = payload.billingCycle || 'monthly';
  const durationDays = billingCycle === 'annual' ? 365 : 30;
  const periodEndIso = new Date(now.getTime() + durationDays * 24 * 3600 * 1000).toISOString();
  const amountCents =
    billingCycle === 'annual' ? Math.round(plan.monthlyPriceCents * 10) : plan.monthlyPriceCents;

  const paymentMethodType: PaymentMethodType = payload.paymentMethodType || 'credit_card';
  const last4 =
    paymentMethodType === 'pix_automatico'
      ? 'PIX'
      : paymentMethodType === 'boleto_corporativo'
      ? 'BOL'
      : (payload.cardLast4 || '4829').slice(-4);
  const brand =
    paymentMethodType === 'pix_automatico'
      ? 'PIX Automático Banco Central'
      : paymentMethodType === 'boleto_corporativo'
      ? 'Boleto Registrado FEBRABAN'
      : payload.cardBrand || 'Mastercard Corporate';

  const autoRenew = payload.autoRenew !== false;

  const existingSub = getActiveSubscription(organizationId);
  const subId = existingSub?.id || `sub-${Date.now()}`;
  const gatewaySubId =
    existingSub?.gatewaySubscriptionId || `sub_gw_${Math.random().toString(36).slice(2, 10)}`;
  const gatewayCustomerId =
    existingSub?.gatewayCustomerId || `cus_gw_${organizationId.slice(0, 12)}`;

  db.prepare(`
    INSERT OR REPLACE INTO saas_subscriptions (
      id, organization_id, show_id, plan_id, plan_name, billing_cycle,
      amount_cents, currency, status, auto_renew, payment_gateway,
      payment_method_type, payment_method_last4, payment_method_brand,
      gateway_customer_id, gateway_subscription_id, current_period_start,
      current_period_end, last_renewal_at, canceled_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'BRL', 'active', ?, 'RSPlay Pay / Stripe', ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)
  `).run(
    subId,
    organizationId,
    payload.showId || null,
    plan.id,
    plan.name,
    billingCycle,
    amountCents,
    autoRenew ? 1 : 0,
    paymentMethodType,
    last4,
    brand,
    gatewayCustomerId,
    gatewaySubId,
    nowIso,
    periodEndIso,
    nowIso,
    existingSub?.createdAt || nowIso,
    nowIso
  );

  db.prepare(`UPDATE organizations SET plan = ?, updated_at = ? WHERE id = ?`).run(
    plan.id,
    nowIso,
    organizationId
  );

  const invId = `inv-${Date.now()}`;
  const invoiceNumber = `RSP-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const txId = `tx_gw_${Date.now().toString(36)}`;
  const description = `Assinatura ${billingCycle === 'annual' ? 'Anual' : 'Mensal'} — ${plan.name}`;

  db.prepare(`
    INSERT INTO billing_invoices (
      id, organization_id, subscription_id, invoice_number, description,
      amount_cents, currency, status, payment_method, gateway_transaction_id,
      auto_renewal_cycle, due_date, paid_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'BRL', 'paid', ?, ?, ?, ?, ?, ?)
  `).run(
    invId,
    organizationId,
    subId,
    invoiceNumber,
    description,
    amountCents,
    paymentMethodType,
    txId,
    autoRenew ? 1 : 0,
    nowIso,
    nowIso,
    nowIso
  );

  const gevId = `gev-${Date.now()}`;
  const eventPayload = {
    planId: plan.id,
    planName: plan.name,
    invoiceNumber,
    gatewayTransactionId: txId,
    amountBRL: `R$ ${(amountCents / 100).toFixed(2)}`,
    paymentMethodType,
    autoRenew,
  };
  db.prepare(`
    INSERT INTO payment_gateway_events (
      id, organization_id, subscription_id, provider, event_type, status, payload_json, created_at
    ) VALUES (?, ?, ?, 'RSPlay Pay / Stripe', 'customer.subscription.contracted', 'processed', ?, ?)
  `).run(gevId, organizationId, subId, JSON.stringify(eventPayload), nowIso);

  recordAuditLog(organizationId, actorUserId, 'subscription', subId, 'plan_contracted', eventPayload);

  return {
    subscription: getActiveSubscription(organizationId)!,
    invoice: listBillingInvoices(organizationId)[0],
    gatewayEvent: listPaymentGatewayEvents(organizationId)[0],
  };
}

export function toggleSubscriptionAutoRenew(
  organizationId: string,
  subscriptionId: string,
  autoRenew: boolean,
  actorUserId?: string
): SaaSSubscription {
  const db = getDbConnection();
  const row = db
    .prepare(`SELECT * FROM saas_subscriptions WHERE id = ? AND organization_id = ?`)
    .get(subscriptionId, organizationId) as any;

  if (!row) {
    throw new AppError(404, 'NOT_FOUND', 'Assinatura não encontrada.');
  }

  const nowIso = new Date().toISOString();
  db.prepare(
    `UPDATE saas_subscriptions SET auto_renew = ?, updated_at = ? WHERE id = ? AND organization_id = ?`
  ).run(autoRenew ? 1 : 0, nowIso, subscriptionId, organizationId);

  const gevId = `gev-${Date.now()}`;
  db.prepare(`
    INSERT INTO payment_gateway_events (
      id, organization_id, subscription_id, provider, event_type, status, payload_json, created_at
    ) VALUES (?, ?, ?, 'RSPlay Pay / Stripe', ?, 'processed', ?, ?)
  `).run(
    gevId,
    organizationId,
    subscriptionId,
    autoRenew ? 'subscription.auto_renew_enabled' : 'subscription.auto_renew_disabled',
    JSON.stringify({ subscriptionId, autoRenew }),
    nowIso
  );

  recordAuditLog(organizationId, actorUserId, 'subscription', subscriptionId, 'toggled_auto_renew', {
    autoRenew,
  });

  return getActiveSubscription(organizationId)!;
}

export function processSubscriptionAutoRenewal(
  organizationId: string,
  subscriptionId: string,
  actorUserId?: string
): {
  subscription: SaaSSubscription;
  invoice: BillingInvoice;
  gatewayEvent: PaymentGatewayEvent;
} {
  const db = getDbConnection();
  const row = db
    .prepare(`SELECT * FROM saas_subscriptions WHERE id = ? AND organization_id = ?`)
    .get(subscriptionId, organizationId) as any;

  if (!row) {
    throw new AppError(404, 'NOT_FOUND', 'Assinatura não encontrada para renovação.');
  }

  const sub = mapRowToSubscription(row);
  if (!sub.autoRenew) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'A renovação automática está desativada para esta assinatura. Ative a renovação automática antes de processar o ciclo.'
    );
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const baseEnd = new Date(sub.currentPeriodEnd);
  const nextStart = Number.isNaN(baseEnd.getTime()) ? now : baseEnd;
  const nextEnd = new Date(nextStart.getTime() + 30 * 24 * 3600 * 1000);

  db.prepare(
    `UPDATE saas_subscriptions SET
      status = 'active',
      current_period_start = ?,
      current_period_end = ?,
      last_renewal_at = ?,
      updated_at = ?
     WHERE id = ? AND organization_id = ?`
  ).run(
    nextStart.toISOString(),
    nextEnd.toISOString(),
    nowIso,
    nowIso,
    subscriptionId,
    organizationId
  );

  const invId = `inv-${Date.now()}`;
  const invoiceNumber = `RSP-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const txId = `tx_autorenew_${Date.now().toString(36)}`;
  const description = `Renovação Automática Mensal — ${sub.planName} (${sub.paymentMethodBrand})`;

  db.prepare(`
    INSERT INTO billing_invoices (
      id, organization_id, subscription_id, invoice_number, description,
      amount_cents, currency, status, payment_method, gateway_transaction_id,
      auto_renewal_cycle, due_date, paid_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'BRL', 'paid', ?, ?, 1, ?, ?, ?)
  `).run(
    invId,
    organizationId,
    subscriptionId,
    invoiceNumber,
    description,
    sub.amountCents,
    sub.paymentMethodType,
    txId,
    nowIso,
    nowIso,
    nowIso
  );

  const gevId = `gev-${Date.now()}`;
  const eventPayload = {
    invoiceNumber,
    gatewayTransactionId: txId,
    amountBRL: `R$ ${(sub.amountCents / 100).toFixed(2)}`,
    nextPeriodEnd: nextEnd.toISOString().slice(0, 10),
    autoRenew: true,
  };

  db.prepare(`
    INSERT INTO payment_gateway_events (
      id, organization_id, subscription_id, provider, event_type, status, payload_json, created_at
    ) VALUES (?, ?, ?, 'RSPlay Pay / Stripe', 'invoice.auto_renewal_succeeded', 'processed', ?, ?)
  `).run(gevId, organizationId, subscriptionId, JSON.stringify(eventPayload), nowIso);

  recordAuditLog(
    organizationId,
    actorUserId,
    'subscription',
    subscriptionId,
    'auto_renewal_processed',
    eventPayload
  );

  return {
    subscription: getActiveSubscription(organizationId)!,
    invoice: listBillingInvoices(organizationId)[0],
    gatewayEvent: listPaymentGatewayEvents(organizationId)[0],
  };
}

export function getAdminReportSummary(organizationId: string): AdminReportSummary {
  const subs = listOrganizationSubscriptions(organizationId);
  const invoices = listBillingInvoices(organizationId);
  const shows = listShows(organizationId);
  const episodes = listEpisodes(organizationId);
  const schedule = listScheduleEvents(organizationId);
  const users = listOrganizationUsersWithPermissions(organizationId);

  const activeSubs = subs.filter((s) => s.status === 'active' || s.status === 'trialing');
  const mrrCents = activeSubs.reduce(
    (acc, s) =>
      acc + (s.billingCycle === 'annual' ? Math.round(s.amountCents / 12) : s.amountCents),
    0
  );
  const autoRenewEnabledCount = activeSubs.filter((s) => s.autoRenew).length;
  const paidInvoicesTotalCents = invoices
    .filter((i) => i.status === 'paid')
    .reduce((acc, i) => acc + i.amountCents, 0);
  const pendingInvoicesTotalCents = invoices
    .filter((i) => i.status === 'open' || i.status === 'failed')
    .reduce((acc, i) => acc + i.amountCents, 0);

  const showsReport = shows.map((sh) => {
    const showEps = episodes.filter((e) => e.showId === sh.id);
    const publishedOrReadyCount = showEps.filter(
      (e) =>
        e.status === 'ready' ||
        e.status === 'recorded' ||
        e.status === 'editing' ||
        e.status === 'published'
    ).length;
    const totalPlannedMinutes = showEps.reduce(
      (acc, e) => acc + (Number(e.targetDurationMin) || 0),
      0
    );
    const scheduledSessionsCount = schedule.filter((ev) => ev.showId === sh.id).length;
    const authorizedUsersCount = users.filter(
      (u) =>
        u.role === 'owner' ||
        u.role === 'admin' ||
        (u.showPermissions || []).some((p) => p.showId === sh.id && p.canView)
    ).length;

    return {
      showId: sh.id,
      showTitle: sh.title,
      format: sh.format,
      host: sh.host,
      episodesCount: showEps.length,
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
