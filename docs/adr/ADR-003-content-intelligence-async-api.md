# ADR-003: Content Intelligence Assíncrono via API

## Status
Accepted

## Contexto
O `agent-content-intelligence` é responsável por 9 funções de IA pesadas:
1. `generateEditorialDiagnosis` — diagnóstico editorial
2. `generateEditorialResearch` — pesquisa/dossiê
3. `generateSmartOutline` — outline/estrutura
4. `generateStudioScript` — roteiro completo
5. `generatePlannedShorts` — shorts para redes sociais
6. `generateEditorScriptSynthesis` — síntese para edição
7. `generateContextualAssist` — assistência contextual
8. `generateProgramEditorialIdentity` — identidade editorial do programa
9. `generateProgramPitchSuggestions` — sugestão de pautas

Problemas da abordagem síncrona/import direto:
- **Timeouts** — Geração de roteiro pode levar 30-60s
- **Blocking** — Episode Production travava esperando IA
- **Recursos** — IA consome GPU/memória, não deve bloquear API principal
- **Retry/Resilience** — Falha de IA não deve derrubar episode-production
- **Escalabilidade** — Workers de IA separados da API REST

## Decisão
**Content Intelligence expõe endpoints REST assíncronos (`/api/ai/*`). Episode Production chama via HTTP e processa resultado via callback/polling/webhook.**

### Fluxo:
```
Episode Production                    Content Intelligence (Worker)
     │                                        │
     ├─ POST /api/ai/script {dto} ──────────►│  Queue job, return 202 + jobId
     │                                        │
     │◄──── 202 Accepted {jobId} ────────────┤
     │                                        │
     │     (processa em background)           │
     │                                        │
     ├─ GET /api/ai/script/{jobId} ─────────►│  Poll status
     │                                        │
     │◄──── 200 {status, result} ────────────┤
     │                                        │
     │     Persiste resultado no Episode      │
```

### Contrato de API:
```typescript
// Request
POST /api/ai/{diagnosis|research|outline|script|shorts|editor-synthesis|contextual-assist|program-identity|pitch}
Content-Type: application/json
{ episodeContext: EpisodeAIDTO, options?: AIOptions }

// Response imediato
202 Accepted
{ jobId: string, status: 'queued' | 'processing', estimatedDurationMs: number }

// Polling
GET /api/ai/{type}/{jobId}
200 OK
{ jobId, status: 'completed' | 'failed', result: TypedResult, error?: string }
```

### DTOs Compartilhados (Shared Kernel):
```typescript
// Em contracts.ts ou aiContracts.ts
interface EpisodeAIDTO {
  showId: string;
  showFormat: ShowFormat;
  showEditorialStyle: string;
  episodeIdea: string;
  guestName: string;
  guestBio?: string;
  targetDurationMin: number;
  existingOutline?: OutlineBlock[];
  existingResearch?: ResearchData;
}
```

## Consequências

### Positivas
- ✅ API principal não bloqueia (202 imediato)
- ✅ Workers de IA escalam horizontalmente (queue: bullmq/redis)
- ✅ Retry automático com backoff exponencial
- ✅ Observabilidade: job status, duração, tokens, custos
- ✅ Episode Production vira cliente leve (HTTP client)
- ✅ Content Intelligence pode ser microserviço separado no futuro

### Negativas
- ⚠️ Complexidade de estado (jobId, polling, timeout)
- ⚠️ Eventual consistency — resultado chega depois
- ⚠️ Precisa de queue/redis (infra extra)
- ⚠️ Testes de integração mais complexos

## Mitigações
1. **Polling simples** no frontend (setInterval 2s) — suficiente para MVP
2. **Webhook opcional** para notificação server-side quando pronto
3. **Timeout default 120s** — se exceder, marca failed + alerta
4. **Idempotency key** no request — evita jobs duplicados
5. **Fallback local** — se queue down, executa inline (degradado)

## Implementação
1. `src/server/ai.ts` — funções puras (sem Express) para worker consumir
2. `src/server/routes/ai.ts` — endpoints REST que enfileiram job
3. Worker separado (`src/worker.ts` ou processo à parte) consome queue
4. Episode Production usa `fetch` tipado para chamar API
6. Shared types em `src/domain/aiContracts.ts` (request/response DTOs)

## Relacionados
- ADR-002: Episode Production como orquestrador
- ADR-001: Shared Kernel
- ADR-005: Cross-cutting domains via persistence