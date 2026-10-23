/**
 * Auth & Authorization Domain Types — Strict Internal Types
 */

import type {
  User,
  Organization,
  OrganizationRole,
  PlatformRole,
  UserShowPermission,
  AuthSession,
  OrganizationMembership,
  UserAccountStatus,
} from '../contracts';

export type {
  User,
  Organization,
  OrganizationRole,
  PlatformRole,
  UserShowPermission,
  AuthSession,
  OrganizationMembership,
  UserAccountStatus,
};

// ============================================
// STRICT VERSIONS
// ============================================

export interface SessionTokenPayload {
  userId: string;
  organizationId: string;
  role: OrganizationRole;
  platformRole: PlatformRole;
  allowedShowIds: string[];
  iat: number;
  exp: number;
  jti: string;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenId: string;
  iat: number;
  exp: number;
}

export interface LoginCredentials {
  emailOrUserId: string;
  organizationId: string;
  loginCode: string;
}

export interface LoginResult {
  session: AuthSession;
  refreshToken: string;
  expiresAt: string;
}

export interface SwitchOrganizationInput {
  organizationId: string;
}

export interface SwitchOrganizationResult {
  session: AuthSession;
  refreshToken: string;
  expiresAt: string;
}

export type ShowPermissionKey =
  | 'canView'
  | 'canEditEditorial'
  | 'canEditScript'
  | 'canOperateStudio'
  | 'canManageSchedule'
  | 'canManageAssets'
  | 'canExport';

export interface ShowPermissionSet {
  showId: string;
  showTitle: string;
  permissions: Record<ShowPermissionKey, boolean>;
}

export interface UserPermissionSummary {
  userId: string;
  organizationId: string;
  role: OrganizationRole;
  platformRole: PlatformRole;
  showPermissions: ShowPermissionSet[];
  allowedShowIds: string[];
  isFullAccessAdmin: boolean;
  isPlatformAdmin: boolean;
}

export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  requiredPermission?: ShowPermissionKey;
  userRole: OrganizationRole;
  userShowPermissions: UserShowPermission[];
}

export interface OrganizationUserInvite {
  email: string;
  role: OrganizationRole;
  showPermissions: Partial<Record<ShowPermissionKey, boolean>>;
  showIds: string[];
  invitedBy: string;
}

export interface OrganizationUserCreate {
  email: string;
  name: string;
  role: OrganizationRole;
  showPermissions: Record<string, Partial<Record<ShowPermissionKey, boolean>>>;
  jobTitle?: string;
}

export interface OrganizationUserUpdate {
  role?: OrganizationRole;
  status?: UserAccountStatus;
  showPermissions?: Record<string, Partial<Record<ShowPermissionKey, boolean>>>;
  jobTitle?: string;
}

export interface ApiKey {
  id: string;
  organizationId: string;
  name: string;
  prefix: string;
  hashedKey: string;
  permissions: ApiKeyPermission[];
  lastUsedAt?: string;
  expiresAt?: string;
  createdAt: string;
  createdBy: string;
  revokedAt?: string;
}

export type ApiKeyPermission =
  | 'episodes:read'
  | 'episodes:write'
  | 'shows:read'
  | 'shows:write'
  | 'guests:read'
  | 'guests:write'
  | 'library:read'
  | 'library:write'
  | 'schedule:read'
  | 'schedule:write'
  | 'billing:read'
  | 'admin:read'
  | 'ai:generate';

// ============================================
// VIEW MODELS
// ============================================

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  session: AuthSession | null;
  permissions: UserPermissionSummary | null;
  error?: string;
}

export interface LoginFormData {
  emailOrUserId: string;
  organizationId: string;
  loginCode: string;
  rememberMe?: boolean;
}

export interface OrganizationSwitcherOption {
  id: string;
  name: string;
  slug: string;
  role: OrganizationRole;
  plan: string;
  showCount: number;
  isCurrent: boolean;
}