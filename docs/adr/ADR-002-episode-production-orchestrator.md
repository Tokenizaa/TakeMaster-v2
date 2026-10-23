# ADR-002: Episode Production como Orquestrador (Não God Domain)

## Status
Accepted

## Contexto
O domínio `agent-episode-production` originalmente importava de **todos os 5 outros domínios** de negócio:
- `@agent-program-catalog`
- `@agent-content-intelligence`
- `@agent-talent-management`
- `@agent-media-library`
- `@agent-technical-production`

Isso violava:
- **SRP (Single Responsibility Principle)** — Episode Production fazia de tudo
- **Dependency Inversion** — Domínio de alto nível importando detalhes de baixo nível
- **Deploy independente** — Mudança em qualquer domínio quebrava episode-production
- **Testabilidade** — Impossível testar episode-production isoladamente

## Decisão
**Episode Production passa a ser um orquestrador/agregador que CONSOME outros domínios via API, não via import direto.**

### Nova arquitetura:
```
Episode Production (Orquestrador)
    │
    ├── Program Catalog  ──► GET /api/shows/:id (validação)
    ├── Talent Management ──► GET /api/participants/:id (validação)
    ├── Media Library     ──► GET /api/library/:id (associação)
    ├── Technical Production ──► GET /api/episodes/:id/cameras (config)
    └── Content Intelligence ──► POST /api/ai/* (DTO contextual → resultado tipado)
```

### Regras:
1. Episode Production **NÃO importa** tipos de domínio de outros bounded contexts
2. Episode Production **USA** tipos do Shared Kernel (`contracts.ts`) para DTOs
3. Integração com Content Intelligence é **assíncrona via HTTP** (não import)
4. Outros domínios expõem endpoints de **consulta (GET)** para validação/associação
5. Mutações cruzadas **NÃO EXISTEM** — cada domínio gerencia seu próprio ciclo de vida

## Consequências

### Positivas
- ✅ Deploy independente de cada domínio
- ✅ Testes isolados por domínio
- ✅ Episode Production vira "conductor" leve, não "god object"
- ✅ Content Intelligence pode escalar separadamente (worker/queue)
- ✅ Contratos estáveis via API versionada

### Negativas
- ⚠️ Latência de rede em chamadas IA (mitigado: async/background jobs)
- ⚠️ Complexidade de transações distribuídas (mitigado: saga pattern ou eventual consistency)
- ⚠️ Mais endpoints para manter (mitigado: OpenAPI spec compartilhado)

## Implementação
1. Remover imports de `@agent-content-intelligence` em episode-production
2. Adicionar cliente HTTP tipado para `/api/ai/*` em episode-production
3. Content Intelligence expõe 9 endpoints POST com DTOs de request/response
4. Validação Zod centralizada em `validation.ts` para ambos os lados
5. Testes de contrato (pact) entre episode-production ↔ content-intelligence

## Relacionados
- ADR-001: Shared Kernel em contracts.ts
- ADR-003: Content Intelligence assíncrono via API
- ADR-004: Tipos de domínio separados do shared kernel