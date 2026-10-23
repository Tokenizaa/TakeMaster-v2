# RELATÓRIO DE AUDITORIA DE SEGURANÇA — ÁREA 2 (Segurança e Compliance)
## Parte 1 de 2: Checklist Itens 1–13

**Repositório:** `/home/lg/workspace/projects/TakeMaster-v2`  
**Projeto:** TakeMaster-v2 / RSPlay TV SaaS  
**Área:** 2 — Segurança e Compliance  
**Data:** 22 Out 2026  
**Auditor:** Application Security Engineer (líder da Área 2)

---

## CHECKLIST DE AUDITORIA — ÁREA 2

### Item 1 — Threat Modeling
- **Status:** CRÍTICO
- **Evidência:** Não há documento de threat model (STRIDE/PASTA/attack trees) no repositório.
- **Gap:** Ausência completa de threat modeling. Sem trust boundaries, data flows, attack surface, nem requisitos de segurança testáveis.
- **Ação Corretiva:** Conduzir threat model STRIDE para autenticação, billing, integração NVIDIA NIM (prompt injection), multi-tenancy por org/show. Produzir requisitos testáveis e incluir nos critérios de aceitação.
- **Prioridade:** Alta
- **Dono:** application-security-engineer

### Item 2 — Autenticação (OAuth/OIDC / session)
- **Status:** ATENÇÃO
- **Evidência:** Autenticação via Supabase `signInWithPassword` + session custom HMAC-SHA256 (`tmv2.` prefix, expiração 12h). Token em `localStorage` (`tmv2_auth_token`). Não há OAuth2/OIDC, MFA, refresh token rotation, passkeys/WebAuthn.
- **Gap:** (1) Session token caseiro (base64url + HMAC) sem padrão. (2) Token em localStorage exposto a XSS. (3) Sem MFA. (4) Sem rotação de refresh token. (5) `X-Organization-Id` vem do cliente como override — risco de org hopping.
- **Ação Corretiva:** (a) Migrar para sessão Supabase nativa (JWT padrão + refresh token) ou cookie `HttpOnly; Secure; SameSite=Strict`. (b) MFA para admin/owner. (c) Validar `X-Organization-Id` contra memberships do usuário. (d) IdP OIDC (Google/Microsoft) para SSO corporativo.
- **Prioridade:** Alta
- **Dono:** identity-access-engineer / application-security-engineer

### Item 3 — Autorização (RBAC/ABAC + program-level)
- **Status:** ATENÇÃO
- **Evidência:** RBAC em `persistence.ts` (`getUserShowPermissions`, `assertUserCanAccessShow`, `organization_members`, `program_user_access`). Roles: owner, admin, producer, editor, host, viewer. RLS no Supabase (`is_org_member`, `has_program_access`).
- **Gap:** (1) Endpoints billing/admin só checam `requireOrganizationAdmin` — sem verificação show-level granular. (2) `listAuditLogs` expõe logs de toda org sem filtro de show para não-admin. (3) Não há ABAC. (4) `createOrganizationUserWithShowPermissions` usa senha gerada aleatória (`cryptoRandom`) sem política de força/expiração.
- **Ação Corretiva:** (a) Estender autorização por recurso em billing/admin. (b) ABAC mínimo (IP allowlist para admin). (c) Revisar RLS policies do Supabase (deny-by-default). (d) Política de senha (mínimo 12 chars, expiração, bloqueio por tentativas).
- **Prioridade:** Alta
- **Dono:** identity-access-engineer / application-security-engineer

### Item 4 — Gerenciamento de Segredos
- **Status:** CRÍTICO
- **Evidência:** Arquivo `.env` presente no working tree com secrets em texto plano: `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_PASSWORD="Netto@964212$"`, `CLOUDFLARE_API_TOKEN`, 3× `NVIDIA_API_KEY`, `NINEROUTER_KEY`, `EVOLUTION_API_KEY`. `.gitignore` lista `.env*` mas `!.env.example`. Hardcoded defaults `rsplay123` / `poder123` em `src/server/seeds.ts` (linhas 76, 86).
- **Gap:** (1) Secrets de produção expostos localmente e possivelmente no git history. (2) Service role key (supabase admin) no arquivo. (3) Nenhum secret manager (AWS Secrets Manager, Vault, Doppler, GitHub Secrets). (4) Senhas defaults hardcoded no código.
- **Ação Corretiva:** (a) Remover `.env` do versionado e working tree; rotacionar TODOS os secrets expostos (Supabase keys, NVIDIA keys, Cloudflare token, Evolution API key, senha do banco). (b) Migrar para gerenciador de secrets. (c) Eliminar defaults `rsplay123`/`poder123` — gerar senhas fortes no cadastro. (d) Secret scanning (gitleaks/trufflehog) no CI.
- **Prioridade:** Crítica (bloqueia produção)
- **Dono:** senior-secops-engineer / ai-generated-code-security-auditor

### Item 5 — Criptografia em Trânsito (TLS)
- **Status:** ATENÇÃO
- **Evidência:** Servidor Express escuta em `0.0.0.0:3000` sem TLS no código (`app.listen`, não `https.createServer`). Deploy via Cloudflare Workers (`wrangler.jsonc`) — TLS pelo edge da Cloudflare. Supabase via HTTPS. NVIDIA NIM via HTTPS.
- **Gap:** (1) Não há força de HTTPS no servidor local/dev. (2) Sem HSTS header. (3) Sem enforcamento de TLS 1.2/1.3 mínimo no código. (4) Sem certificado/pinning para chamadas de saída (NIM, Evolution API).
- **Ação Corretiva:** (a) Todo tráfego de produção por TLS (Cloudflare edge ou reverse proxy). (b) Header `Strict-Transport-Security` com `includeSubDomains` e `preload`. (c) Desabilitar TLS < 1.2 no load balancer/reverse proxy. (d) Certificate pinning ou CA validation estrita para saídas críticas (pagamento, NIM).
- **Prioridade:** Média
- **Dono:** senior-secops-engineer / platform-engineer

### Item 6 — Proteção contra Injeção (SQLi, Command Injection)
- **Status:** ATENÇÃO
- **Evidência:** Acesso a dados via Supabase client (parameterized queries por construção — baixo risco SQLi clássico). Nenhum `child_process`, `exec`, `eval` no código revisado. Express `json()` com limite 10mb.
- **Gap:** (1) Não há validação rigorosa de tipos em parâmetros de rota (`req.params.id`, `req.query.showId` usados diretamente em queries Supabase). (2) Sem WAF/regras de injeção. (3) `saveEpisodeChildren` faz inserts massivos sem validação profunda de nested objects. (4) Sem proteção contra injeção em queries dinâmicas.
- **Ação Corretiva:** (a) Validação de esquema (Zod/Joi) em todos os parâmetros de query e path. (b) Manter queries parameterizadas (Supabase client — documentar). (c) WAF (Cloudflare) com regras SQLi/command injection. (d) Testes de injeção em endpoints críticos.
- **Prioridade:** Média
- **Dono:** application-security-engineer / penetration-tester

### Item 7 — Proteção contra XSS
- **Status:** ATENÇÃO
- **Evidência:** Frontend React 19 com Vite. Não há `dangerouslySetInnerHTML` nos componentes revisados. CSP não configurada. Token de sessão em `localStorage`.
- **Gap:** (1) Sem Content-Security-Policy. (2) Token acessível via JavaScript (localStorage) — XSS rouba sessão. (3) Conteúdo gerado por IA renderizado sem sanitização de output. (4) Sem sanitização de HTML para campos bio, notes, description.
- **Ação Corretiva:** (a) CSP rigorosa (`default-src 'self'`, `script-src` restrito, `object-src 'none'`, `base-uri 'self'`). (b) Migrar token para cookie `HttpOnly; Secure; SameSite=Strict`. (c) Sanitizar output de texto livre (DOMPurify). (d) Sanitizar conteúdo de IA antes de exibição.
- **Prioridade:** Alta
- **Dono:** application-security-engineer / frontend-developer

### Item 8 — CSRF (Cross-Site Request Forgery)
- **Status:** CRÍTICO
- **Evidência:** Não há proteção CSRF em `server.ts`. Não há `csurf`, SameSite cookie enforcement (token em localStorage), double-submit cookie, ou token CSRF em headers. Endpoints state-changing (`POST /api/shows`, `DELETE /api/episodes`, `POST /api/billing/subscribe`) aceitam requisições de qualquer origem com Bearer token.
- **Gap:** Token em localStorage acessível via JS — site malicioso pode ler `localStorage` e enviar requisições autenticadas via `fetch` com CORS permissivo. Não há validação de `Origin`/`Referer` headers.
- **Ação Corretiva:** (a) Validação de `Origin` e `Referer` para endpoints state-changing. (b) CORS restritivo (apenas domínios autorizados). (c) Migrar session para cookie `SameSite=Strict` + double-submit CSRF token para formulários sensíveis. (d) Middleware CSRF para pagamento e admin.
- **Prioridade:** Alta
- **Dono:** senior-secops-engineer / application-security-engineer

### Item 9 — CORS
- **Status:** CRÍTICO
- **Evidência:** Não há configuração de CORS em `server.ts` (não há `cors` middleware). Express padrão não restringe origens — depende do reverse proxy.
- **Gap:** Sem CORS configurado, o backend aceita requisições de qualquer origem (se o proxy não bloquear). Expõe a API a ataques de origem cruzada, especialmente com token em localStorage acessível via JS.
- **Ação Corretiva:** (a) Middleware `cors` com whitelist de origens autorizadas (apenas domínio de produção do frontend). (b) Desabilitar `credentials: true` com `origin: *`. (c) `Access-Control-Allow-Methods` e `Access-Control-Allow-Headers` restritivos. (d) Header `Vary: Origin`.
- **Prioridade:** Alta
- **Dono:** senior-secops-engineer / application-security-engineer

### Item 10 — Rate Limiting
- **Status:** CRÍTICO
- **Evidência:** Não há rate limiting em nenhum endpoint (`server.ts` não importa `express-rate-limit`). Endpoints auth (`/api/auth/login`, `/api/auth/register`), billing (`/api/billing/subscribe`), AI (`/api/ai/*`) sem limite de requisições.
- **Gap:** (1) Brute force em login. (2) Abuso de endpoints de IA (custo financeiro NVIDIA NIM). (3) DoS por enfileiramento. (4) Sem limite por IP, usuário, ou endpoint.
- **Ação Corretiva:** (a) `express-rate-limit`: auth (5 req/min por IP), AI (30 req/min por usuário), geral (100 req/min por IP). (b) Rate limiting por organização (billing). (c) Redis para rate limiting distribuído se múltiplas instâncias. (d) Alertas quando limites atingidos.
- **Prioridade:** Alta
- **Dono:** senior-secops-engineer / backend-architect

### Item 11 — CSP Headers
- **Status:** CRÍTICO
- **Evidência:** Não há headers de segurança HTTP em `server.ts`. Não há `helmet`. Não há `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`.
- **Gap:** (1) Sem CSP — vulnerável a XSS. (2) Sem `X-Content-Type-Options: nosniff` — MIME sniffing. (3) Sem `X-Frame-Options` — clickjacking. (4) Sem `Referrer-Policy` — vazamento de URLs internos.
- **Ação Corretiva:** (a) `helmet` ou headers manuais: `Content-Security-Policy: default-src 'self'; script-src 'self' https://cdn.tailwindcss.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none';`. (b) `X-Content-Type-Options: nosniff`. (c) `X-Frame-Options: DENY`. (d) `Referrer-Policy: strict-origin-when-cross-origin`. (e) `Permissions-Policy` restritivo.
- **Prioridade:** Alta
- **Dono:** senior-secops-engineer / frontend-developer

### Item 12 — Input Validation / Sanitização
- **Status:** ATENÇÃO
- **Evidência:** Validação em `src/domain/validation.ts` (`validateShowPayload`, `validateEpisodePayload`, etc.) com checagem de tipos, tamanhos, enums. Zod não é usado (validação manual). Limite de body 10mb.
- **Gap:** (1) Validação manual propensa a esquecer campos (ex: `validateParticipantPayload` não valida `links` como URLs válidas). (2) Sem sanitização de HTML/markdown em texto livre (bio, notes, description). (3) Sem limitação de profundidade/tamanho de objetos aninhados. (4) `X-Organization-Id` não validado contra memberships.
- **Ação Corretiva:** (a) Adotar Zod para validação de esquema em todos endpoints. (b) Sanitizar campos de texto livre (remover tags HTML, escapar output). (c) Limitar tamanho de objetos aninhados e arrays (máx 100 questions, 50 script items). (d) Validar `X-Organization-Id` contra `getUserMemberships`.
- **Prioridade:** Média
- **Dono:** application-security-engineer / frontend-developer

### Item 13 — Logging de Segurança (Audit Logs)
- **Status:** ATENÇÃO
- **Evidência:** Tabela `audit_log` no Supabase com RLS. `recordAuditLog` chamada em login, switch-org, AI generation, editorial identity, pautas. Endpoint `GET /api/audit` com limite 50. `requestTracingMiddleware` gera `X-Request-Id` e loga erros HTTP (>= 400). Logs JSON via `logStructured`.
- **Gap:** (1) Logs são `console.log`/`console.error` — não há envio para SIEM, rotação, armazenamento imutável. (2) Não há log de eventos de segurança específicos (falhas de login, access denied, role changes, exportação de dados). (3) `listAuditLogs` limitado a 50 — sem paginação/arquivamento. (4) Não há integridade de log (hash assinado, write-once). (5) Logs não incluem IP do cliente (somente requestId).
- **Ação Corretiva:** (a) Enviar logs de segurança para SIEM/centralized logging (ELK, Splunk, CloudWatch, Datadog). (b) Logar eventos de segurança: auth failures, authorization denials, role changes, data exports, AI prompts/respostas. (c) Incluir `client_ip`, `user_agent` nos logs de auditoria. (d) Log imutável (WORM) ou assinatura digital. (e) Retenção mínima 12 meses (LGPD/GDPR).
- **Prioridade:** Média
- **Dono:** application-security-engineer / incident-responder
