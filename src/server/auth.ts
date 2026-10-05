import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { AuthSession, OrganizationRole, UserShowPermission } from '../domain/contracts';
import { AppError } from '../domain/validation';
import {
  getEffectiveAllowedShowIds,
  getUserMemberships,
  listOrganizationSubscriptions,
  listUsersAndOrganizations,
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

function signSessionPayload(payload: { userId: string; organizationId: string }): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto
    .createHmac('sha256', INTERNAL_SESSION_KEY)
    .update(data)
    .digest('base64url');
  return `tmv2.${data}.${sig}`;
}

export function verifySessionToken(
  token: string
): { userId: string; organizationId: string } | null {
  if (!INTERNAL_SESSION_KEY || !token || !token.startsWith('tmv2.')) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [, data, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', INTERNAL_SESSION_KEY)
    .update(data)
    .digest('base64url');
  if (sig !== expectedSig) return null;
  try {
    const parsed = JSON.parse(Buffer.from(data, 'base64url').toString('utf-8'));
    if (typeof parsed.userId === 'string' && typeof parsed.organizationId === 'string') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export async function buildAuthSession(userId: string, organizationId?: string): Promise<AuthSession> {
  if (!INTERNAL_SESSION_KEY) throw new AppError(500, 'CONFIGURATION_ERROR', 'INTERNAL_SESSION_KEY não configurada.');
  const { users } = await listUsersAndOrganizations();
  const user = users.find((u) => u.id === userId);
  if (!user) {
    throw new AppError(401, 'UNAUTHORIZED', 'Usuário não encontrado na base de autenticação.');
  }

  if (user.status === 'suspended') {
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

  const token = signSessionPayload({ userId: user.id, organizationId: organization.id });

  return {
    token,
    user: {
      ...user,
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
  const { users } = await listUsersAndOrganizations();
  const clean = (identifier || '').trim().toLowerCase();
  const matchedUser = users.find(
    (u) => u.id.toLowerCase() === clean || u.email.toLowerCase() === clean
  );

  if (!matchedUser) {
    incrementMetric('authFailuresTotal');
    throw new AppError(401, 'UNAUTHORIZED', 'Credenciais de login de programa inválidas.');
  }

  if (
    loginCode &&
    loginCode.trim() !== '' &&
    matchedUser.loginCode &&
    loginCode.trim() !== matchedUser.loginCode
  ) {
    incrementMetric('authFailuresTotal');
    throw new AppError(
      401,
      'UNAUTHORIZED',
      'Código de acesso / senha incorreto para este login de programa.'
    );
  }

  return await buildAuthSession(matchedUser.id, organizationId);
}

/**
 * Extracts and validates the authenticated context from request headers.
 * - If Authorization Bearer token is present, strictly validates signature, membership, and program permissions.
 * - If X-Organization-Id header overrides context, strictly verifies membership in that org.
 */
export async function resolveRequestAuthContext(req: Request): AuthenticatedContext {
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
    const ctx = resolveRequestAuthContext(req);
    (req as any).auth = ctx;
    next();
  } catch (err) {
    next(err);
  }
}

export async function await getAuthContext(req: Request): AuthenticatedContext {
  if ((req as any).auth) {
    return (req as any).auth as AuthenticatedContext;
  }
  return resolveRequestAuthContext(req);
}
