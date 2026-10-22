import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { AuthSession, OrganizationRole, UserShowPermission } from '../domain/contracts';
import { AppError } from '../domain/validation';
import {
  getAuthUserById,
  getEffectiveAllowedShowIds,
  getUserMemberships,
  listOrganizationSubscriptions,
  verifyUserOrganizationAccess,
} from './persistence';
import { incrementMetric } from './logger';

export interface AuthenticatedContext {
  token: string;
  userId: string;
  userEmail: string;
  userName: string;
  organizationId: string;
  organizationName: string;
  role: OrganizationRole;
  isFullAccessAdmin: boolean;
  allowedShowIds: string[];
  showPermissions: UserShowPermission[];
}

const INTERNAL_SESSION_KEY = process.env.INTERNAL_SESSION_KEY || '';
const INTERNAL_SESSION_KEY_MIN_BYTES = 32;
const hasStrongInternalSessionKey =
  Buffer.byteLength(INTERNAL_SESSION_KEY, 'utf8') >= INTERNAL_SESSION_KEY_MIN_BYTES;
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || '';
const authClient = SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } }) : null;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function signSessionPayload(payload: { userId: string; organizationId: string }): string {
  const data = Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 12 })).toString('base64url');
  const sig = crypto
    .createHmac('sha256', INTERNAL_SESSION_KEY)
    .update(data)
    .digest('base64url');
  return `tmv2.${data}.${sig}`;
}

export function verifySessionToken(
  token: string
): { userId: string; organizationId: string } | null {
  if (!hasStrongInternalSessionKey || !token || !token.startsWith('tmv2.')) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [, data, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', INTERNAL_SESSION_KEY)
    .update(data)
    .digest('base64url');
  const providedSignatureHash = crypto.createHash('sha256').update(sig).digest();
  const expectedSignatureHash = crypto.createHash('sha256').update(expectedSig).digest();
  if (!crypto.timingSafeEqual(providedSignatureHash, expectedSignatureHash)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(data, 'base64url').toString('utf-8'));
    if (typeof parsed.userId === 'string' && typeof parsed.organizationId === 'string' && typeof parsed.exp === 'number' && parsed.exp > Math.floor(Date.now() / 1000)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export async function buildAuthSession(userId: string, organizationId?: string): Promise<AuthSession> {
  if (!hasStrongInternalSessionKey) {
    throw new AppError(
      500,
      'CONFIGURATION_ERROR',
      'INTERNAL_SESSION_KEY ausente ou fraca: configure uma chave aleatória com pelo menos 32 bytes.'
    );
  }

  // Admin auth lookup requires the service-role client (see getAuthUserById), not the publishable client.
  const user = await getAuthUserById(userId);
  if (!user) {
    throw new AppError(401, 'UNAUTHORIZED', 'Usuário não encontrado na base de autenticação.');
  }

  if (user.banned_until) {
    throw new AppError(
      403,
      'FORBIDDEN_CONTEXT',
      'Este login de programa está temporariamente suspenso pelo administrador RSPlay TV.'
    );
  }

  const memberships = await getUserMemberships(user.id);
  if (memberships.length === 0) {
    throw new AppError(
      403,
      'FORBIDDEN_CONTEXT',
      'Usuário não pertence a nenhuma organização ativa.'
    );
  }

  const targetOrgId =
    organizationId && memberships.some((m) => m.organizationId === organizationId)
      ? organizationId
      : organizationId || memberships[0].organizationId;

  const { organization, role } = await verifyUserOrganizationAccess(user.id, targetOrgId);
  const { isFullAccessAdmin, allowedShowIds, permissions } = await getEffectiveAllowedShowIds(
    organization.id,
    user.id,
    role
  );

  const subscriptions = await listOrganizationSubscriptions(organization.id);
  const activeSubscription = subscriptions[0];

  const userObj = {
    id: user.id,
    email: user.email || '',
    name: user.user_metadata?.name || user.user_metadata?.full_name || user.email || '',
    jobTitle: user.user_metadata?.jobTitle,
    status: user.banned_until ? ('suspended' as const) : ('active' as const),
    loginCode: undefined,
    avatarUrl: user.user_metadata?.avatarUrl,
    role: undefined,
    showPermissions: permissions,
    createdAt: user.created_at,
    updatedAt: user.updated_at || user.created_at,
  };

  const token = signSessionPayload({ userId: user.id, organizationId: organization.id });

  return {
    token,
    user: {
      ...userObj,
      role,
      showPermissions: permissions,
    },
    activeOrganization: organization,
    role,
    memberships,
    showPermissions: permissions,
    allowedShowIds,
    isFullAccessAdmin,
    activeSubscription,
  };
}

export async function loginWithEmailOrUserId(
  identifier: string,
  organizationId?: string,
  loginCode?: string
): Promise<AuthSession> {
  const clean = (identifier || '').trim().toLowerCase();
  if (!clean) {
    incrementMetric('authFailuresTotal');
    throw new AppError(401, 'UNAUTHORIZED', 'Email ou ID de usuário é obrigatório.');
  }

  if (!authClient) {
    throw new AppError(500, 'CONFIGURATION_ERROR', 'Supabase auth client não configurado.');
  }

  if (!loginCode || !loginCode.trim()) {
    incrementMetric('authFailuresTotal');
    throw new AppError(401, 'UNAUTHORIZED', 'Código de acesso / senha é obrigatório.');
  }

  let email: string;

  if (clean.includes('@')) {
    email = clean;
  } else {
    // auth-js throws on non-UUID input instead of returning an error, so shape-check first.
    if (!UUID_RE.test(clean)) {
      incrementMetric('authFailuresTotal');
      throw new AppError(401, 'UNAUTHORIZED', 'Credenciais de login de programa inválidas.');
    }
    const user = await getAuthUserById(clean);
    if (!user?.email) {
      incrementMetric('authFailuresTotal');
      throw new AppError(401, 'UNAUTHORIZED', 'Credenciais de login de programa inválidas.');
    }
    email = user.email;
  }

  const authResult = await authClient.auth.signInWithPassword({
    email,
    password: loginCode.trim(),
  });
  if (authResult.error || !authResult.data.user) {
    incrementMetric('authFailuresTotal');
    throw new AppError(401, 'UNAUTHORIZED', 'Código de acesso / senha incorreto.');
  }

  return await buildAuthSession(authResult.data.user.id, organizationId);
}

/**
 * Extracts and validates the authenticated context from request headers.
 * - If Authorization Bearer token is present, strictly validates signature, membership, and program permissions.
 * - If X-Organization-Id header overrides context, strictly verifies membership in that org.
 */
export async function resolveRequestAuthContext(req: Request): Promise<AuthenticatedContext> {
  const authHeader = req.headers.authorization;
  const headerOrgId = req.headers['x-organization-id'] as string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const rawToken = authHeader.slice('Bearer '.length).trim();
    const verified = verifySessionToken(rawToken);
    if (!verified) {
      incrementMetric('authFailuresTotal');
      throw new AppError(401, 'UNAUTHORIZED', 'Token de sessão inválido ou expirado.');
    }

    const effectiveOrgId = headerOrgId || verified.organizationId;
    const session = await buildAuthSession(verified.userId, effectiveOrgId);
    return {
      token: session.token,
      userId: session.user.id,
      userEmail: session.user.email,
      userName: session.user.name,
      organizationId: session.activeOrganization.id,
      organizationName: session.activeOrganization.name,
      role: session.role,
      isFullAccessAdmin: session.isFullAccessAdmin,
      allowedShowIds: session.allowedShowIds,
      showPermissions: session.showPermissions,
    };
  }

  incrementMetric('authFailuresTotal');
  throw new AppError(401, 'UNAUTHORIZED', 'Autenticação obrigatória: cabeçalho Authorization Bearer ausente.');
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const ctx = await resolveRequestAuthContext(req);
    (req as any).auth = ctx;
    next();
  } catch (err) {
    next(err);
  }
}

export async function requireStrictBearerAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      incrementMetric('authFailuresTotal');
      throw new AppError(
        401,
        'UNAUTHORIZED',
        'Autenticação obrigatória: cabeçalho Authorization Bearer ausente.'
      );
    }
    const ctx = await resolveRequestAuthContext(req);
    (req as any).auth = ctx;
    next();
  } catch (err) {
    next(err);
  }
}

export async function getAuthContext(req: Request): Promise<AuthenticatedContext> {
  if ((req as any).auth) {
    return (req as any).auth as AuthenticatedContext;
  }
  return resolveRequestAuthContext(req);
}
