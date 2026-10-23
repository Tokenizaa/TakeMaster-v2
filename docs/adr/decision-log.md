# Decision Log — ADRs do TakeMaster v2

| ADR | Título | Status | Data | Autor | Afeta Skills |
|-----|--------|--------|------|-------|--------------|
| ADR-001 | Shared Kernel em contracts.ts | ✅ Accepted | 2025-10-20 | @architect | Todas |
| ADR-002 | Episode Production como orquestrador (não god) | ✅ Accepted | 2025-10-23 | @orchestrator | episode-production, content-intelligence |
| ADR-003 | Content Intelligence assíncrono via API | ✅ Accepted | 2025-10-23 | @orchestrator | content-intelligence, episode-production |
| ADR-004 | Tipos de domínio separados do shared kernel | 📋 Proposed | 2025-10-23 | @orchestrator | Todas |
| ADR-005 | Cross-cutting domains (scheduling, billing, auth) via persistence | ✅ Accepted | 2025-10-23 | @orchestrator | scheduling, billing, auth, admin, program-knowledge |
| ADR-006 | Program Knowledge como domínio separado de AI | ✅ Accepted | 2025-10-23 | @orchestrator | program-knowledge, content-intelligence |

---

## ADR-001: Shared Kernel em contracts.ts

**Decisão**: Centralizar tipos canônicos e validação Zod em `src/domain/contracts.ts` e `src/domain/validation.ts`. Todos os domínios importam daqui.

**Rationale**: Evita drift de schema, garante type safety cross-domain, facilita versionamento de API.

**Consequências**: Mudanças no shared kernel exigem ADR + aprovação @supervisor.

---

## ADR-002: Episode Production como Orquestrador

**Decisão**: Episode Production não importa domínios — consome via API. Content Intelligence via POST /api/ai/* assíncrono.

**Rationale**: Quebra dependência circular, permite deploy independente, Episode Production vira conductor leve.

**Consequências**: Latência de rede para IA (mitigado com async/202), necessidade de job queue.

---

## ADR-003: Content Intelligence Assíncrono via API

**Decisão**: 9 endpoints IA expostos como REST assíncrono (202 + polling). Worker separado consome queue.

**Rationale**: Timeouts de 30-60s não bloqueiam API principal. Escalabilidade horizontal de workers GPU.

**Consequências**: Complexidade de estado (jobId, polling), eventual consistency, infra queue/redis.

---

## ADR-004: Tipos de Domínio Separados

**Decisão**: Separar `contracts.ts` (shared kernel ~200 linhas) de `src/domain/types/<domain>.ts` (view models por domínio).

**Rationale**: Isolamento de build, type safety real, refatoração segura, documentação executável.

**Consequências**: Migração gradual de 833 linhas, duplicação controlada de view models (ex: ProductionAsset em episode + media).

---

## ADR-005: Cross-cutting Domains via Persistence Layer

**Decisão**: Scheduling, Billing, Auth, Program Knowledge, Admin Reporting não importam domínios de negócio — leem/escrevem via `persistence.ts`.

**Rationale**: Isolamento de domínios operacionais, Admin Reporting read-only, Billing não conhece Episode.

**Consequências**: `persistence.ts` cresce (mitigado: módulos internos), transações distribuídas via saga.

---

## ADR-006: Program Knowledge Separado de Content Intelligence

**Decisão**: Knowledge Base (scraping, editorial identity, pitch) é domínio próprio (`agent-program-knowledge`), não parte de Content Intelligence.

**Rationale**: Responsabilidades diferentes — Knowledge Base = referência externa + cache; Content Intelligence = geração por episódio.

**Consequências**: Content Intelligence consome `generateProgramEditorialIdentity` via import (mesmo processo), mas domínios separados.