import { Request } from 'express';
import { incrementMetric, logStructured } from './logger';

/**
 * Sanitização simples de HTML para ambiente Node (sem DOM).
 * Remove tags HTML e atributos perigosos usando regex conservadora.
 */
function stripHtmlTags(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
}

/**
 * Sanitiza uma string de texto livre removendo tags HTML para prevenir XSS.
 * Usar antes de armazenar ou exibir conteúdo gerado pelo usuário ou por IA.
 */
export function sanitizeHtml(input: string | undefined | null): string {
  if (input == null) return '';
  return stripHtmlTags(String(input));
}

/**
 * Sanitiza um objeto recursivamente, aplicando sanitização em todos
 * os campos de texto (string). Usar em payloads de usuário antes de salvar.
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const result: Record<string, any> = { ...obj };
  for (const [key, value] of Object.entries(result)) {
    if (typeof value === 'string') {
      result[key] = sanitizeHtml(value);
    } else if (Array.isArray(value)) {
      result[key] = value.map((v) =>
        typeof v === 'string' ? sanitizeHtml(v) : v
      );
    } else if (value && typeof value === 'object') {
      result[key] = sanitizeObject(value as Record<string, any>);
    }
  }
  return result as T;
}

/* ------------------------------------------------------------------ */
/* 2. Detecção de Prompt Injection                                    */
/* ------------------------------------------------------------------ */

// Padrões suspeitos de prompt injection (tentativa de desviar instruções do sistema)
const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+previous\s+instructions/i,
  /ignore\s+all\s+prior\s+instructions/i,
  /disregard\s+previous\s+instructions/i,
  /system\s*:\s*/i,
  /assistant\s*:\s*/i,
  /you\s+are\s+now\s+a/i,
  /pretend\s+to\s+be/i,
  /roleplay\s+as/i,
  /jailbreak/i,
  /DAN\s*$/i,
  /do\s+anything\s+now/i,
  /override\s+system/i,
  /bypass\s+safety/i,
  /forget\s+everything/i,
  /reveal\s+your\s+system\s+prompt/i,
  /print\s+your\s+instructions/i,
  /leak\s+the\s+prompt/i,
];

/**
 * Detecta possíveis tentativas de prompt injection em texto livre do usuário.
 * Retorna true se encontrar padrões suspeitos.
 */
export function detectPromptInjection(input: string | undefined | null): boolean {
  if (!input) return false;
  const text = String(input);
  return PROMPT_INJECTION_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Sanitiza um prompt de usuário removendo tentativas de injeção de instruções
 * do sistema. Retorna o texto limpo e um booleano indicando se algo foi removido.
 */
export function sanitizeAIPrompt(input: string | undefined | null): { clean: string; injected: boolean } {
  if (!input) return { clean: '', injected: false };
  let clean = String(input);
  let injected = false;

  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(clean)) {
      injected = true;
      clean = clean.replace(pattern, ' ');
    }
  }

  // Colapsar espaços múltiplos
  clean = clean.replace(/\s+/g, ' ').trim();
  return { clean, injected };
}

/* ------------------------------------------------------------------ */
/* 3. Logging de Segurança (SIEM)                                     */
/* ------------------------------------------------------------------ */

/**
 * Extrai metadados de segurança da requisição (IP, user_agent, requestId).
 */
export function extractSecurityMeta(req: Request): Record<string, any> {
  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    (req.headers['x-real-ip'] as string) ||
    req.socket?.remoteAddress ||
    'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';
  const requestId = (req as any).requestId || 'unknown';
  return { client_ip: ip, user_agent: userAgent, request_id: requestId };
}

/**
 * Registra um evento de segurança com metadados da requisição.
 * Envia para log estruturado (stdout) — em produção, deve ser encaminhado
 * para SIEM (ELK, Splunk, CloudWatch, Datadog).
 */
export function logSecurityEvent(
  req: Request,
  event: string,
  meta: Record<string, any> = {},
  level: 'INFO' | 'WARN' | 'ERROR' = 'INFO'
) {
  const securityMeta = extractSecurityMeta(req);
  const entry = { ...meta, ...securityMeta };
  logStructured(level, `security_${event}`, entry);

  // Métrica de evento de segurança
  incrementMetric('errorsTotal', `security:${event}`);
}

/**
 * Registra tentativa de org-hopping (acesso a organização não autorizada).
 */
export function logOrgHopAttempt(req: Request, userId: string, requestedOrgId: string, memberOrgIds: string[]) {
  logSecurityEvent(req, 'org_hop_attempt', {
    user_id: userId,
    requested_organization_id: requestedOrgId,
    member_organization_ids: memberOrgIds,
  }, 'WARN');
}

/**
 * Registra tentativa de prompt injection em endpoint de IA.
 */
export function logPromptInjection(req: Request, userId: string, field: string, value: string) {
  logSecurityEvent(req, 'prompt_injection_attempt', {
    user_id: userId,
    field,
    value: value.substring(0, 200), // truncar para não encher logs
  }, 'WARN');
}

/**
 * Registra falha de autenticação com IP para detecção de brute force.
 */
export function logAuthFailure(req: Request, identifier: string, reason: string) {
  logSecurityEvent(req, 'auth_failure', {
    identifier,
    reason,
  }, 'WARN');
}

/**
 * Registra evento de autorização negada (acesso negado a recurso).
 */
export function logAuthorizationDenied(
  req: Request,
  userId: string,
  resource: string,
  action: string,
  reason: string
) {
  logSecurityEvent(req, 'authorization_denied', {
    user_id: userId,
    resource,
    action,
    reason,
  }, 'WARN');
}
