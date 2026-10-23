import { z } from 'zod';
import { AppError } from './validation';

/**
 * Schemas Zod para validação de parâmetros de requisição (query, path, body).
 * Usados em endpoints da API para prevenir injeção, IDOR e acessos não autorizados.
 */

// UUID válido
export const uuidParam = z.string().uuid('ID inválido: deve ser um UUID.');

// ID de show/programa (legacy ou UUID)
export const showIdParam = z.string().min(1, 'showId é obrigatório.');

// ID de organização
export const organizationIdParam = z.string().uuid('ID de organização inválido.');

// ID de usuário
export const userIdParam = z.string().uuid('ID de usuário inválido.');

// ID de episódio
export const episodeIdParam = z.string().min(1, 'ID de episódio é obrigatório.');

// ID de produção/temporada
export const productionIdParam = z.string().min(1, 'ID de produção é obrigatório.');

// Paginação
export const paginationQuery = z
  .object({
    page: z.coerce.number().int().positive().optional().default(1),
    pageSize: z.coerce.number().int().positive().max(100).optional().default(50),
  })
  .strict();

// Filtro por show (query opcional)
export const showFilterQuery = z
  .object({
    showId: z.string().optional(),
  })
  .strict();

// Parâmetros de autenticação (login/register)
export const loginBodySchema = z
  .object({
    emailOrUserId: z.string().min(1, 'Email ou ID é obrigatório.'),
    organizationId: z.string().uuid().optional(),
    loginCode: z.string().min(1, 'Código de acesso é obrigatório.'),
  })
  .strict();

// Parâmetros de switch-org
export const switchOrgBodySchema = z
  .object({
    organizationId: z.string().uuid('ID de organização inválido.'),
  })
  .strict();

// Parâmetros de billing subscribe
export const subscribeBodySchema = z
  .object({
    planId: z.string().min(1, 'planId é obrigatório.'),
    showId: z.string().optional(),
    paymentMethodType: z.string().optional(),
    paymentMethodLast4: z.string().optional(),
    paymentMethodBrand: z.string().optional(),
    autoRenew: z.boolean().optional(),
  })
  .strict();

// Parâmetros de IA (prompt livre - sanitização necessária)
export const aiAssistBodySchema = z
  .object({
    prompt: z.string().max(2000, 'Prompt muito grande (máximo 2000 caracteres).').optional(),
    episodeId: z.string().optional(),
    context: z.string().max(5000).optional(),
  })
  .strict();

// Headers de segurança esperados
export const securityHeadersSchema = z
  .object({
    'x-request-id': z.string().uuid().optional(),
    'x-organization-id': z.string().uuid().optional(),
  })
  .passthrough();

/**
 * Valida parâmetros de path (req.params) contra um schema Zod.
 * Lança AppError(400) em caso de falha.
 */
export function validatePathParams(params: Record<string, string>, schema: z.ZodTypeAny): Record<string, string> {
  const result = schema.safeParse(params);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new AppError(400, 'VALIDATION_ERROR', `Parâmetros de caminho inválidos: ${issues}`);
  }
  return result.data as Record<string, string>;
}

/**
 * Valida query string (req.query) contra um schema Zod.
 * Lança AppError(400) em caso de falha.
 */
export function validateQuery(query: Record<string, string | string[] | undefined>, schema: z.ZodTypeAny): any {
  // Converter arrays de query para string simples quando o schema espera string
  const normalized: Record<string, any> = {};
  for (const [key, value] of Object.entries(query)) {
    normalized[key] = Array.isArray(value) ? value[0] : value;
  }
  const result = schema.safeParse(normalized);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new AppError(400, 'VALIDATION_ERROR', `Query inválida: ${issues}`);
  }
  return result.data;
}

/**
 * Valida body (req.body) contra um schema Zod.
 * Lança AppError(400) em caso de falha.
 */
export function validateBody(body: any, schema: z.ZodTypeAny): any {
  const result = schema.safeParse(body);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new AppError(400, 'VALIDATION_ERROR', `Body inválido: ${issues}`);
  }
  return result.data;
}
