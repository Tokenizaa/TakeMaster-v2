# 🛡️ Threat Model STRIDE — TakeMaster v2

**Projeto:** TakeMaster-v2 / RSPlay TV SaaS  
**Responsável:** Application Security Engineer  
**Versão:** 1.0  
**Data:** 22 Out 2026  
**Status:** Obrigatório para todos os novos features antes do go-live

---

## 1. OBJETIVO

Estabelecer um processo formal de threat modeling usando STRIDE para identificar, classificar e mitigar ameaças em todos os novos features e alterações arquiteturais.

---

## 2. METODOLOGIA STRIDE

| Categoria | Significado | Pergunta-chave |
|-----------|-------------|----------------|
| **S**poofing | Falsificação de identidade | O atacante pode se passar por outro usuário/sistema? |
| **T**ampering | Violação de integridade | Os dados podem ser modificados indevidamente? |
| **R**epudiation | Negação de ação | O usuário pode negar ter executado uma ação? |
| **I**nformation Disclosure | Vazamento de informação | Dados sensíveis podem ser acessados por não autorizados? |
| **D**enial of Service | Negação de serviço | O serviço pode ser tornado indisponível? |
| **E**levation of Privilege | Elevação de privilégio | Um usuário pode acessar funções de admin? |

---

## 3. PROCESSO DE THREAT MODELING

### 3.1 Quando executar

Obrigatório para: novos endpoints, novos fluxos de auth/autorização, integrações com terceiros (NVIDIA NIM, Evolution API), alterações no modelo de dados, novos fluxos de pagamento/billing, features com PII ou dados sensíveis.

### 3.2 Etapas

1. Desenhar o Data Flow Diagram (DFD) — mapear trust boundaries, entidades, fluxos e armazenamentos
2. Identificar ameaças — aplicar STRIDE a cada elemento do DFD
3. Classificar riscos — matriz de risco (Impacto × Probabilidade)
4. Definir mitigações — controles técnicos e procedimentais para cada ameaça
5. Documentar requisitos de segurança nos critérios de aceitação

---

## 4. THREAT MODEL — TAKEMASTER V2 (ATUAL)

| # | Componente | Ameaça STRIDE | Descrição | Mitigação | Status |
|---|------------|---------------|-----------|-----------|--------|
| 1 | Sessão (cookie tmv2) | Spoofing | Token de sessão roubado via XSS | Cookie HttpOnly + SameSite=Strict + CSP | Implementado (Fase 2) |
| 2 | X-Organization-Id | Spoofing/EoP | Usuário acessa org não pertencente | Validação contra memberships (anti org-hopping) | Implementado (Fase 2) |
| 3 | Endpoints de escrita | Tampering | Modificação não autorizada de dados | CSRF protection + RBAC + Idempotency-Key | Implementado (Fase 2/3) |
| 4 | Audit log | Repudiation | Apagar/alterar evidências de ações | Log imutável (WORM/hash-chain) | Fase 4 |
| 5 | Secrets (.env) | Information Disclosure | Chaves expostas no repositório | Remoção do .env + secret manager | Implementado (Fase 1) |
| 6 | Endpoints públicos | DoS | Excesso de requisições | Rate limiting (auth: 5/min, AI: 30/min, geral: 100/min) | Implementado (Fase 1) |
| 7 | IA / NVIDIA NIM | Information Disclosure | Prompt injection vaza dados | Detecção de prompt injection + sanitização | Implementado (Fase 2) |
| 8 | API pública | Elevation of Privilege | Acesso sem versionamento | Versionamento /api/v1/ + OpenAPI | Implementado (Fase 3) |
| 9 | Dependências | Tampering | Dependência comprometida | SCA (bun audit) + Dependabot/Renovate | Implementado (Fase 1) |
| 10 | Código-fonte | Tampering | Vulnerabilidade injetada no código | SAST (Semgrep) + Code Review | Implementado (Fase 1) |

---

## 5. MATRIZ DE RISCO

| Probabilidade \ Impacto | Baixo | Médio | Alto | Crítico |
|-------------------------|-------|-------|------|---------|
| Baixo | Baixo | Baixo | Médio | Alto |
| Médio | Baixo | Médio | Alto | Crítico |
| Alto | Médio | Alto | Crítico | Crítico |

---

## 6. CHECKLIST ANTES DO GO-LIVE

- [ ] Threat model STRIDE concluído para todos os endpoints críticos
- [ ] Cada ameaça tem mitigação documentada e implementada
- [ ] Penetration testing aprovado sem findings críticos/altos
- [ ] Revisão de ameaças agendada a cada release maior

---

## 7. REFERÊNCIA

- OWASP Threat Modeling: https://owasp.org/www-community/Threat_Modeling
- STRIDE: https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-stride
