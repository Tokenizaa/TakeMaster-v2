# 🎓 Treinamento Secure Coding e Security Champions

**Projeto:** TakeMaster-v2 / RSPlay TV SaaS  
**Responsável:** Application Security Engineer  
**Versão:** 1.0  
**Data:** 22 Out 2026

---

## 1. OBJETIVO

Capacitar desenvolvedores em práticas de secure coding e estabelecer o programa de Security Champions por time.

---

## 2. PROGRAMA DE TREINAMENTO

### 2.1 Módulos Obrigatórios (todos os desenvolvedores)

| Módulo | Tema | Duração | Frequência |
|--------|------|---------|------------|
| M1 | Fundamentos de Segurança de Aplicação | 2h | Anual |
| M2 | OWASP Top 10 (2021/2025) | 3h | Anual |
| M3 | Autenticação e Autorização Segura | 2h | Anual |
| M4 | Validação de Entrada e Sanitização | 2h | Semestral |
| M5 | Secrets Management e Criptografia | 1h | Anual |
| M6 | Logging e Monitoramento de Segurança | 1h | Semestral |

### 2.2 Módulos Avançados (Security Champions)

| Módulo | Tema | Duração | Frequência |
|--------|------|---------|------------|
| M7 | Threat Modeling STRIDE | 3h | Semestral |
| M8 | Code Review Focado em Segurança | 3h | Semestral |
| M9 | Resposta a Incidentes para Desenvolvedores | 2h | Anual |
| M10 | DevSecOps e CI/CD Seguro | 2h | Semestral |

---

## 3. PROGRAMA DE SECURITY CHAMPIONS

### 3.1 Papel do Security Champion

- Ponto de contato de segurança no time de desenvolvimento
- Revisa PRs com foco em segurança (secure code review)
- Identifica ameaças durante o desenvolvimento (threat modeling leve)
- Promove cultura de segurança no time
- Reporta vulnerabilidades ao security team

### 3.2 Seleção

- 1 Security Champion por time de desenvolvimento
- Nomeado pelo tech lead + security lead
- Mandato de 6 meses (renovável)
- Deve ter completado módulos M1-M6 + M7-M8

### 3.3 Responsabilidades

| Frequência | Atividade |
|----------|-----------|
| Semanal | Revisar PRs com foco em segurança |
| Mensal | Reunião com security lead para alinhamento |
| Trimestral | Threat model leve para novas features |
| Semestral | Participar de tabletop exercise |

---

## 4. SECURE CODE REVIEW CHECKLIST

- [ ] Validação de entrada em todos os parâmetros (Zod/schemas)
- [ ] Sanitização de output para prevenir XSS
- [ ] Uso de queries parameterizadas (prevenir SQLi)
- [ ] Ausência de hardcoded secrets/credentials
- [ ] Headers de segurança configurados (helmet)
- [ ] Rate limiting em endpoints sensíveis
- [ ] Controle de acesso (RBAC/ABAC) verificado
- [ ] Logs de segurança com IP e user_agent
- [ ] Tratamento seguro de erros (não vazar stack traces)
- [ ] Dependências atualizadas (sem vulnerabilidades conhecidas)

---

## 5. CHECKLIST DE IMPLEMENTAÇÃO

- [ ] Nomear 1 Security Champion por time
- [ ] Concluir treinamento M1-M6 por todos os desenvolvedores
- [ ] Concluir treinamento M7-M8 por todos os Security Champions
- [ ] Implementar secure code review checklist em todos os PRs
- [ ] Agendar tabletop exercise semestral
- [ ] Documentar processos de segurança no wiki interno

---

## 6. REFERÊNCIA

- OWASP Top 10: https://owasp.org/www-project-top-ten/
- SANS Secure Coding: https://www.sans.org/security-curriculum/
- Security Champions: https://www.owasp.org/www-project-security-champions/
