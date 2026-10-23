# RELATÓRIO DE AUDITORIA DE SEGURANÇA — ÁREA 2 (Segurança e Compliance)
## Parte 2 de 2: Checklist Itens 14–21, Sumário Executivo e Recomendações

**Repositório:** `/home/lg/workspace/projects/TakeMaster-v2`  
**Projeto:** TakeMaster-v2 / RSPlay TV SaaS  
**Área:** 2 — Segurança e Compliance  
**Data:** 22 Out 2026  
**Auditor:** Application Security Engineer (líder da Área 2)

---

## CHECKLIST DE AUDITORIA — ÁREA 2 (continuação)

### Item 14 — Proteção contra Prompt Injection (IA / LLM)
- **Status:** ATENÇÃO
- **Evidência:** Integração com NVIDIA NIM via `src/server/ai.ts`. Saídas de IA validadas por schema validators em `src/domain/aiContracts.ts` (`validateDiagnosisOutput`, `validateResearchOutput`, etc.) com fallback estruturado. `buildSafeEpisodeAiContext` trunca campos antes de enviar para IA. Prompts instruem "Retorne APENAS JSON".
- **Gap:** (1) Não há detecção de prompt injection (instruções maliciosas no input do usuário que desviem o comportamento da IA). (2) `generateContextualAssist` aceita `prompt` livre do usuário sem sanitização específica para injeção. (3) Não há separação de privilégios entre dados do usuário e instruções de sistema (prompt concatenado com dados do usuário). (4) Não há auditoria de prompts/respostas da IA. (5) Não há rate limiting específico para endpoints `/api/ai/*`.
- **Ação Corretiva:** (a) Implementar detecção de prompt injection (LLM Guard ou regras de negação de instruções do sistema). (b) Separar dados do usuário de instruções de sistema (template delimitado, não concatenação crua). (c) Sanitizar instruções como "ignore previous instructions", "system:", "assistant:" do input do usuário. (d) Auditar prompts e respostas da IA (log de interações). (e) Rate limiting dedicado para endpoints `/api/ai/*`.
- **Prioridade:** Média
- **Dono:** ai-generated-code-security-auditor / application-security-engineer

### Item 15 — Vulnerabilidades Conhecidas (Dependências / SCA)
- **Status:** CRÍTICO
- **Evidência:** `package.json` com express 4.21.2, react 19.0.0, @supabase/supabase-js 2.101.1, vite 6.2.0, wrangler 4.131.1, @playwright/test 1.56.1. Não há `npm audit` no CI (`.github/workflows/governance.yml` só faz `governance:check`, `lint`, `build:worker`). Não há SCA configurado. Não há Dependabot/Renovate. `bun.lock` modificado — dependências podem ter mudado sem revisão de segurança.
- **Gap:** (1) Sem scanning de vulnerabilidades em dependências. (2) Sem alerta automático para CVEs em dependências diretas e indiretas. (3) Sem política de remediação por SLA (7 dias crítico, 30 dias alto, etc.).
- **Ação Corretiva:** (a) Adicionar `npm audit` / `bun audit` no CI com gate de build falhando para críticas/altas com correção disponível. (b) Configurar Dependabot ou Renovate para atualizações de segurança. (c) Implementar SCA contínuo (Snyk, GitHub CodeQL, ou Trivy). (d) Definir SLA de remediação e tracker de vulnerabilidades.
- **Prioridade:** Alta
- **Dono:** senior-secops-engineer / devops-automator

### Item 16 — SAST (Static Application Security Testing)
- **Status:** CRÍTICO
- **Evidência:** Não há SAST configurado no CI (`.github/workflows/governance.yml` não inclui CodeQL, Semgrep, SonarQube, ESLint security plugin). Não há regras customizadas de segurança para patterns específicos da aplicação.
- **Gap:** (1) Sem análise estática automatizada de vulnerabilidades no código. (2) Sem detecção de hardcoded secrets, crypto inseguro, injeção, broken access control no código-fonte. (3) Sem gate de qualidade de segurança no pull request.
- **Ação Corretiva:** (a) Configurar GitHub CodeQL ou Semgrep no CI para análise estática em cada PR. (b) Adicionar regras customizadas para: hardcoded API keys, uso de `eval`/`child_process`, SQL string concatenation, missing authorization checks. (c) Definir gate: PR não pode ser mergeado com findings críticos/altos não-supostos. (d) Integrar resultados no PR como comentários.
- **Prioridade:** Alta
- **Dono:** application-security-engineer / devops-automator

### Item 17 — DAST (Dynamic Application Security Testing)
- **Status:** CRÍTICO
- **Evidência:** Não há DAST configurado. Testes E2E com Playwright existem (`tests/e2e-functional.test.ts`, `playwright.config.ts`) mas são testes funcionais, não de segurança. Não há scanning de vulnerabilidades em runtime (OWASP ZAP, Burp, Nuclei).
- **Gap:** (1) Sem teste de vulnerabilidades em runtime (XSS, SQLi, IDOR, authentication bypass). (2) Sem validação de headers de segurança em resposta HTTP. (3) Sem teste de autorização (acesso a recursos de outros usuários/orgs).
- **Ação Corretiva:** (a) Configurar OWASP ZAP ou Nuclei em pipeline de staging para scan de vulnerabilidades web. (b) Adicionar testes de segurança automatizados (IDOR, auth bypass) nos testes E2E. (c) Executar DAST antes de cada release de produção. (d) Validar headers de segurança (CSP, HSTS, X-Frame-Options) via testes automatizados.
- **Prioridade:** Alta
- **Dono:** penetration-tester / test-automation-engineer

### Item 18 — Penetration Testing
- **Status:** CRÍTICO
- **Evidência:** Não há evidência de penetration testing autorizado, red team, ou vulnerability assessment conduzido neste repositório. Não há relatório de pentest, escopo, regras de engajamento, ou cronograma de reteste.
- **Gap:** (1) Sem validação independente de segurança antes da produção. (2) Sem teste de autorização (IDOR, privilege escalation). (3) Sem teste de autenticação (brute force, session fixation, token manipulation). (4) Sem teste de lógica de negócio (billing, subscription, AI abuse).
- **Ação Corretiva:** (a) Contratar pentest externo autorizado (escopo: API, frontend, auth, billing, multi-tenancy org isolation). (b) Executar pentest antes do go-live e anualmente após. (c) Definir regras de engajamento, escopo, e janela de teste. (d) Corrigir todos os findings críticos/altos antes da produção. (e) Reteste após correções.
- **Prioridade:** Alta (bloqueador para produção)
- **Dono:** penetration-tester / security-architect

### Item 19 — Plano de Resposta a Incidentes
- **Status:** CRÍTICO
- **Evidência:** Não há documento de plano de resposta a incidentes (IRP), runbook, playbook de contenção, ou matriz de contatos de escalonamento. Não há procedimento de pós-mortem. Não há definição de severidade, SLAs de resposta, ou comunicações.
- **Gap:** (1) Sem procedimento definido para detecção, contenção, erradicação, recuperação de incidentes de segurança. (2) Sem definição de quem é o Incident Commander. (3) Sem procedimento de notificação de violação de dados (LGPD/GDPR — prazo de 72h para autoridades, comunicação aos titulares). (4) Sem preservação de evidências forenses. (5) Sem comunicação interna/externa definida.
- **Ação Corretiva:** (a) Elaborar Plano de Resposta a Incidentes com: classificação de severidade, papéis (IC, comms, legal, tech), procedimentos de contenção/erradicação/recuperação, comunicação (interno, clientes, autoridades LGPD/GDPR), e pós-mortem. (b) Definir SLA: detecção < 1h, contenção < 4h, notificação LGPD < 72h. (c) Treinar equipe e conduzir simulação (tabletop exercise). (d) Integrar com monitoramento/alertas (SIEM, CloudWatch).
- **Prioridade:** Crítica (bloqueia produção)
- **Dono:** incident-response-commander / incident-responder / legal-compliance-checker

### Item 20 — Compliance (SOC2 / ISO27001 / LGPD / GDPR)
- **Status:** CRÍTICO
- **Evidência:** Não há evidência de compliance SOC 2, ISO 27001, HIPAA, ou PCI-DSS. Não há sistema de gestão de controles, evidências de auditoria, políticas de segurança documentadas, ou tratamento de dados pessoais mapeado. O `.env` expõe `SUPABASE_PASSWORD` e keys. Dados de cartão (`paymentMethodLast4`, `paymentMethodBrand`) são capturados no registro, mas não há processamento de pagamento direto — gateway externo.
- **Gap:** (1) Não há mapeamento de controles SOC 2 / ISO 27001. (2) Não há PIA (Privacy Impact Assessment) para LGPD/GDPR. (3) Não há registro de atividades de tratamento (ROPA) de dados pessoais. (4) Não há mecanismo de consentimento documentado. (5) Não há processo DSAR (Right to Access/Delete) — não há endpoint para exportar ou excluir dados do usuário. (6) Não há DPO designado. (7) Não há evidência de PCI-DSS (card data armazenada — escopo mínimo de PCI, mas sem validação).
- **Ação Corretiva:** (a) Mapear controles SOC 2 Tipo II / ISO 27001 Annex A aplicáveis. (b) Conduzir PIA para LGPD/GDPR. (c) Implementar ROPA. (d) Criar endpoints DSAR: exportar dados do usuário (`GET /api/users/me/export`) e excluir dados (`DELETE /api/users/me`). (e) Implementar consentimento explícito e registro de consentimento. (f) Nomear DPO/Encarregado de Dados. (g) Se processar cartões, validar escopo PCI-DSS SAQ A ou usar gateway totalmente externo (não armazenar PAN).
- **Prioridade:** Crítica (bloqueia produção)
- **Dono:** compliance-auditor / data-privacy-officer / legal-compliance-checker

### Item 21 — Proteção de Dados Pessoais (PII / Data Minimization)
- **Status:** CRÍTICO
- **Evidência:** Não há classificação de dados pessoais vs não-pessoais no código. Campos de PII (email, nome, telefone, bio, contacts, notes) são armazenados sem mascaramento ou pseudonimização. Não há retenção automática de dados. Não há direito ao esquecimento implementado.
- **Gap:** (1) Sem classificação de dados sensíveis (LGPD: dados de saúde? preferências? identificadores diretos?). (2) Sem minimização de dados — coleta mais dados do que necessário. (3) Sem pseudonimização/anonimização de dados para analytics. (4) Sem política de retenção e exclusão automática. (5) Sem consentimento separado para diferentes finalidades de tratamento.
- **Ação Corretiva:** (a) Classificar campos de dados pessoais vs sensíveis (marcar PII no schema). (b) Implementar minimização: coletar apenas dados necessários para a finalidade. (c) Pseudonimizar dados usados em analytics/IA (hash ou tokenização de email, nome). (d) Implementar política de retenção (ex: excluir dados inativos após X meses). (e) Consentimento granular por finalidade de tratamento.
- **Prioridade:** Alta
- **Dono:** data-privacy-officer / privacy-engineer

### Item 22 — Backup Criptografado
- **Status:** CRÍTICO
- **Evidência:** Não há evidência de estratégia de backup no repositório. Não há scripts de backup, não há configuração de backup automático do Supabase, não há backup criptografado off-site. Não há teste de restauração.
- **Gap:** (1) Sem backup automático do banco de dados Supabase. (2) Sem backup criptografado (chaves de criptografia do backup não gerenciadas). (3) Sem backup off-site/região diferente. (4) Sem teste de restauração (RPO/RTO não definidos). (5) Sem backup de secrets e configurações.
- **Ação Corretiva:** (a) Configurar backup automático diário do Supabase (Point-in-Time Recovery). (b) Criptografar backups com chaves gerenciadas (AWS KMS / equivalent). (c) Armazenar backup em região diferente do primário. (d) Definir RPO (máx 24h) e RTO (máx 4h). (e) Testar restauração trimestralmente. (f) Backup de secrets e configurações de infraestrutura (IaC).
- **Prioridade:** Crítica (bloqueia produção)
- **Dono:** devops-automator / platform-engineer

### Item 23 — Cabeçalhos de Segurança HTTP
- **Status:** CRÍTICO
- **Evidência:** Não há cabeçalhos de segurança HTTP em `server.ts` (sem `helmet`). Não há `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Embedder-Policy`, `Cross-Origin-Opener-Policy`.
- **Gap:** (1) Nenhum header de segurança enviado. (2) Aplicação vulnerável a clickjacking, MIME sniffing, XSS, referrer leakage. (3) Não há proteção contra ataques de navegador (cross-origin isolation).
- **Ação Corretiva:** (a) Implementar `helmet` ou headers manuais completos. (b) `Content-Security-Policy` restritiva. (c) `X-Content-Type-Options: nosniff`. (d) `X-Frame-Options: DENY`. (e) `Strict-Transport-Security: max-age=31536000; includeSubDomains`. (f) `Referrer-Policy: strict-origin-when-cross-origin`. (g) `Permissions-Policy` restritivo (câmera, microfone, geolocation desabilitados se não usados).
- **Prioridade:** Alta
- **Dono:** senior-secops-engineer / frontend-developer

---

## SUMÁRIO EXECUTIVO DA ÁREA 2

### Nota Geral de Prontidão: 28 / 100

O repositório **não está pronto para produção** sob a ótica de segurança e compliance. Dos 23 itens auditados, apenas 2 estão parcialmente atendidos (RBAC básico e audit logs com limitações), enquanto 21 apresentam gaps críticos ou de atenção. Vários itens são **bloqueadores absolutos** para go-live.

### Principais Riscos de Segurança

| Risco | Impacto | Probabilidade | Item |
|-------|---------|---------------|------|
| Secrets expostos em `.env` (chaves Supabase service_role, NVIDIA API keys, senha do banco) | Crítico — comprometimento total da infraestrutura | Alta | Item 4 |
| Sem rate limiting — brute force, abuso de IA, DoS | Alto | Alta | Item 10 |
| Sem CORS configurado — ataque de origem cruzada | Alto | Alta | Item 9 |
| Sem CSRF protection — requisições não autorizadas | Alto | Alta | Item 8 |
| Sem headers de segurança (CSP, HSTS, etc.) — XSS, clickjacking | Alto | Alta | Item 11 / 23 |
| Sem SAST/DAST/SCA — vulnerabilidades não detectadas | Alto | Alta | Item 15 / 16 / 17 |
| Sem penetration testing — validação independente ausente | Alto | Alta | Item 18 |
| Sem plano de resposta a incidentes — incapacidade de responder a violação | Crítico | Média | Item 19 |
| Sem compliance LGPD/GDPR/SOC2 — multas e impedimento legal | Crítico | Alta | Item 20 |
| Sem backup criptografado — perda irreparável de dados | Crítico | Média | Item 22 |
| Hardcoded default passwords (`rsplay123`, `poder123`) | Alto | Alta | Item 4 |

### Bloqueadores para Produção (must-fix antes do go-live)

1. **Remover e rotacionar todos os secrets expostos** (Item 4 — CRÍTICO)
2. **Implementar rate limiting** em todos os endpoints (Item 10 — CRÍTICO)
3. **Configurar CORS restritivo** (Item 9 — CRÍTICO)
4. **Implementar proteção CSRF** (Item 8 — CRÍTICO)
5. **Implementar headers de segurança HTTP** (Item 11/23 — CRÍTICO)
6. **Realizar penetration testing autorizado** antes do go-live (Item 18 — CRÍTICO)
7. **Elaborar plano de resposta a incidentes** (Item 19 — CRÍTICO)
8. **Implementar compliance LGPD/GDPR mínimo** (PIA, ROPA, DSAR, DPO) (Item 20 — CRÍTICO)
9. **Configurar backup criptografado com teste de restauração** (Item 22 — CRÍTICO)
10. **Configurar SAST + SCA + DAST no CI** (Itens 15/16/17 — CRÍTICO)

---

## RECOMENDAÇÕES DE IMPLANTAÇÃO (em ordem de prioridade)

### Fase 1 — Bloqueadores (semana 1–2): Não ir para produção sem estes itens

| Prioridade | Ação | Responsável | Prazo |
|------------|------|-------------|-------|
| 1 | Remover `.env` do repositório, rotacionar todos os secrets (Supabase keys, NVIDIA keys, Cloudflare token, Evolution API key, senha do banco), migrar para secret manager | senior-secops-engineer | 3 dias |
| 2 | Eliminar hardcoded default passwords (`rsplay123`, `poder123`) em seeds | application-security-engineer | 2 dias |
| 3 | Implementar rate limiting (`express-rate-limit`) em todos os endpoints | senior-secops-engineer | 5 dias |
| 4 | Configurar CORS restritivo com whitelist de origens | senior-secops-engineer | 3 dias |
| 5 | Implementar proteção CSRF (Origin/Referer validation, SameSite cookie) | senior-secops-engineer | 5 dias |
| 6 | Implementar headers de segurança HTTP (helmet: CSP, HSTS, X-Frame-Options, etc.) | senior-secops-engineer / frontend-developer | 5 dias |
| 7 | Configurar SAST (CodeQL/Semgrep) e SCA (npm audit/Snyk) no CI | devops-automator / application-security-engineer | 7 dias |
| 8 | Contratar e executar penetration testing autorizado; corrigir findings críticos/altos | penetration-tester | 15 dias |
| 9 | Elaborar Plano de Resposta a Incidentes (IRP) com SLAs e contatos de escalonamento | incident-response-commander | 10 dias |
| 10 | Implementar compliance LGPD/GDPR mínimo: PIA, ROPA, DPO nomeado, endpoints DSAR (exportar/excluir dados) | compliance-auditor / data-privacy-officer / legal-compliance-checker | 15 dias |
| 11 | Configurar backup criptografado automático do Supabase com teste de restauração | devops-automator / platform-engineer | 7 dias |

### Fase 2 — Fortalecimento (semana 3–6): Ir para produção com monitoramento

| Prioridade | Ação | Responsável | Prazo |
|------------|------|-------------|-------|
| 12 | Migrar token de sessão para cookie `HttpOnly; Secure; SameSite=Strict` ou sessão Supabase nativa com refresh token | identity-access-engineer | 1 semana |
| 13 | Implementar MFA para admin/owner | identity-access-engineer | 1 semana |
| 14 | Validar `X-Organization-Id` contra memberships do usuário (anti org-hopping) | application-security-engineer | 3 dias |
| 15 | Adicionar validação de esquema (Zod) em todos os parâmetros de query/path | application-security-engineer | 1 semana |
| 16 | Sanitizar output de texto livre (DOMPurify) e conteúdo de IA | frontend-developer | 1 semana |
| 17 | Enviar logs de segurança para SIEM/centralized logging com IP e user_agent | application-security-engineer / incident-responder | 1 semana |
| 18 | Implementar detecção de prompt injection e sanitização de prompts de usuário para IA | ai-generated-code-security-auditor | 1 semana |
| 19 | Configurar DAST (OWASP ZAP/Nuclei) em pipeline de staging | penetration-tester / test-automation-engineer | 1 semana |

### Fase 3 — Maturidade (mês 2–3): Operação contínua

| Prioridade | Ação | Responsável | Prazo |
|------------|------|-------------|-------|
| 20 | Conduzir threat model STRIDE formal para novos features | application-security-engineer | Contínuo |
| 21 | Implementar ABAC mínimo (IP allowlist, horário) para admin | identity-access-engineer | 2 semanas |
| 22 | Configurar IdP OIDC (Google/Microsoft) para SSO corporativo | identity-access-engineer | 3 semanas |
| 23 | Implementar log imutável (WORM) ou assinatura digital para audit logs | application-security-engineer | 2 semanas |
| 24 | Definir e publicar SLA de remediação de vulnerabilidades (Crítico 7d, Alto 30d, Médio 90d) | senior-secops-engineer | 1 semana |
| 25 | Treinar desenvolvedores em secure coding e nomear security champions por time | application-security-engineer | Contínuo |
| 26 | Executar pentest anual e tabletop exercise de resposta a incidentes semestral | penetration-tester / incident-response-commander | Anual / Semestral |

---

### Critério de Sucesso para Produção

O sistema só deve ser considerado pronto para produção quando:
- **Zero** itens com status CRÍTICO sem resolução
- **Zero** secrets expostos em código ou git history
- Penetration testing aprovado sem findings críticos/altos não corrigidos
- Plano de resposta a incidentes documentado e testado
- Backup criptografado com restauração testada com sucesso
- Compliance LGPD/GDPR mínimo implementado (PIA, ROPA, DSAR, DPO)
- SAST + SCA + DAST passando no CI com gate de build
