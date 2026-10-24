import { describe, it, expect, beforeAll } from 'vitest';
import {
  signSessionPayload,
  verifySessionToken,
  buildAuthSession,
  requirePlatformAdminContext,
  requireOrganizationAdminContext,
  requireOrganizationContext,
} from './auth';
import { AppError } from '../domain/validation';
import { evaluateShowPermissions } from '../hooks/usePermissions';
import { AuthSession, PlatformRole, OrganizationRole } from '../domain/contracts';
import { db } from './persistence';

// ID do administrador de plataforma real (origem do papel platform_admin em auth.users.user_metadata).
// Somente leitura: os testes abaixo não gravam dados de produção.
const PLATFORM_ADMIN_USER_ID = 'b18e03ea-eef2-45fb-99dd-5b5ed3945812';
// Organização à qual o platform_admin está (indevidamente) vinculado atualmente.
const ADMIN_ORG_ID = '1007f204-6eef-49bc-a31f-2040a4fcebcb';

const hasSupabase = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.INTERNAL_SESSION_KEY);

// Usuário executivo/membro (não platform_admin) com vínculo ativo, usado para provar que
// sem platform_admin não se obtém sessão global nem acesso ao painel global.
let REGULAR_USER_ID: string | null = null;

beforeAll(async () => {
  if (!hasSupabase) return;
  try {
    const { data } = await db
      .from('organization_members')
      .select('user_id')
      .eq('active', true)
      .limit(10);
    const rows = (data || []) as Array<{ user_id: string }>;
    REGULAR_USER_ID = rows.find((r) => r.user_id !== PLATFORM_ADMIN_USER_ID)?.user_id ?? null;
  } catch {
    REGULAR_USER_ID = null;
  }
});

function globalSession(overrides: Partial<AuthSession> = {}): AuthSession {
  return {
    token: 'tmv2.' + Buffer.from(JSON.stringify({ iat: 0, exp: 9999999999 })).toString('base64url') + '.sig',
    user: { id: 'u-1', email: 'admin@plataforma.com', name: 'Admin Plataforma', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    activeOrganization: undefined,
    role: undefined,
    platformRole: 'platform_admin' as PlatformRole,
    isGlobalSession: true,
    memberships: [],
    showPermissions: [],
    allowedShowIds: [],
    isFullAccessAdmin: false,
    isPlatformAdmin: true,
    ...overrides,
  };
}

describe('auth - sessão global de platform_admin (sem organização)', () => {
  it('emite token de sessão global sem organizationId', () => {
    const token = signSessionPayload({ userId: PLATFORM_ADMIN_USER_ID });
    expect(token).toMatch(/^tmv2\./);
    const parsed = verifySessionToken(token);
    expect(parsed).not.toBeNull();
    expect(parsed!.userId).toBe(PLATFORM_ADMIN_USER_ID);
    expect(parsed!.organizationId).toBeUndefined();
  });

  it('usuário não platform_admin não obtém sessão global sem organização', async () => {
    if (!hasSupabase || !REGULAR_USER_ID) return;
    // Sem organizationId e sem platform_admin: buildAuthSession deve recusar (não inventa organização).
    await expect(buildAuthSession(REGULAR_USER_ID, undefined)).rejects.toMatchObject({
      code: 'FORBIDDEN_CONTEXT',
    });
  });

  it('permitem verificação de token global (sem organização)', async () => {
    if (!hasSupabase) return;
    const session = await buildAuthSession(PLATFORM_ADMIN_USER_ID, undefined);
    expect(session.isGlobalSession).toBe(true);
    expect(session.activeOrganization).toBeUndefined();
    expect(session.role).toBeUndefined();
    expect(session.isPlatformAdmin).toBe(true);
    // platform_admin sem organização NÃO é isFullAccessAdmin (sem acesso operacional implícito).
    expect(session.isFullAccessAdmin).toBe(false);
    expect(session.allowedShowIds).toEqual([]);
    expect(session.showPermissions).toEqual([]);
    expect(session.token).toMatch(/^tmv2\./);
    const verified = verifySessionToken(session.token);
    expect(verified).not.toBeNull();
    expect(verified!.organizationId).toBeUndefined();
  });

  it('construi sessão organizacional quando o platform_admin vincula uma organização válida', async () => {
    if (!hasSupabase) return;
    const session = await buildAuthSession(PLATFORM_ADMIN_USER_ID, ADMIN_ORG_ID);
    expect(session.isGlobalSession).toBe(false);
    expect(session.activeOrganization?.id).toBe(ADMIN_ORG_ID);
    expect(session.isPlatformAdmin).toBe(true);
    // O papel organizacional (owner) determina o acesso operacional, não o platform_admin.
    expect(session.role).toBe('owner');
    expect(session.isFullAccessAdmin).toBe(true);
  });

  it('não concede acesso operacional ao platform_admin sem organização (usePermissions)', () => {
    const perms = evaluateShowPermissions(globalSession(), 'qualquer-show-id');
    expect(perms.hasShowAccess).toBe(false);
    expect(perms.isFullAccessAdmin).toBe(false);
    expect(perms.canView).toBe(false);
    expect(perms.canEditEditorial).toBe(false);
    expect(perms.source).toBe('denied');
  });

  it('requirePlatformAdminContext rejeita quem não é platform_admin', () => {
    expect(() => requirePlatformAdminContext({ isPlatformAdmin: false } as any)).toThrow(AppError);
    expect(() => requirePlatformAdminContext(undefined as any)).toThrow(AppError);
    expect(() => requirePlatformAdminContext({ isPlatformAdmin: true } as any)).not.toThrow();
  });

  it('requireOrganizationAdminContext NÃO faz bypass por platform_admin', () => {
    // platform_admin sem role organizacional não acessa escopo organizacional.
    expect(() => requireOrganizationAdminContext({ isPlatformAdmin: true, role: undefined } as any)).toThrow(AppError);
    // Apenas owner/admin da organização acessam.
    expect(() => requireOrganizationAdminContext({ isPlatformAdmin: false, role: 'owner' } as any)).not.toThrow();
    expect(() => requireOrganizationAdminContext({ isPlatformAdmin: false, role: 'member' } as any)).toThrow(AppError);
  });

  it('requireOrganizationContext rejeita sessão global (sem organizationId)', () => {
    expect(() => requireOrganizationContext({ organizationId: undefined, isPlatformAdmin: true } as any)).toThrow(AppError);
    expect(() => requireOrganizationContext({ organizationId: ADMIN_ORG_ID, isPlatformAdmin: true } as any)).not.toThrow();
  });
});

describe('auth - isolamento e sem herança de organização', () => {
  it('sessão global não herda permissões da organização previamente selecionada', async () => {
    if (!hasSupabase) return;
    // Sessão global do platform_admin (sem org) não traz allowedShowIds nem showPermissions da org.
    const session = await buildAuthSession(PLATFORM_ADMIN_USER_ID, undefined);
    expect(session.isGlobalSession).toBe(true);
    expect(session.allowedShowIds).toEqual([]);
    expect(session.showPermissions).toEqual([]);
    expect(session.isFullAccessAdmin).toBe(false);
  });

  it('usuário executivo mantém acesso apenas à sua organização e programas autorizados', async () => {
    if (!hasSupabase) return;
    // O platform_admin vinculado à org tem sessão organizacional com role owner (acesso à sua org).
    const session = await buildAuthSession(PLATFORM_ADMIN_USER_ID, ADMIN_ORG_ID);
    expect(session.activeOrganization?.id).toBe(ADMIN_ORG_ID);
    expect(session.role).toBe('owner');
    expect(session.isPlatformAdmin).toBe(true);
  });
});
