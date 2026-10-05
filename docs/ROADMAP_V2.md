# TakeMaster V2 — Roadmap de Reconstrução e Estabilização

Documento-base da V2. Objetivo: reconstruir o TakeMaster a partir da melhor base inicial da aplicação, incorporando as evoluções comprovadas da V1 sem carregar sua dívida arquitetural.

> **Diretriz Principal:**
> `V2 = melhor base original + aprendizados comprovados da V1 + arquitetura intencional + contratos estáveis.`

---

## 1. Status de Execução por Fases

### Fase 0 — Baseline e Arquitetura ✅ Concluída
- [x] Documentar a premissa V1 → V2 (`docs/ROADMAP_V2.md`)
- [x] Comparar modelos V1/V2 entidade por entidade (`docs/ARCHITECTURE_BASELINE.md`)
- [x] Definir contratos canônicos da V2 (`src/domain/contracts.ts`)
- [x] Identificar funcionalidades mantidas, redesenhadas ou descartadas (`docs/ARCHITECTURE_BASELINE.md`)
- [x] Definir arquitetura de módulos (`UI → Application/API → Domain → Persistence/Infrastructure`)
- [x] Criar ADRs iniciais (`docs/ADR.md`)

### Fase 1 — Fundação de Dados e Segurança ✅ Concluída
- [x] Configuração Supabase + Repositório Relacional SQL (`src/infrastructure/supabase/client.ts` e `src/infrastructure/database/relationalRepository.ts`)
- [x] Schema inicial e Migrações SQL versionadas (`supabase/migrations/0001_v2_core_schema.sql`, `0002_v2_operations_and_rls.sql`)
- [x] Usuários, Organizações e Sessões autenticadas (`organizations`, `users`, `organization_members`, `sessions`)
- [x] Programas e isolamento por organização/programa (`shows`, `show_members`)
- [x] Produções/Temporadas (`productions`)
- [x] Episódios, Participantes e relação N:N (`episodes`, `participants`, `episode_participants`)
- [x] Políticas RLS documentadas e aplicadas nas migrações SQL + enforcement no backend
- [x] Contratos de API, validação determinística de payloads (`src/domain/validation.ts`) e erros padronizados (`AppError`)
- [x] Remoção da dependência de `data/db.json` e separação rigorosa de seeds (`src/infrastructure/database/seeds.ts`)

### Fase 2 — Migração do Núcleo Editorial ✅ Concluída
- [x] Shows (Programas)
- [x] Productions (Temporadas / Frentes de Produção)
- [x] Episodes (Episódios com persistência confirmada e reload)
- [x] Guests/Participants e vínculo com episódios
- [x] Diagnosis (Diagnóstico Editorial)
- [x] Research (Pesquisa Factual categorizada)
- [x] Outline & Questions (Pauta, Blocos e Perguntas)
- [x] Follow-ups (Repiques Inteligentes)
- [x] Script & Script Versions (Roteiro de 3 câmeras + Versionamento com snapshot e restauração)
- [x] Cameras, Assets, Shorts, Recording Markers, Technical Checklist
- [x] Studio Mode (HUD de gravação com cronômetros, marcadores em tempo real e teleprompter)

### Fase 3 — Operação ✅ Concluída
- [x] Catálogo de Programas & Produções/Temporadas (`ShowsView.tsx`)
- [x] Agenda de Produção integrada (`ScheduleView.tsx`)
- [x] Biblioteca Central de Assets & B-Roll (`LibraryView.tsx`)
- [x] Dashboard Operacional com pipeline, agenda, prontidão de estúdio e contexto de produção (`DashboardView.tsx`)
- [x] Relacionamento explícito `Usuário → Organização → Programa → Produção → Episódio`

### Fase 4 — IA Confiável ✅ Concluída
- [x] Contratos tipados para cada saída de IA (`src/domain/aiContracts.ts`)
- [x] Validação runtime de todas as respostas do modelo antes de retornar à aplicação
- [x] Tratamento de respostas inválidas e fallback determinístico explícito (`source: 'gemini' | 'fallback'`)
- [x] Controle de contexto enviado ao modelo e versionamento de prompts (`PROMPT_VERSIONS`)
- [x] Separação estrita entre geração de sugestão pela IA e persistência confirmada pelo domínio

### Fase 5 — Qualidade e Observabilidade ✅ Concluída
- [x] Testes unitários de domínio e validação de contratos (`src/tests/v2-integration.test.ts`)
- [x] Testes de API, autenticação e teste negativo de autorização entre organizações
- [x] Testes de persistência, autosave, reload e versionamento de roteiro
- [x] Health check (`/api/health`) e métricas operacionais (`/api/metrics`)
- [x] Logging estruturado com correlação de requisição (`src/infrastructure/observability/logger.ts`)

### Fase 6 — Produção ✅ Concluída
- [x] Matriz de variáveis de ambiente (`.env.example` e `docs/OPERATIONS_RUNBOOK.md`)
- [x] Procedimentos de migração, backup/recovery, deploy e rollback (`docs/OPERATIONS_RUNBOOK.md`)
- [x] Checklist de release verificado
