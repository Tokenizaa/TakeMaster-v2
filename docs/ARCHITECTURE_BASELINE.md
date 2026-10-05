# TakeMaster V2 — Architecture Baseline & Comparativo V1/V2

## 1. Hierarquia de Contexto Canônica

A V2 estabelece explicitamente a cadeia de propriedade e autorização:

```
Usuário (User)
  └── Organização (Organization via organization_members)
        └── Programa (Show via show_members / organization_id)
              └── Produção / Temporada (Production)
                    └── Episódio (Episode)
                          ├── Participantes (EpisodeParticipant <-> Participant)
                          ├── Conteúdo Editorial (Diagnosis, Research, Outline, Questions, Script, Shorts)
                          ├── Versões de Roteiro (ScriptVersion)
                          ├── Operação de Gravação (Cameras, TechnicalChecklist, RecordingMarkers)
                          ├── Agenda de Produção (ScheduleEvent)
                          └── Biblioteca de Assets (LibraryAsset)
```

Nenhum endpoint de negócio confia apenas no ID enviado pelo cliente: toda leitura e escrita resolve primeiro o `AuthContext` (`userId`, `organizationId`, `role`) e filtra/valida o recurso dentro do contexto autenticado.

---

## 2. Comparativo de Modelos V1 vs V2 (Entidade por Entidade)

| Entidade | Estado na V1 | Base Original V2 | Contrato Canônico V2 (Final) | Decisão Arquitetural |
| :--- | :--- | :--- | :--- | :--- |
| **Organization & User** | Acoplado a regras provisórias de onboarding e mappers dispersos | Inexistente (`db.json` global sem dono) | `Organization`, `User`, `OrganizationMember` com papéis (`owner`, `admin`, `producer`, `editor`, `host`, `viewer`) | **Incorporado na fundação** com sessão autenticada e isolamento multi-tenant |
| **Show (Programa / Catálogo)** | Múltiplos aliases entre "Show", "Program" e "CatalogItem" | `Show` simples sem contexto de organização ou catálogo | `Show` canônico único com `organizationId`, `catalogStatus`, `category`, `targetAudience`, `distributionChannels`, `cameras`, `standardStructure` | **Normalizado em entidade única** (sem duplicar modelo de Catálogo vs Show) |
| **Production (Temporada / Frente)** | Misturado em campos soltos de agenda e episódio | Inexistente | `Production` (`id`, `organizationId`, `showId`, `title`, `seasonNumber`, `status`, `executiveProducer`) | **Criado como elo explícito** entre Programa, Agenda e Episódio |
| **Episode (Episódio)** | Mapeamentos duplicados camelCase/snake_case no frontend | `Episode` rico editorialmente, mas salvo em `db.json` | `Episode` canônico com `organizationId`, `showId`, `productionId`, ciclo de vida validado (`EpisodeStatus`) e objetos editoriais tipados | **Preservado o núcleo editorial**, adicionado isolamento relacional e auditoria |
| **Participant / Guest** | Convidado preso como string ou duplicado por episódio | `Guest` separado, mas acoplado apenas por `guestName`/`guestId` | `Participant` (base da organização) + `EpisodeParticipant` (relação N:N com papel e status de confirmação no episódio) | **Normalizado** mantendo compatibilidade limpa com `guestName`/`guestId` principal |
| **ScriptVersion** | Array embutido sem endpoint próprio de snapshot/restore | Array local dentro de `Episode` | Tabela relacional `script_versions` com criação de snapshot real e restauração transacional | **Promovido a entidade persistida** |
| **ScheduleEvent (Agenda)** | Desconectada da criação/edição do episódio | Inexistente | `ScheduleEvent` vinculado a `organizationId`, `showId`, `productionId` e `episodeId` | **Reconstruído na camada de Operação** sem poluir o editor de episódio |
| **LibraryAsset (Biblioteca)** | Assets presos dentro do JSON do episódio sem reuso | `Episode.assets` isolado | `LibraryAsset` persistido relacionalmente por organização/programa/episódio com suporte a reuso (`reusable`) e sincronização com o episódio | **Unificado** entre Biblioteca Operacional e aba de Materiais do Episódio |
| **Saídas de IA** | JSON livre sem validação runtime; erros silenciosos | `parseGeminiJson` com fallback mudo | `AIValidatedResponse<T>` com schemas validados em runtime (`src/domain/aiContracts.ts`) e metadados explícitos de origem e versão de prompt | **Blindado com validação runtime** |

---

## 3. Arquitetura em Camadas e Módulos

```
src/
├── domain/                  # Regras de negócio, estados, invariantes e contratos puros
│   ├── contracts.ts         # Entidades canônicas, DTOs e tipos de domínio
│   ├── validation.ts        # Validação runtime de entrada/saída e AppError padronizado
│   └── aiContracts.ts       # Schemas runtime e versionamento de prompts de IA
├── infrastructure/          # Detalhes de persistência, Supabase, SQLite e observabilidade
│   ├── database/
│   │   ├── relationalRepository.ts  # Persistência relacional SQL (SQLite WAL + migrações)
│   │   └── seeds.ts                 # Dados demonstrativos isolados do motor de banco
│   ├── supabase/
│   │   └── client.ts                # Integração Supabase PostgreSQL
│   └── observability/
│       └── logger.ts                # Logs estruturados e métricas de saúde
├── server/                  # Camada Application/API (Autenticação, Autorização, Rotas HTTP)
│   ├── auth.ts              # Sessão, tokens assinados e middleware de contexto/RBAC
│   └── ai.ts                # Orquestração Gemini API com validação runtime e auditoria
├── services/                # Cliente HTTP tipado para a UI
│   └── api.ts               # Comunicação com propagação real de erros e sessão
├── components/              # Camada de Apresentação (UI separada em Operação vs Editorial)
│   ├── DashboardView.tsx    # Dashboard Operacional e Executivo
│   ├── ScheduleView.tsx     # Agenda de Produção (Fase 3)
│   ├── LibraryView.tsx      # Biblioteca de Assets & B-Roll (Fase 3)
│   ├── ShowsView.tsx        # Catálogo de Programas & Produções/Temporadas (Fase 3)
│   ├── EpisodesListView.tsx # Pipeline de Episódios
│   ├── GuestsView.tsx       # Banco de Participantes/Convidados
│   ├── EpisodeEditor/       # Editor de Episódio (9 abas editoriais puras)
│   └── StudioMode/          # HUD de Gravação em Estúdio e Teleprompter
└── tests/                   # Suíte de testes automatizados dos fluxos críticos (Fase 5)
    └── v2-integration.test.ts
```
