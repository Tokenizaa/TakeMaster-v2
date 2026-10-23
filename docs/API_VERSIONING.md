# 📋 Versionamento de API e Contratos OpenAPI

**Projeto:** TakeMaster-v2 / RSPlay TV SaaS  
**Responsável:** API Platform Engineer / Backend Architect  
**Versão:** 1.0  
**Data:** 22 Out 2026

---

## 1. OBJETIVO

Estabelecer versionamento de API e contratos machine-readable (OpenAPI/Swagger) para permitir evolução sem breaking changes e geração automática de SDKs.

---

## 2. ESTRATÉGIA DE VERSIONAMENTO

### 2.1 Prefixo de URL

Todas as rotas da API v1 usam o prefixo `/api/v1/`:

```
GET  /api/v1/shows
POST /api/v1/shows
GET  /api/v1/shows/:id
PUT  /api/v1/shows/:id
DELETE /api/v1/shows/:id
```

### 2.2 Política de Deprecation

| Versão | Status | Data de Lançamento | Data de Deprecation | Data de Remoção |
|--------|--------|-------------------|---------------------|-----------------|
| v1 | Ativa | 2026-10 | — | — |
| v0 (legacy) | Deprecada | 2026-01 | 2026-10 | 2027-01 |

### 2.3 Headers de Versionamento

- `API-Version: 1` — header opcional para especificar versão
- `Deprecation: true` — enviado quando a versão está deprecada
- `Sunset: <data>` — data de remoção prevista

---

## 3. CONTRATO OPENAPI / SWAGGER

### 3.1 Arquivo de Especificação

O contrato OpenAPI 3.1 está em `docs/openapi/openapi.yaml`.

### 3.2 Geração de SDK

- SDK TypeScript gerado automaticamente a partir do OpenAPI
- Ferramenta: OpenAPI Generator ou orval
- Execução: CI/CD a cada alteração no contrato

### 3.3 Validação de Contrato

- Requests validados contra o esquema OpenAPI antes de chegar ao handler
- Responses validados para garantir conformidade com o contrato
- Zod schemas derivados do OpenAPI para validação de runtime

---

## 4. MAPEAMENTO DE ROTAS (v1)

| Recurso | Método | Rota v1 | Descrição |
|---------|--------|---------|-----------|
| Shows | GET | /api/v1/shows | Listar programas |
| Shows | POST | /api/v1/shows | Criar programa |
| Shows | GET | /api/v1/shows/:id | Obter programa |
| Shows | PUT | /api/v1/shows/:id | Atualizar programa |
| Shows | DELETE | /api/v1/shows/:id | Excluir programa |
| Episodes | GET | /api/v1/episodes | Listar episódios |
| Episodes | POST | /api/v1/episodes | Criar episódio |
| Episodes | GET | /api/v1/episodes/:id | Obter episódio |
| Episodes | PUT | /api/v1/episodes/:id | Atualizar episódio |
| Episodes | DELETE | /api/v1/episodes/:id | Excluir episódio |
| Productions | GET | /api/v1/productions | Listar produções |
| Auth | POST | /api/v1/auth/login | Autenticar |
| Auth | POST | /api/v1/auth/register | Registrar |
| Auth | POST | /api/v1/auth/logout | Encerrar sessão |
| Auth | GET | /api/v1/auth/session | Obter sessão |
| Billing | GET | /api/v1/billing/overview | Visão geral |
| Billing | POST | /api/v1/billing/subscribe | Assinar plano |
| Admin | GET | /api/v1/admin/overview | Painel admin |
| AI | POST | /api/v1/ai/diagnosis | Diagnóstico editorial |
| AI | POST | /api/v1/ai/research | Pesquisa |
| AI | POST | /api/v1/ai/outline | Roteiro |
| AI | POST | /api/v1/ai/script | Roteiro de estúdio |
| Schedule | GET | /api/v1/schedule | Agenda |
| Library | GET | /api/v1/library | Biblioteca de assets |
| Guests | GET | /api/v1/guests | Convidados |

---

## 5. CHECKLIST DE IMPLEMENTAÇÃO

- [ ] Criar `docs/openapi/openapi.yaml` com especificação OpenAPI 3.1
- [ ] Adicionar prefixo `/api/v1/` a todas as rotas da API
- [ ] Manter rotas `/api/` (sem versão) como redirect para v1 durante período de transição
- [ ] Implementar validação de request contra OpenAPI schema
- [ ] Gerar SDK TypeScript a partir do OpenAPI
- [ ] Documentar política de deprecation
- [ ] Adicionar header `API-Version` nas respostas

---

## 6. REFERÊNCIA

- `docs/openapi/openapi.yaml` — Especificação OpenAPI 3.1 completa
- OpenAPI Generator: https://openapi-generator.tech/
- orval: https://orval.dev/
