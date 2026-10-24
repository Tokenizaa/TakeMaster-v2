import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { AuthSession, OrganizationRole, UserShowPermission, PlatformRole } from '../domain/contracts';
import { AppError } from '../domain/validation';
import {
  getAuthUserById,
  getAuthUserByEmail,
  getEffectiveAllowedShowIds,
  getUserMemberships,
  listOrganizationSubscriptions,
  verifyUserOrganizationAccess,
  createPasswordResetToken,
  validatePasswordResetToken,
  claimPasswordResetToken,
  completePasswordResetTokenClaim,
  releasePasswordResetTokenClaim,
  revokeToken,
  isTokenRevoked,
  isUserTokenRevoked,
  revokeAllUserTokens,
  sendPasswordResetEmail,
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
  platformRole: PlatformRole;
  isFullAccessAdmin: boolean;
  isPlatformAdmin: boolean;
  allowedShowIds: string[];
  showPermissions: UserShowPermission[];
}

const INTERNAL_SESSION_KEY = process.env.INTERNAL_SESSION_KEY || '';
const INTERNAL_SESSION_KEY_MIN_BYTES = 32;
const hasStrongInternalSessionKey =
  Buffer.byteLength(INTERNAL_SESSION_KEY, 'utf8') >= INTERNAL_SESSION_KEY_MIN_BYTES;
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || '';
export const authClient = SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } }) : null;

// Admin client for server-side admin operations (requires SERVICE_ROLE_KEY)
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
export const adminAuthClient = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } }) : null;

function getAdminAuthClient() {
  if (!adminAuthClient) {
    throw new AppError(500, 'CONFIGURATION_ERROR', 'Supabase admin client não configurado. Configure SUPABASE_SERVICE_ROLE_KEY.');
  }
  return adminAuthClient;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function signSessionPayload(payload: { userId: string; organizationId: string }): string {
  const now = Math.floor(Date.now() / 1000);
  const data = Buffer.from(JSON.stringify({ ...payload, iat: now, exp: now + 60 * 60 * 12 })).toString('base64url');
  const sig = crypto
    .createHmac('sha256', INTERNAL_SESSION_KEY)
    .update(data)
    .digest('base64url');
  return `tmv2.${data}.${sig}`;
}

export function verifySessionToken(
  token: string
): { userId: string; organizationId: string; iat: number; exp: number } | null {
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
    if (typeof parsed.userId === 'string' && typeof parsed.organizationId === 'string' && typeof parsed.exp === 'number' && typeof parsed.iat === 'number' && parsed.exp > Math.floor(Date.now() / 1000)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export async function verifySessionTokenWithRevocation(
  token: string
): Promise<{ userId: string; organizationId: string; iat: number; exp: number } | null> {
  const verified = verifySessionToken(token);
  if (!verified) return null;
  
  // Check individual token revocation
  const revoked = await isTokenRevoked(token);
  if (revoked) return null;
  
  // Check user-level token revocation (revokeAllUserTokens)
  const userRevoked = await isUserTokenRevoked(verified.userId, verified.iat);
  if (userRevoked) return null;
  
  return verified;
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

  const platformRole = (user.user_metadata?.platformRole as PlatformRole) || 'none';
  const isPlatformAdmin = platformRole === 'platform_admin';

  const userObj = {
    id: user.id,
    email: user.email || '',
    name: user.user_metadata?.name || user.user_metadata?.full_name || user.email || '',
    jobTitle: user.user_metadata?.jobTitle,
    status: user.banned_until ? ('suspended' as const) : ('active' as const),
    loginCode: undefined,
    avatarUrl: user.user_metadata?.avatarUrl,
    role: undefined,
    platformRole,
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
    platformRole,
    memberships,
    showPermissions: permissions,
    allowedShowIds,
    isFullAccessAdmin,
    isPlatformAdmin,
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
 * - Checks for token revocation (server-side logout).
 */
export async function resolveRequestAuthContext(req: Request): Promise<AuthenticatedContext> {
  const authHeader = req.headers.authorization;
  const headerOrgId = req.headers['x-organization-id'] as string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const rawToken = authHeader.slice('Bearer '.length).trim();
    const verified = await verifySessionTokenWithRevocation(rawToken);
    if (!verified) {
      incrementMetric('authFailuresTotal');
      throw new AppError(401, 'UNAUTHORIZED', 'Token de sessão inválido, expirado ou revogado.');
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
      platformRole: session.platformRole,
      isFullAccessAdmin: session.isFullAccessAdmin,
      isPlatformAdmin: session.isPlatformAdmin,
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

/**
 * Request password reset - creates a secure token and sends email.
 * Does not reveal if email exists (always returns success).
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) return; // Silent failure - don't reveal if email exists

  const user = await getAuthUserByEmail(cleanEmail);
  if (!user) return; // Silent failure - don't reveal if email exists

  // Generate secure random token (32 bytes = 256 bits)
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  // Token expires in 1 hour
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  await createPasswordResetToken(user.id, cleanEmail, tokenHash, expiresAt);

  // Send reset email (using Supabase's built-in email or custom SMTP)
  await sendPasswordResetEmail(cleanEmail, rawToken);
}

/**
 * Validate password reset token WITHOUT consuming it.
 * Returns user ID if valid, null otherwise.
 */
export async function validatePasswordResetTokenOnly(token: string): Promise<string | null> {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const result = await validatePasswordResetToken(tokenHash);
  if (!result) return null;

  // Check if token is expired or already used
  if (result.expires_at < new Date().toISOString() || result.used_at) {
    return null;
  }

  return result.user_id;
}

/**
 * Atomically consume password reset token and update password.
 * Uses a transaction-like approach: marks token as used, updates password, revokes all sessions.
 * Returns true on success, false on failure.
 */
export async function resetPassword(token: string, newPassword: string): Promise<boolean> {
  const adminClient = getAdminAuthClient();
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const claimId = crypto.randomUUID();
  const result = await claimPasswordResetToken(tokenHash, claimId);
  if (!result) return false;
  let passwordUpdated = false;
  try {
    const { error } = await adminClient.auth.admin.updateUserById(result.user_id, { password: newPassword });
    if (error) throw new AppError(500, 'CONFIGURATION_ERROR', 'Não foi possível atualizar a senha. Tente novamente.');
    passwordUpdated = true;

    await revokeAllUserTokens(result.user_id, 'password_reset');
    const consumed = await completePasswordResetTokenClaim(tokenHash, claimId);
    if (!consumed) {
      throw new AppError(500, 'INTERNAL_ERROR', 'A senha foi atualizada, mas não foi possível concluir o token de recuperação. Solicite suporte.');
    }
    return true;
  } catch (error) {
    if (!passwordUpdated) {
      try { await releasePasswordResetTokenClaim(tokenHash, claimId); } catch { /* lease expires automatically */ }
    }
    if (error instanceof AppError) throw error;
    throw new AppError(500, 'INTERNAL_ERROR', 'Erro ao redefinir senha. Tente novamente.');
  }
}

/**
 * Server-side logout - revokes the current token.
 */
export async function logout(token: string): Promise<void> {
  const verified = verifySessionToken(token);
  if (!verified) return; // Token already invalid, nothing to do

  // Calculate token expiry from exp claim
  const expiresAt = new Date(verified.exp * 1000).toISOString();

  // Hash the token for storage
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  await revokeToken(tokenHash, verified.userId, verified.organizationId, expiresAt);
}

