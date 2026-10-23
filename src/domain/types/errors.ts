/**
 * Error Types & API Contracts
 * 
 * Shared error types and API request/response wrappers.
 * Re-exports Shared Kernel errors.
 */

import type { ApiErrorCode, StandardizedApiError } from '../contracts';

export type { ApiErrorCode, StandardizedApiError };

// ============================================
// EXTENDED ERROR TYPES
// ============================================

export interface AppError extends Error {
  code: ApiErrorCode;
  statusCode: number;
  details?: string[];
  requestId?: string;
  timestamp: string;
  path?: string;
  method?: string;
  userId?: string;
  organizationId?: string;
}

export interface ValidationErrorDetail {
  field: string;
  message: string;
  code: string;
  value?: unknown;
}

export interface ValidationError extends Error {
  code: 'VALIDATION_ERROR';
  statusCode: number;
  details: ValidationErrorDetail[];
  requestId?: string;
  timestamp: string;
  path?: string;
  method?: string;
  userId?: string;
  organizationId?: string;
}

// ============================================
// API REQUEST/RESPONSE WRAPPERS
// ============================================

export interface ApiRequest<T = unknown> {
  body?: T;
  query: Record<string, string | string[] | undefined>;
  params: Record<string, string>;
  headers: Record<string, string>;
  user?: AuthenticatedUser;
  organization?: AuthenticatedOrganization;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: string;
  platformRole: string;
  organizationId: string;
  allowedShowIds: string[];
}

export interface AuthenticatedOrganization {
  id: string;
  name: string;
  slug: string;
  plan: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: StandardizedApiError;
  meta?: ResponseMeta;
}

export interface ResponseMeta {
  requestId: string;
  timestamp: string;
  version: string;
  pagination?: PaginationMeta;
  rateLimit?: RateLimitMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface RateLimitMeta {
  limit: number;
  remaining: number;
  resetAt: string;
}

// ============================================
// COMMON API RESPONSES
// ============================================

export interface ListResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}

export interface CreateResponse<T> {
  item: T;
}

export interface UpdateResponse<T> {
  item: T;
}

export interface DeleteResponse {
  success: true;
  deletedId: string;
}

export interface ErrorResponse {
  success: false;
  error: StandardizedApiError;
}

// ============================================
// HEALTH CHECK RESPONSE
// ============================================

export interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'error';
  service: string;
  version: string;
  timestamp: string;
  database: DatabaseHealth;
  ai: AIHealth;
  metrics: SystemMetricsSnapshot;
}

export interface DatabaseHealth {
  connected: boolean;
  latencyMs: number;
  poolSize: number;
  activeConnections: number;
}

export interface AIHealth {
  configured: boolean;
  provider: string;
  model?: string;
  lastCheck?: string;
}

export interface SystemMetricsSnapshot {
  uptime: number;
  memoryUsage: number;
  cpuUsage: number;
  requestCount: number;
  errorRate: number;
}

// ============================================
// ERROR FACTORY FUNCTIONS
// ============================================

export function createAppError(
  code: ApiErrorCode,
  message: string,
  statusCode: number,
  details?: string[],
  requestId?: string
): AppError {
  const error = new Error(message) as AppError;
  error.code = code;
  error.statusCode = statusCode;
  error.details = details;
  error.requestId = requestId;
  error.timestamp = new Date().toISOString();
  return error;
}

export function createValidationError(
  details: ValidationErrorDetail[],
  requestId?: string
): ValidationError {
  const error = new Error('Dados de entrada inválidos') as ValidationError;
  error.code = 'VALIDATION_ERROR';
  error.statusCode = 400;
  error.details = details;
  error.requestId = requestId;
  error.timestamp = new Date().toISOString();
  return error;
}

export function createNotFoundError(
  resource: string,
  id: string,
  requestId?: string
): AppError {
  return createAppError(
    'NOT_FOUND',
    `${resource} não encontrado: ${id}`,
    404,
    undefined,
    requestId
  );
}

export function createForbiddenError(
  message: string,
  requestId?: string
): AppError {
  return createAppError(
    'FORBIDDEN_CONTEXT',
    message,
    403,
    undefined,
    requestId
  );
}

export function createUnauthorizedError(
  message: string,
  requestId?: string
): AppError {
  return createAppError(
    'UNAUTHORIZED',
    message,
    401,
    undefined,
    requestId
  );
}

export function createConflictError(
  message: string,
  requestId?: string
): AppError {
  return createAppError(
    'CONFLICT',
    message,
    409,
    undefined,
    requestId
  );
}

export function createPersistenceError(
  message: string,
  requestId?: string
): AppError {
  return createAppError(
    'PERSISTENCE_ERROR',
    message,
    500,
    undefined,
    requestId
  );
}

// ============================================
// ERROR MESSAGES MAP (for i18n/frontend)
// ============================================

export const ERROR_MESSAGES: Record<ApiErrorCode, string> = {
  CONFIGURATION_ERROR: 'Erro de configuração do sistema',
  VALIDATION_ERROR: 'Dados de entrada inválidos',
  UNAUTHORIZED: 'Não autorizado - faça login novamente',
  FORBIDDEN_CONTEXT: 'Acesso negado - você não tem permissão para esta ação',
  SUBSCRIPTION_INACTIVE: 'Assinatura inativa - verifique seu plano',
  NOT_FOUND: 'Recurso não encontrado',
  CONFLICT: 'Conflito - o recurso já existe ou foi modificado',
  PERSISTENCE_ERROR: 'Erro interno do banco de dados',
  AI_SCHEMA_ERROR: 'Erro na geração de conteúdo por IA',
  PAYMENT_FAILED: 'Falha no processamento do pagamento',
  SETUP_IN_PROGRESS: 'Configuração em andamento - tente novamente mais tarde',
  EMAIL_EXISTS: 'Este e-mail já está cadastrado',
};