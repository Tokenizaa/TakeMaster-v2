# TakeMaster V2 — Architecture Decision Records (ADRs)

## ADR-001 — V2 não será um fork funcional da V1
- **Status:** Aceita
- **Contexto:** A V1 cresceu organicamente adicionando autenticação, catálogo, agenda, biblioteca e persistência, mas acumulou aliases duplicados, regras temporárias de onboarding e acoplamento entre UI e banco.
- **Decisão:** A V1 é tratada exclusivamente como fonte de aprendizado sobre o que o produto precisou para amadurecer. Cada módulo operacional trazido para a V2 é reescrito sobre os contratos canônicos de `src/domain/contracts.ts`.

## ADR-002 — O modelo editorial inicial da V2 é preservado e isolado da operação
- **Status:** Aceita
- **Contexto:** O fluxo de 9 etapas do Editor de Episódio (Diagnóstico → Pesquisa → Pauta → Roteiro → Câmeras → Materiais → Shorts → Checklist → Edição) e o Modo Estúdio provaram alto valor de produto.
- **Decisão:** Proteger o Editor de Episódio contra contaminação operacional. Recursos de Catálogo,Temporadas/Produções, Agenda de Estúdio e Biblioteca Global vivem em módulos operacionais dedicados, conectando-se ao episódio por relacionamentos explícitos (`showId`, `productionId`, `episodeId`).

## ADR-003 — Persistência relacional real entra antes da expansão funcional
- **Status:** Aceita
- **Contexto:** O uso de `data/db.json` misturava fixtures com estado de execução, não oferecia integridade referencial e não suportava isolamento por organização.
- **Decisão:** Substituir `db.json` por persistência relacional SQL (`data/takemaster_v2.sqlite` via `node:sqlite` + migrações SQL versionadas compatíveis com Supabase/PostgreSQL em `supabase/migrations/`), garantindo transações ACID, chaves estrangeiras e isolamento por `organization_id`.

## ADR-004 — Compatibilidade legada é temporária e restrita à borda
- **Status:** Aceita
- **Contexto:** Múltiplos nomes para o mesmo conceito (`program` vs `show`, `guest` vs `participant`) geravam mappers redundantes na V1.
- **Decisão:** O modelo canônico adota `Show`, `Production`, `Episode`, `Participant`, `ScheduleEvent` e `LibraryAsset`. Mapeamentos snake_case ↔ camelCase existem exclusivamente na camada `Persistence/Infrastructure`.

## ADR-005 — Separação estrita entre Fixtures/Seeds e Banco de Dados
- **Status:** Aceita
- **Contexto:** Na V1 e no protótipo inicial, falhas de leitura recriavam silenciosamente dados de seed, mascarando erros de persistência.
- **Decisão:** Seeds demonstrativos ficam isolados em `src/infrastructure/database/seeds.ts` e só são inseridos no bootstrap inicial de uma organização vazia ou mediante ação explícita de demonstração. Erros de banco ou validação nunca retornam fixtures silenciosos e o Autosave só reporta `"Salvo no banco"` após confirmação `200 OK` da camada de persistência.

## ADR-006 — Validação Runtime Obrigatória para Saídas de IA
- **Status:** Aceita
- **Contexto:** Respostas malformadas de LLMs podem corromper o estado do episódio se persistidas diretamente.
- **Decisão:** Toda chamada Gemini passa por validação de schema em `src/domain/aiContracts.ts` antes de retornar à aplicação. A IA apenas sugere/gera estruturas validadas; a persistência permanece responsabilidade explícita da aplicação.
