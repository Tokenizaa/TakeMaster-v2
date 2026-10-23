# OpenCode — Escopo Local do TakeMaster v2

Este diretório contém skills específicas do domínio TakeMaster (RSPlay TV SaaS). A orquestração geral permanece com o **@supervisor global**. Não criar aqui uma segunda camada de runtime, state machine ou agent-loop.

---

## 🏗️ Arquitetura de Domínios (Bounded Contexts)

```
┌─────────────────────────────────────────────────────────────────┐
│                      SHARED KERNEL                              │
│  src/domain/contracts.ts  •  src/domain/validation.ts          │
│  Tipos canônicos, validação Zod, códigos de erro padronizados   │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ (todos dependem)
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  PROGRAM      │    │  CONTENT      │    │  TALENT       │
│  CATALOG      │    │  INTELLIGENCE │    │  MANAGEMENT   │
│  (shows)      │    │  (AI content) │    │  (guests)     │
└───────┬───────┘    └───────┬───────┘    └───────┬───────┘
        │                    │                    │
        │                    ▼                    │
        │            ┌───────────────┐            │
        └───────────►│  EPISODE      │◄───────────┘
                     │  PRODUCTION   │
                     │  (orchestrator)│
                     └───────┬───────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  MEDIA        │    │  TECHNICAL    │    │  PRODUCTION   │
│  LIBRARY      │    │  PRODUCTION   │    │  MANAGEMENT   │
│  (assets)     │    │  (cameras)    │    │  (seasons)    │
└───────┬───────┘    └───────┬───────┘    └───────┬───────┘
        │                    │                    │
        │         ┌──────────┴──────────┐        │
        │         ▼                     ▼        │
        │  ┌───────────┐          ┌───────────┐   │
        └─►│ SCHEDULING│          │  BILLING  │◄──┘
           │ CALENDAR  │          │SUBSCRIPTIONS│
           └───────────┘          └───────────┘
                    │
         ┌──────────┴──────────┐
         ▼                     ▼
  ┌─────────────┐       ┌─────────────┐
  │   ADMIN     │       │  PROGRAM    │
  │  REPORTING  │       │  KNOWLEDGE  │
  └─────────────┘       └─────────────┘
         │
         ▼
  ┌─────────────┐
  │    AUTH     │
  │AUTHORIZATION│
  └─────────────┘
```

**Camadas:**
- **Core (Leaf)**: Program Catalog — só exporta, não importa
- **Supporting**: Content Intelligence, Talent Management, Media Library, Technical Production, Production Management
- **Orchestrator**: Episode Production — consome todos os supporting
- **Cross-cutting**: Scheduling, Billing, Auth, Program Knowledge
- **Observability**: Admin Reporting — lê de todos (read-only via persistence)

---

## 📦 Skills Locais (12 Domínios)

| Skill | Domínio | Responsabilidade Principal | Endpoints API |
|-------|---------|---------------------------|---------------|
| `agent-program-catalog` | **Program Catalog** | CRUD de Shows/Programas, formatos, estrutura padrão, câmeras default | `/api/shows`, `/api/programs` |
| `agent-content-intelligence` | **Content Intelligence** | Geração de conteúdo por IA: diagnósticos, pesquisas, outlines, roteiros, shorts, síntese de edição | `/api/ai/*` (9 endpoints) |
| `agent-episode-production` | **Episode Production** | Ciclo de vida completo de episódios (draft → published), participantes, segmentos, scripts, assets, gravação, pós-produção | `/api/episodes` |
| `agent-talent-management` | **Talent Management** | CRUD de participantes/convidados, tipos, bio, links, associação a programas, histórico de participações | `/api/participants`, `/api/guests` |
| `agent-media-library` | **Media Library** | Assets reutilizáveis: vinhetas, trilhas, templates, B-roll, cenários. Categorização, tagging, status, licenças | `/api/library` |
| `agent-technical-production` | **Technical Production** | Configuração de câmeras, checklists técnicos, marcadores de gravação, recursos técnicos, qualidade de sinal | Via episódios |
| `agent-production-management` | **Production Management** | CRUD de produções (temporada/season-level), status, produtor executivo, associação a show | `/api/productions` |
| `agent-scheduling-calendar` | **Scheduling Calendar** | Agendamento de eventos: gravações, ensaios, briefings, deadlines. Conflitos de estúdio/equipe | `/api/schedule` |
| `agent-billing-subscriptions` | **Billing & Subscriptions** | Planos SaaS, assinaturas org/show-level, renovação automática, gateways pagamento, invoices | `/api/billing` |
| `agent-admin-reporting` | **Admin Reporting** | Dashboards admin: MRR, saúde por show, auditoria, métricas sistema, health check | `/api/admin`, `/api/metrics`, `/api/health` |
| `agent-program-knowledge` | **Program Knowledge** | Base de conhecimento RSPlay: scraping, identidade editorial, sugestão de pautas/pitches | `/api/knowledge-base` |
| `agent-auth-authorization` | **Auth & Authorization** | Login, sessões, RBAC por programa, troca de org, middleware assertProgramAccess | `/api/auth` |

---

## 🔗 Grafo de Dependências (Contratos de Integração)

### Regras de Ouro
1. **Shared Kernel só exporta** — `contracts.ts` e `validation.ts` são somente leitura para domínios
2. **Dependências fluem para o centro** — Domínios dependem do catálogo, não o contrário
3. **Episode Production é consumidor, não provedor** — Não deve ser importado por outros domínios de negócio
4. **Content Intelligence provê, não consome episódio** — Recebe contexto via DTO, não importa o domínio
5. **Cross-cutting domains** (Scheduling, Billing, Auth, Program Knowledge) — importam apenas Program Catalog + Auth
6. **Admin Reporting é read-only** — consome via persistence layer, não importa domínios

### Matriz de Acesso (✅ = Pode importar/consumir | ❌ = Proibido)

| De \ Para | Program Catalog | Content Intelligence | Episode Production | Talent Management | Media Library | Technical Production | Production Mgmt | Scheduling | Billing | Admin Reporting | Program Knowledge | Auth |
|-----------|-----------------|----------------------|--------------------|-------------------|---------------|----------------------|-----------------|------------|---------|-----------------|-------------------|------|
| **Program Catalog** | — | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Content Intelligence** | ✅ | — | ❌ (API) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Episode Production** | ✅ | ✅ (API) | — | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Talent Management** | ✅ | ❌ | ❌ | — | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Media Library** | ✅ | ❌ | ❌ | ❌ | — | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Technical Production** | ✅ | ❌ | ❌ | ❌ | ❌ | — | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Production Mgmt** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | — | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Scheduling** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | — | ❌ | ❌ | ❌ | ❌ |
| **Billing** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | — | ❌ | ❌ | ✅ (role check) |
| **Admin Reporting** | ❌ (persistence) | ❌ (persistence) | ❌ (persistence) | ❌ (persistence) | ❌ (persistence) | ❌ (persistence) | ❌ (persistence) | ❌ (persistence) | ❌ (persistence) | — | ❌ | ❌ |
| **Program Knowledge** | ✅ | ✅ (AI) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | — | ❌ |
| **Auth** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | — |

### ⚠️ Problemas Detectados e Corrigidos

| Issue | Status | Descrição |
|-------|--------|-----------|
| **Circular Dependency** | ✅ Fixed | `episode-production` ↔ `content-intelligence` — agora CI consumido via API |
| **God Domain** | ✅ Fixed | `episode-production` não importa mais CI diretamente |
| **Inverted Dependency** | ✅ Fixed | `program-catalog` é leaf (zero imports) |
| **Missing Forbidden Imports** | ✅ Fixed | Todas skills declaram `NUNCA Importa de` explícito |
| **Monolithic Types** | 🟡 Pending | `src/types/index.ts` re-exporta tudo — ADR-004 planejado |

---

## 📋 Contratos Públicos por Domínio

### Program Catalog (`agent-program-catalog`)
```typescript
// src/types/index.ts → Show, ShowFormat, CameraConfig, ProgramDefaultSegment
// Endpoints: GET/POST/PUT/DELETE /api/shows, /api/programs
// Validação: validateShowPayload (Zod)
```

### Content Intelligence (`agent-content-intelligence`)
```typescript
// src/server/ai.ts → 9 funções de geração
// Endpoints: POST /api/ai/diagnosis, /api/ai/research, /api/ai/outline,
//            /api/ai/script, /api/ai/shorts, /api/ai/editor-synthesis,
//            /api/ai/contextual-assist, /api/ai/program-identity, /api/ai/pitch
// Contrato: Recebe DTOs tipados, retorna estruturas validadas
```

### Episode Production (`agent-episode-production`)
```typescript
// src/types/index.ts → Episode, EpisodeStatus, EpisodeParticipant, Segment,
//                      QuestionItem, ScriptItem, PlannedShort, ProductionAsset,
//                      RecordingMarker, TechnicalChecklist, EditorialDiagnosis, ResearchData
// Endpoints: CRUD completo /api/episodes + hidratação de relacionamentos
// Estado: draft → diagnosis → research → outline → scripting → ready → recording → recorded → editing → published
```

### Talent Management (`agent-talent-management`)
```typescript
// src/types/index.ts → Guest (alias Participant), ParticipantType, EpisodeParticipant
// Endpoints: CRUD /api/participants, /api/guests + attachProgramLegacy
```

### Media Library (`agent-media-library`)
```typescript
// src/types/index.ts → LibraryAsset, ProductionAsset, ProductionMaterial, AssetType, AssetStatus
// Endpoints: CRUD /api/library + busca por tags/categoria/tipo
```

### Technical Production (`agent-technical-production`)
```typescript
// src/types/index.ts → CameraConfig, TechnicalChecklist, TechnicalChecklistItem, RecordingMarker, RecordingMarkerType
// Endpoints: Via episódio (câmeras, checklist, marcadores fazem parte do Episode)
```

### Production Management (`agent-production-management`)
```typescript
// src/types/index.ts → Production, ProductionStatus
// Endpoints: CRUD /api/productions
// Validação: validateProductionPayload (Zod)
// Relacionamento: Production → Show (1:N), Production → Episodes (1:N)
```

### Scheduling Calendar (`agent-scheduling-calendar`)
```typescript
// src/types/index.ts → ScheduleEvent, ScheduleEventType, ScheduleEventStatus, AgendaEvent
// Endpoints: CRUD /api/schedule + filtros por show/production/episode/date/status
// Validação: validateScheduleEventPayload (Zod)
// Conflitos: mesmo estúdio/equipe no mesmo horário
```

### Billing & Subscriptions (`agent-billing-subscriptions`)
```typescript
// src/types/index.ts → OrganizationPlan, SubscriptionPlanId, SaaSSubscription, PaymentIntent,
//                      BillingInvoice, PaymentGatewayEvent, PaymentMethodType, SetupState
// Endpoints: GET /api/billing/overview, POST /api/billing/subscribe,
//            POST /api/billing/subscriptions/:id/auto-renew, POST /api/billing/subscriptions/:id/renew-now
// Admin: GET /api/admin/report (MRR, subscriptions, invoices)
// Webhooks: confirmPaymentAndActivateSubscription, handlePaymentFailure
```

### Admin Reporting (`agent-admin-reporting`)
```typescript
// src/types/index.ts → AdminReportSummary, AuditLogEntry
// Endpoints: GET /api/admin/overview, GET /api/admin/report (buildAdminReportSummary)
// Métricas: GET /api/metrics, GET /api/health
// Função central: buildAdminReportSummary(orgId) em persistence.ts
// Auditoria: listAuditLogs(orgId, filters)
```

### Program Knowledge (`agent-program-knowledge`)
```typescript
// src/domain/aiContracts.ts → ProgramKnowledgeSource, ProgramKnowledgeSummary,
//                              ProgramEditorialIdentity, ProgramPitchSuggestion,
//                              ProgramPitchRequestInput, ProgramPitchCurationResponse
// Endpoints:
//   GET /api/knowledge-base/shows/:showId/knowledge
//   POST /api/knowledge-base/shows/:showId/editorial-identity
//   POST /api/knowledge-base/shows/:showId/suggest-pautas
//   GET /api/knowledge-base/shows
// Funções: resolveProgramKnowledge, listAvailableKnowledgeBasePrograms
// IA: generateProgramEditorialIdentity, generateProgramPitchSuggestions
```

### Auth & Authorization (`agent-auth-authorization`)
```typescript
// src/types/index.ts → User, OrganizationRole, PlatformRole, UserShowPermission,
//                      AuthSession, OrganizationMembership
// Endpoints: POST /api/auth/session, /api/auth/login, /api/auth/switch-org, GET /api/auth/session
// Funções: verifySessionToken, buildAuthSession, loginWithEmailOrUserId, resolveRequestAuthContext
// Middleware: assertOrganizationMember, assertProgramAccess, assertShowPermission
// Hooks: usePermissions (frontend)
```

---

## 🛡️ Shared Kernel — `src/domain/contracts.ts`

**Este é o único contrato compartilhado permitido.** Todos os domínios importam tipos daqui.

### Princípios
- **Imutável para domínios** — Mudanças exigem ADR + aprovação @supervisor
- **Validação centralizada** — `src/domain/validation.ts` (Zod schemas) é fonte única de verdade
- **Tipos brutos vs Tipos de domínio** — `contracts.ts` = tipos de banco/API; domínios podem ter view models próprios

### O que NÃO vai no Shared Kernel
- Lógica de negócio de domínio
- Funções de IA
- Componentes React
- Configurações de câmera específicas de programa

---

## 🔄 Padrões de Integração

### 1. Content Intelligence → Episode Production (Assíncrono, via API)
```
Episode Production chama POST /api/ai/* com DTO contextual
     ↓
Content Intelligence processa (usa 9Router/NVIDIA NIM)
     ↓
Retorna estrutura tipada (EditorialDiagnosis, ResearchData, OutlineBlock[], etc.)
     ↓
Episode Production persiste no episódio
```
**NUNCA** importar `episode-production` dentro de `content-intelligence`.

### 2. Program Catalog → Todos (Referência somente leitura)
```
Outros domínios importam tipos Show/ShowFormat/CameraConfig
     ↓
Chamam GET /api/shows/:id para validar existência
     ↓
NUNCA chamam mutações no catálogo
```

### 3. Episode Production ↔ Talent/Media/Technical (Associação bidirecional)
```
Episode Production valida IDs via GET /api/participants/:id
     ↓
Associa via EpisodeParticipant / ProductionAsset / CameraConfig
     ↓
Outros domínios expõem endpoints de consulta, não mutação cruzada
```

### 4. Cross-cutting Domains → Persistence Layer (Read-only)
```
Admin Reporting, Billing, Scheduling, Program Knowledge
     ↓
Chamam funções em persistence.ts (listX, getX, createX)
     ↓
NÃO importam tipos de domínio diretamente — usam contratos compartilhados
```

---

## ❌ Anti-Padrões (Vetados pelo Architecture Review)

| Padrão | Por que é ruim | Alternativa |
|--------|----------------|-------------|
| `import { Episode } from '@/domain/episode'` em Content Intelligence | Acoplamento circular, quebra deploy independente | Usar DTOs via API ou tipos do shared kernel |
| `program-catalog` importando `episode-production` | Inversão de dependência, catálogo vira god object | Catálogo é leaf; episódios consomem catálogo |
| Tipos `Episode` com `[key: string]: any` | Perde type safety, esconde schema real | Definir interfaces explícitas no shared kernel |
| `agent-ia` não listado em skills locais | IA é capacidade transversal, não domínio | Adicionar ao AGENTS.md ou mover para global |
| Duplicar validação Zod em cada domínio | Drift de schema, bugs silenciosos | Usar `validateEpisodePayload` etc. de `validation.ts` |
| Admin Reporting importando domínios | Acoplamento desnecessário, quebra isolamento | Ler via persistence layer (buildAdminReportSummary) |

---

## ✅ Checklist para Nova Skill Local

Antes de criar `agent-novo-dominio`:

1. [ ] **Bounded context claro** — Responsabilidade única, não sobrepõe domínios existentes
2. [ ] **Contrato público definido** — Tipos em `contracts.ts` + endpoints `/api/novo-dominio`
3. [ ] **Matriz de acesso preenchida** — De quem consome / para quem exporta
4. [ ] **`NUNCA Importa de` explícito** — Listar domínios proibidos
5. [ ] **Validação Zod centralizada** — Adicionar em `validation.ts`
6. [ ] **ADR criado** — Documentar decisão arquitetural
7. [ ] **Teste de integração** — Verificar que não quebra domínios existentes
8. [ ] **Registrar no AGENTS.md** — Atualizar esta tabela e grafo

---

## 📁 Estrutura de Diretórios por Domínio

```
src/
├── domain/
│   ├── contracts.ts          # SHARED KERNEL (readonly para domínios)
│   ├── validation.ts         # Zod schemas centralizados
│   └── aiContracts.ts        # Tipos específicos de IA (Content Intelligence + Program Knowledge)
├── server/
│   ├── persistence.ts        # Camada de dados (Supabase) — shared
│   ├── ai.ts                 # Content Intelligence ONLY
│   ├── programKnowledge.ts   # Program Knowledge ONLY
│   ├── auth.ts               # Auth & Authorization ONLY
│   ├── authorization.ts      # Auth middleware ONLY
│   └── routes/               # Routers por domínio
├── components/
│   ├── ProgramCatalog/       # agent-program-catalog
│   ├── ContentIntelligence/  # agent-content-intelligence
│   ├── EpisodeProduction/    # agent-episode-production
│   ├── TalentManagement/     # agent-talent-management
│   ├── MediaLibrary/         # agent-media-library
│   ├── TechnicalProduction/  # agent-technical-production
│   ├── ProductionManagement/ # agent-production-management
│   ├── SchedulingCalendar/   # agent-scheduling-calendar
│   ├── BillingSubscriptions/ # agent-billing-subscriptions
│   ├── AdminReporting/       # agent-admin-reporting
│   ├── ProgramKnowledge/     # agent-program-knowledge
│   └── AuthAuthorization/    # agent-auth-authorization
└── types/index.ts            # Re-exporta contracts.ts (entry point)
```

---

## 🎯 Critérios de Sucesso por Skill

| Skill | Critério Principal | Gate de Qualidade |
|-------|-------------------|-------------------|
| program-catalog | CRUD shows + formatos + câmeras default | TypeCheck + Lint + Testes de validação |
| content-intelligence | 9 endpoints IA funcionando, zero hallucination | Testes de contrato + avaliação qualitativa |
| episode-production | Fluxo completo draft→published + hidratação | Testes E2E de ciclo de vida |
| talent-management | CRUD participantes + associação programas/episódios | Testes de integridade referencial |
| media-library | CRUD assets + busca/filtro tags + status | Testes de categorização |
| technical-production | Câmeras + checklists + marcadores validados | Testes de validação técnica |
| production-management | CRUD produções + associação show/episódios | Testes de integridade referencial |
| scheduling-calendar | CRUD eventos + detecção conflitos + calendário | Testes de conflitos + visualização |
| billing-subscriptions | Planos, assinaturas, renovação, webhooks idempotentes | Testes de pagamento + conciliação |
| admin-reporting | MRR correto, dashboard <2s, export CSV | Testes de agregação + performance |
| program-knowledge | Scraping → identidade editorial → pitches | Testes de match fuzzy + qualidade IA |
| auth-authorization | Login, RBAC por show, auditoria completa | Testes de permissão + segurança |

---

## 📝 Decision Log (ADRs Relacionados)

| ADR | Título | Status | Afeta Skills |
|-----|--------|--------|--------------|
| ADR-001 | Shared Kernel em contracts.ts | ✅ Accepted | Todas |
| ADR-002 | Episode Production como orquestrador (não god) | ✅ Accepted | episode-production, content-intelligence |
| ADR-003 | Content Intelligence assíncrono via API | ✅ Accepted | content-intelligence, episode-production |
| ADR-004 | Tipos de domínio separados do shared kernel | 📋 Proposed | Todas |
| ADR-005 | Cross-cutting domains (scheduling, billing, auth) via persistence | ✅ Accepted | scheduling, billing, auth, admin, program-knowledge |
| ADR-006 | Program Knowledge como domínio separado de AI | ✅ Accepted | program-knowledge, content-intelligence |

> **Arquivos**: Ver `docs/adr/ADR-XXX-*.md` e `docs/adr/decision-log.md`

---

## 🔧 Como Estender

### Adicionar endpoint de IA novo
1. Adicionar função em `src/server/ai.ts`
2. Adicionar validação em `src/domain/validation.ts` (se novo payload)
3. Registrar rota em `server.ts`
4. Atualizar `agent-content-intelligence/SKILL.md` (critérios de sucesso)

### Adicionar campo no Episode
1. Adicionar em `contracts.ts` (Shared Kernel)
2. Adicionar validação Zod em `validation.ts`
3. Atualizar mappers em `src/server/mappers.ts`
4. Atualizar `agent-episode-production/SKILL.md`
5. **NÃO** tocar em outros domínios

### Criar novo domínio (ex: `agent-scheduling`)
1. Seguir checklist "Nova Skill Local"
2. Criar `SKILL.md` seguindo template
3. Adicionar tipos em `contracts.ts` + validação
4. Criar router em `src/server/routes/scheduling.ts`
5. Registrar no AGENTS.md (esta tabela + grafo)

---

## 🔗 Referências Rápidas

| Arquivo | Descrição |
|---------|-----------|
| `src/domain/contracts.ts` | **Shared Kernel** — Tipos canônicos (833 linhas) |
| `src/domain/validation.ts` | Validação Zod centralizada |
| `src/domain/aiContracts.ts` | Tipos de IA (Content Intelligence + Program Knowledge) |
| `src/server/ai.ts` | 9 funções de IA (Content Intelligence) |
| `src/server/programKnowledge.ts` | Knowledge base scraping + editorial identity |
| `src/server/auth.ts` | Auth session, login, token verification |
| `src/server/authorization.ts` | Middleware assertOrganizationMember, assertProgramAccess |
| `src/server/persistence.ts` | Camada Supabase unificada + buildAdminReportSummary |
| `server.ts` | Entry point + roteamento API |
| `.opencode/skills/*/SKILL.md` | Contratos detalhados por domínio |

---

## 👥 Governança

- **@supervisor global** — Orquestra, resolve conflitos, valida shared kernel, controla roadmap
- **@qualidade** (agent-architecture-review) — Revisa PRs, veto power em violações de arquitetura
- **@documentacao** (agent-context) — Sincroniza ADRs, folder-structure, agent-topology, roadmap
- **Domínios locais** — Autonomia dentro de seus bounded contexts, respeitam matriz de acesso

> **Regra de Ouro**: Se uma mudança toca 2+ domínios ou o Shared Kernel, **precisa de ADR + aprovação @supervisor** antes de implementar.