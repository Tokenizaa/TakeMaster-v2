# ADR-004: Tipos de Domínio Separados do Shared Kernel

## Status
Proposed

## Contexto
Atualmente `src/types/index.ts` re-exporta **todo** `contracts.ts`:
```typescript
export * from '../domain/contracts';
```

Problemas:
1. **Acoplamento via tipos** — Qualquer mudança em `Episode` quebra build de `MediaLibrary` mesmo sem relação
2. **God types file** — 833 linhas em `contracts.ts` misturando: User, Org, Show, Episode, Guest, Asset, Billing, AI, Knowledge Base
3. **Vazamento de responsabilidade** — `MediaLibrary` importa `Episode` só para acessar `ProductionAsset`
4. **Refatoração arriscada** — Renomear campo em `Episode` exige tocar 12 domínios
5. **Type safety falso** — `[key: string]: any` em `Episode`, `Guest`, `CameraConfig` esconde schema real

## Decisão
**Separar tipos em 3 camadas:**

### 1. Shared Kernel (`src/domain/contracts.ts`) — Apenas contratos de integração
Tipos que **precisam** ser compartilhados entre domínios:
- Identidade: `User`, `Organization`, `OrganizationRole`, `PlatformRole`
- Permissões: `UserShowPermission`, `AuthSession`, `OrganizationMembership`
- Catálogo: `Show`, `ShowFormat`, `CameraConfig`, `ProgramDefaultSegment`
- Enums base: `EpisodeStatus`, `ProductionStatus`, `CatalogStatus`, `AssetType`, `AssetStatus`
- Erros: `ApiErrorCode`, `StandardizedApiError`
- Billing: `SubscriptionPlanId`, `SaaSSubscription`, `PaymentIntent`, `BillingInvoice`

### 2. Domain Types (`src/domain/types/<domain>.ts`) — Tipos internos por domínio
Cada domínio define seus **view models** e tipos de entrada/saída:

```
src/domain/types/
├── episode.ts        # Episode, EpisodeParticipant, OutlineBlock, QuestionItem, ScriptItem, PlannedShort, EditorialDiagnosis, ResearchData, ProductionAsset, RecordingMarker, TechnicalChecklist, ScriptVersion
├── talent.ts         # Guest, ParticipantType, EpisodeParticipant (view)
├── media.ts          # LibraryAsset, ProductionAsset, ProductionMaterial
├── technical.ts      # CameraConfig (extendido), TechnicalChecklistItem, RecordingMarkerType
├── production.ts     # Production, ProductionStatus
├── scheduling.ts     # ScheduleEvent, ScheduleEventType, ScheduleEventStatus, AgendaEvent
├── billing.ts        # SetupState, SaaSPlanDefinition, PaymentMethodType, PaymentGatewayEvent
├── admin.ts          # AdminReportSummary, AuditLogEntry
├── knowledge.ts      # ProgramKnowledgeSource, ProgramKnowledgeSummary, ProgramEditorialIdentity, ProgramPitchSuggestion, ProgramPitchRequestInput, ProgramPitchCurationResponse
└── auth.ts           # UserShowPermission (extendido), AuthSession (extendido)
```

### 3. API Contracts (`src/server/contracts.ts`) — DTOs de request/response
Já existe parcialmente — formalizar para todos os endpoints.

### Regras de Import:
```typescript
// ✅ CORRETO - Domain importa do Shared Kernel
import { Show, EpisodeStatus } from '@/domain/contracts';

// ✅ CORRETO - Domain usa seus próprios tipos
import { Episode, EditorialDiagnosis } from '@/domain/types/episode';

// ✅ CORRETO - API usa DTOs
import { CreateEpisodeRequest, EpisodeResponse } from '@/server/contracts';

// ❌ ERRADO - Domain importa tipos de outro domain
import { LibraryAsset } from '@/domain/types/media';  // em episode-production

// ❌ ERRADO - Re-exporta tudo
export * from '@/domain/contracts';  // em types/index.ts
```

## Consequências

### Positivas
- ✅ **Isolamento** — Mudança em `Episode` não quebra `MediaLibrary`
- ✅ **Type safety real** — Remover `[key: string]: any`, definir interfaces explícitas
- ✅ **Refatoração segura** — Renomear campo = tocar 1 domínio
- ✅ **Documentação viva** — Tipos por domínio = documentação executável
- ✅ **Tree-shaking** — Bundle só inclui tipos usados

### Negativas
- ⚠️ **Migração gradual** — 833 linhas para separar
- ⚠️ **Duplicação controlada** — `ProductionAsset` aparece em episode + media (intencional: view models diferentes)
- ⚠️ **Build breaks temporários** — Durante migração

## Plano de Migração (Fases)

### Fase 1: Criar estrutura + Shared Kernel enxuto
1. Criar `src/domain/types/` com arquivos por domínio
2. Mover tipos de `contracts.ts` para arquivos correspondentes
3. `contracts.ts` fica apenas com tipos **realmente compartilhados** (~200 linhas)
4. Atualizar `src/types/index.ts` para re-exportar Shared Kernel + Domain Types (transição)

### Fase 2: Migrar domínios um a um
1. `agent-media-library` → usa `src/domain/types/media.ts`
2. `agent-talent-management` → usa `src/domain/types/talent.ts`
3. `agent-technical-production` → usa `src/domain/types/technical.ts`
4. `agent-program-catalog` → usa `src/domain/contracts` (Show, CameraConfig)
5. `agent-content-intelligence` → usa `src/domain/aiContracts.ts` + `src/domain/types/episode.ts` (DTOs)
6. `agent-episode-production` → usa `src/domain/types/episode.ts`
7. Novos domínios já usam estrutura correta

### Fase 3: Limpeza
1. Remover `export * from '../domain/contracts'` de `types/index.ts`
2. `types/index.ts` vira entry point apenas para Shared Kernel
3. Remover `[key: string]: any` de todos os tipos
4. Adicionar testes de tipo (tsd) para garantir isolamento

## Critérios de Aceite
- [ ] `contracts.ts` < 300 linhas (apenas shared)
- [ ] Cada domínio importa apenas seus tipos + shared kernel
- [ ] Zero `[key: string]: any` em tipos públicos
- [ ] Build passa com `tsc --noEmit`
- [ ] Teste: mudar campo em `Episode` → só `episode-production` recompila

## Relacionados
- ADR-001: Shared Kernel
- ADR-002: Episode Production orchestrator
- ADR-005: Cross-cutting domains via persistence