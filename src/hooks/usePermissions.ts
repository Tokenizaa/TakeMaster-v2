import { useMemo, useCallback } from 'react';
import {
  AuthSession,
  Episode,
  OrganizationRole,
  Show,
  UserShowPermission,
} from '../domain/contracts';

export type NormalizedPermissionRole = 'admin' | 'editor' | 'viewer';

export type ShowPermissionCapability =
  | 'canView'
  | 'canEditEditorial'
  | 'canEditScript'
  | 'canOperateStudio'
  | 'canManageSchedule'
  | 'canManageAssets'
  | 'canExport';

export interface EvaluatedShowPermissions {
  showId: string | null;
  hasShowAccess: boolean;
  isFullAccessAdmin: boolean;
  role: NormalizedPermissionRole;
  canView: boolean;
  canEditEditorial: boolean;
  canEditScript: boolean;
  canOperateStudio: boolean;
  canManageSchedule: boolean;
  canManageAssets: boolean;
  canExport: boolean;
  source: 'admin_master' | 'explicit_show_permission' | 'denied';
  deniedReason?: string;
}

export interface UsePermissionsResult {
  role: NormalizedPermissionRole;
  normalizedRole: NormalizedPermissionRole;
  orgRole: OrganizationRole;
  isAdmin: boolean;
  isEditor: boolean;
  isViewer: boolean;
  isReadOnly: boolean;
  hasShowAccess: boolean;
  allowedShowIds: string[];
  activeShowPermission: UserShowPermission | null;
  getShowPermission: (targetShowId?: string | null) => UserShowPermission | null;
  getShowPermissions: (targetShowId?: string | null) => EvaluatedShowPermissions;
  hasOrganizationRole: (allowedRoles: OrganizationRole[]) => boolean;
  canView: (targetShowId?: string | null) => boolean;
  canEditEditorial: (targetShowId?: string | null) => boolean;
  canEditScript: (targetShowId?: string | null) => boolean;
  canOperateStudio: (targetShowId?: string | null) => boolean;
  canManageSchedule: (targetShowId?: string | null) => boolean;
  canManageAssets: (targetShowId?: string | null) => boolean;
  canExport: (targetShowId?: string | null) => boolean;
  canAccessEpisode: (
    episode?: Pick<Episode, 'showId'> | null,
    capability?: ShowPermissionCapability
  ) => boolean;
  filterAccessibleShows: <T extends Pick<Show, 'id'>>(shows: T[]) => T[];
  filterAccessibleByShow: <T extends { showId?: string | null }>(
    items: T[],
    capability?: ShowPermissionCapability
  ) => T[];
  filterByShowAccess: <T extends { showId?: string | null }>(items: T[]) => T[];
}

export function normalizeRoleTier(
  orgRole?: OrganizationRole | string | null
): NormalizedPermissionRole {
  if (!orgRole) return 'viewer';
  if (orgRole === 'owner' || orgRole === 'admin') {
    return 'admin';
  }
  if (
    orgRole === 'editor' ||
    orgRole === 'producer' ||
    orgRole === 'director' ||
    orgRole === 'host'
  ) {
    return 'editor';
  }
  return 'viewer';
}

/**
 * Pure helper to evaluate permissions for a given session and showId.
 * Can be called inside React hooks or directly in unit/integration tests.
 */
export function evaluateShowPermissions(
  session?: AuthSession | null,
  targetShowId?: string | null
): EvaluatedShowPermissions {
  const resolvedId = targetShowId ?? null;
  const orgRole: OrganizationRole = session?.role || 'viewer';
  const role: NormalizedPermissionRole = session?.isFullAccessAdmin
    ? 'admin'
    : normalizeRoleTier(orgRole);
  const isAdmin = role === 'admin' || Boolean(session?.isFullAccessAdmin);
  const isViewer = role === 'viewer';
  const isEditor = role === 'editor';

  if (!session) {
    return {
      showId: resolvedId,
      hasShowAccess: false,
      isFullAccessAdmin: false,
      role: 'viewer',
      canView: false,
      canEditEditorial: false,
      canEditScript: false,
      canOperateStudio: false,
      canManageSchedule: false,
      canManageAssets: false,
      canExport: false,
      source: 'denied',
      deniedReason: 'Sessão não autenticada. Faça login para acessar os programas.',
    };
  }

  if (isAdmin) {
    return {
      showId: resolvedId,
      hasShowAccess: true,
      isFullAccessAdmin: true,
      role: 'admin',
      canView: true,
      canEditEditorial: true,
      canEditScript: true,
      canOperateStudio: true,
      canManageSchedule: true,
      canManageAssets: true,
      canExport: true,
      source: 'admin_master',
    };
  }

  const allowedShowIds = Array.isArray(session.allowedShowIds) ? session.allowedShowIds : [];
  const permissionsList = Array.isArray(session.showPermissions) ? session.showPermissions : [];

  if (!resolvedId || resolvedId === 'ALL') {
    const viewablePerms = permissionsList.filter((p) => p.canView);
    const hasAnyView = allowedShowIds.length > 0 || viewablePerms.length > 0;

    return {
      showId: resolvedId,
      hasShowAccess: hasAnyView,
      isFullAccessAdmin: false,
      role,
      canView: hasAnyView,
      canEditEditorial: !isViewer && viewablePerms.some((p) => p.canEditEditorial),
      canEditScript: !isViewer && viewablePerms.some((p) => p.canEditScript),
      canOperateStudio: !isViewer && viewablePerms.some((p) => p.canOperateStudio),
      canManageSchedule: !isViewer && viewablePerms.some((p) => p.canManageSchedule),
      canManageAssets: !isViewer && viewablePerms.some((p) => p.canManageAssets),
      canExport: viewablePerms.some((p) => p.canExport),
      source: hasAnyView ? 'explicit_show_permission' : 'denied',
      deniedReason: hasAnyView
        ? undefined
        : 'Nenhum programa está liberado para este login no momento.',
    };
  }

  const perm = permissionsList.find((p) => p.showId === resolvedId);
  const canViewShow = perm ? Boolean(perm.canView) : allowedShowIds.includes(resolvedId);

  if (!canViewShow) {
    return {
      showId: resolvedId,
      hasShowAccess: false,
      isFullAccessAdmin: false,
      role,
      canView: false,
      canEditEditorial: false,
      canEditScript: false,
      canOperateStudio: false,
      canManageSchedule: false,
      canManageAssets: false,
      canExport: false,
      source: 'denied',
      deniedReason: `Seu perfil (${session.user.email}) está isolado e não possui acesso ao programa solicitado (${resolvedId}).`,
    };
  }

  return {
    showId: resolvedId,
    hasShowAccess: true,
    isFullAccessAdmin: false,
    role,
    canView: true,
    canEditEditorial: !isViewer && Boolean(perm ? perm.canEditEditorial : isEditor),
    canEditScript: !isViewer && Boolean(perm ? perm.canEditScript : isEditor),
    canOperateStudio: !isViewer && Boolean(perm ? perm.canOperateStudio : isEditor),
    canManageSchedule: !isViewer && Boolean(perm ? perm.canManageSchedule : isEditor),
    canManageAssets: !isViewer && Boolean(perm ? perm.canManageAssets : isEditor),
    canExport: Boolean(perm ? perm.canExport : true),
    source: 'explicit_show_permission',
  };
}

/**
 * Centralized RBAC & Program-Level Content Isolation Hook for RSPlay TV — TakeMaster SaaS.
 * Validates the current user's role (admin, editor, viewer) and show-specific permissions.
 */
export function usePermissions(
  session?: AuthSession | null,
  showId?: string | null
): UsePermissionsResult {
  const orgRole: OrganizationRole = session?.role || 'viewer';
  const role: NormalizedPermissionRole = useMemo(
    () => (session?.isFullAccessAdmin ? 'admin' : normalizeRoleTier(orgRole)),
    [session?.isFullAccessAdmin, orgRole]
  );

  const isAdmin = role === 'admin' || Boolean(session?.isFullAccessAdmin);
  const isEditor = role === 'editor';
  const isViewer = role === 'viewer';

  const allowedShowIds = useMemo(() => {
    if (!session) return [];
    return Array.isArray(session.allowedShowIds) ? session.allowedShowIds : [];
  }, [session]);

  const permissionsByShowId = useMemo(() => {
    const map = new Map<string, UserShowPermission>();
    if (session?.showPermissions) {
      for (const perm of session.showPermissions) {
        map.set(perm.showId, perm);
      }
    }
    return map;
  }, [session?.showPermissions]);

  const hasOrganizationRole = useCallback(
    (allowedRoles: OrganizationRole[]): boolean => {
      if (!session) return false;
      if (isAdmin) return true;
      return allowedRoles.includes(orgRole);
    },
    [session, isAdmin, orgRole]
  );

  const getShowPermission = useCallback(
    (targetShowId?: string | null): UserShowPermission | null => {
      const resolvedId = targetShowId ?? showId;
      if (!session || !resolvedId || resolvedId === 'ALL') return null;

      const explicit = permissionsByShowId.get(resolvedId);
      if (explicit) return explicit;

      if (isAdmin) {
        const now = new Date().toISOString();
        return {
          id: `admin-${session.user.id}-${resolvedId}`,
          organizationId: session.activeOrganization.id,
          userId: session.user.id,
          showId: resolvedId,
          canView: true,
          canEditEditorial: true,
          canEditScript: true,
          canOperateStudio: true,
          canManageSchedule: true,
          canManageAssets: true,
          canExport: true,
          createdAt: now,
          updatedAt: now,
        };
      }

      return null;
    },
    [session, showId, permissionsByShowId, isAdmin]
  );

  const getShowPermissions = useCallback(
    (targetShowId?: string | null): EvaluatedShowPermissions =>
      evaluateShowPermissions(session, targetShowId ?? showId),
    [session, showId]
  );

  const canView = useCallback(
    (targetShowId?: string | null): boolean => getShowPermissions(targetShowId).canView,
    [getShowPermissions]
  );

  const canEditEditorial = useCallback(
    (targetShowId?: string | null): boolean => getShowPermissions(targetShowId).canEditEditorial,
    [getShowPermissions]
  );

  const canEditScript = useCallback(
    (targetShowId?: string | null): boolean => getShowPermissions(targetShowId).canEditScript,
    [getShowPermissions]
  );

  const canOperateStudio = useCallback(
    (targetShowId?: string | null): boolean => getShowPermissions(targetShowId).canOperateStudio,
    [getShowPermissions]
  );

  const canManageSchedule = useCallback(
    (targetShowId?: string | null): boolean => getShowPermissions(targetShowId).canManageSchedule,
    [getShowPermissions]
  );

  const canManageAssets = useCallback(
    (targetShowId?: string | null): boolean => getShowPermissions(targetShowId).canManageAssets,
    [getShowPermissions]
  );

  const canExport = useCallback(
    (targetShowId?: string | null): boolean => getShowPermissions(targetShowId).canExport,
    [getShowPermissions]
  );

  const canAccessEpisode = useCallback(
    (
      episode?: Pick<Episode, 'showId'> | null,
      capability: ShowPermissionCapability = 'canView'
    ): boolean => {
      if (!episode) return false;
      const perms = getShowPermissions(episode.showId);
      return perms.hasShowAccess && Boolean(perms[capability]);
    },
    [getShowPermissions]
  );

  const filterAccessibleShows = useCallback(
    <T extends Pick<Show, 'id'>>(shows: T[]): T[] => {
      if (!Array.isArray(shows)) return [];
      if (!session) return [];
      if (isAdmin) return shows;
      return shows.filter((show) => getShowPermissions(show.id).canView);
    },
    [session, isAdmin, getShowPermissions]
  );

  const filterAccessibleByShow = useCallback(
    <T extends { showId?: string | null }>(
      items: T[],
      capability: ShowPermissionCapability = 'canView'
    ): T[] => {
      if (!Array.isArray(items)) return [];
      if (!session) return [];
      if (isAdmin) return items;
      return items.filter((item) => {
        if (!item.showId) return true;
        const perms = getShowPermissions(item.showId);
        return perms.hasShowAccess && Boolean(perms[capability]);
      });
    },
    [session, isAdmin, getShowPermissions]
  );

  const filterByShowAccess = useCallback(
    <T extends { showId?: string | null }>(items: T[]): T[] =>
      filterAccessibleByShow(items, 'canView'),
    [filterAccessibleByShow]
  );

  const activeShowPermission = useMemo(
    () => getShowPermission(showId),
    [getShowPermission, showId]
  );
  const hasShowAccess = useMemo(
    () => getShowPermissions(showId).hasShowAccess,
    [getShowPermissions, showId]
  );
  const isReadOnly = useMemo(() => {
    const perms = getShowPermissions(showId);
    return isViewer || (!perms.canEditEditorial && !perms.canEditScript);
  }, [getShowPermissions, showId, isViewer]);

  return {
    role,
    normalizedRole: role,
    orgRole,
    isAdmin,
    isEditor,
    isViewer,
    isReadOnly,
    hasShowAccess,
    allowedShowIds,
    activeShowPermission,
    getShowPermission,
    getShowPermissions,
    hasOrganizationRole,
    canView,
    canEditEditorial,
    canEditScript,
    canOperateStudio,
    canManageSchedule,
    canManageAssets,
    canExport,
    canAccessEpisode,
    filterAccessibleShows,
    filterAccessibleByShow,
    filterByShowAccess,
  };
}
