/**
 * Admin Reporting Domain Types — Strict Internal Types
 */

import type {
  SaaSSubscription,
  ShowFormat,
  AdminReportSummary,
  AuditLogEntry,
} from '../contracts';

export type { SaaSSubscription, ShowFormat, AdminReportSummary, AuditLogEntry };

// ============================================
// STRICT VERSIONS
// ============================================

export interface StrictAdminReportSummary {
  mrrCents: number;
  activeSubscriptionsCount: number;
  autoRenewEnabledCount: number;
  paidInvoicesTotalCents: number;
  pendingInvoicesTotalCents: number;
  usersCount: number;
  showsReport: ShowHealthReport[];
  generatedAt: string;
  period: ReportPeriod;
}

export interface ReportPeriod {
  start: string;
  end: string;
  label: string;
}

export interface ShowHealthReport {
  showId: string;
  showTitle: string;
  format: ShowFormat;
  host: string;
  episodesCount: number;
  publishedOrReadyCount: number;
  draftCount: number;
  inProductionCount: number;
  totalPlannedMinutes: number;
  scheduledSessionsCount: number;
  authorizedUsersCount: number;
  lastEpisodeDate?: string;
  lastActivityDate?: string;
  healthScore: number;
  healthStatus: 'healthy' | 'attention' | 'critical';
  alerts: ShowAlert[];
}

export interface ShowAlert {
  type: 'no_recent_activity' | 'low_episode_output' | 'overdue_episodes' | 'no_authorized_users' | 'subscription_expiring';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  actionUrl?: string;
}

// ============================================
// AUDIT LOG
// ============================================

export interface StrictAuditLogEntry {
  id: string;
  organizationId: string;
  userId?: string;
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction;
  metadata: Record<string, unknown>;
  createdAt: string;
  ipAddress?: string;
  userAgent?: string;
}

export type AuditEntityType =
  | 'user'
  | 'organization'
  | 'show'
  | 'production'
  | 'episode'
  | 'guest'
  | 'library_asset'
  | 'subscription'
  | 'payment_intent'
  | 'schedule_event'
  | 'permission'
  | 'settings'
  | 'api_key';

export type AuditAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'viewed'
  | 'exported'
  | 'permission_granted'
  | 'permission_revoked'
  | 'role_changed'
  | 'status_changed'
  | 'login'
  | 'logout'
  | 'password_changed'
  | 'mfa_enabled'
  | 'mfa_disabled'
  | 'payment_processed'
  | 'subscription_renewed'
  | 'subscription_canceled'
  | 'webhook_received';

// ============================================
// SYSTEM METRICS
// ============================================

export interface SystemMetrics {
  requests: RequestMetrics;
  database: DatabaseMetrics;
  ai: AIMetrics;
  cache: CacheMetrics;
  errors: ErrorMetrics;
  uptime: number;
  timestamp: string;
}

export interface RequestMetrics {
  total: number;
  byMethod: Record<string, number>;
  byStatus: Record<string, number>;
  byEndpoint: Record<string, number>;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
}

export interface DatabaseMetrics {
  connections: number;
  activeQueries: number;
  avgQueryTimeMs: number;
  slowQueriesCount: number;
  cacheHitRatio: number;
}

export interface AIMetrics {
  totalGenerations: number;
  byType: Record<string, number>;
  avgLatencyMs: number;
  totalTokensUsed: number;
  totalCostCents: number;
  successRate: number;
  errorsByType: Record<string, number>;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRatio: number;
  size: number;
  evictions: number;
}

export interface ErrorMetrics {
  total: number;
  byCode: Record<string, number>;
  byEndpoint: Record<string, number>;
  recentErrors: ErrorSample[];
}

export interface ErrorSample {
  timestamp: string;
  code: string;
  message: string;
  endpoint: string;
  userId?: string;
}

// ============================================
// HEALTH CHECK
// ============================================

export interface HealthCheckResult {
  status: 'ok' | 'degraded' | 'error';
  service: string;
  version: string;
  timestamp: string;
  checks: HealthCheck[];
}

export interface HealthCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  latencyMs?: number;
  details?: Record<string, unknown>;
  error?: string;
}

// ============================================
// USER MANAGEMENT (Admin view)
// ============================================

export interface AdminUserListItem {
  id: string;
  email: string;
  name: string;
  role: string;
  platformRole: string;
  status: string;
  organizationId: string;
  organizationName: string;
  showCount: number;
  lastLoginAt?: string;
  createdAt: string;
}

export interface AdminOrganizationSummary {
  id: string;
  name: string;
  slug: string;
  plan: string;
  userCount: number;
  showCount: number;
  activeSubscriptionCount: number;
  mrrCents: number;
  status: 'active' | 'suspended' | 'trial' | 'canceled';
  createdAt: string;
}