# Estado Canônico do Projeto TakeMaster V2

Este documento descreve o estado canônico do **produto TakeMaster V2** e sua base técnica atual.

## 1. Visão Geral

O **TakeMaster V2 é o produto/frontend original**. Sua linhagem foi inicializada no commit `68b8ca2659772d38e2b62146da7f87bddb4e7207` (`feat: initialize TakeMaster-v2 project scaffolding`) e contém a superfície original do produto: Dashboard, Episodes, Shows, Guests, Studio, editor de episódio e fluxos editoriais/assistidos por IA.

A documentação anterior inverteu as identidades: uma reconstrução arquitetural posterior foi chamada de V2. Essa reconstrução deve ser tratada como **V1** para fins de versionamento histórico. Sua arquitetura e infraestrutura podem ser reaproveitadas quando compatíveis, mas ela não substitui a superfície do produto V2.

## 2. Identidade de Versões

- **V2:** produto original TakeMaster, incluindo sua UI, fluxos e comportamento de produto.
- **V1:** reconstrução arquitetural posterior anteriormente rotulada como V2.
- **Commit histórico de referência do V2:** `68b8ca2`.
- **Regra:** infraestrutura V1 pode sustentar o V2; V1 não pode redefinir ou substituir o produto V2.

A decisão formal está registrada em **ADR-011 — Identidade Canônica entre V1 e V2**.

## 3. Decisões Arquiteturais Principais

- **ADR-001:** arquitetura e decisões devem servir ao produto canônico.
- **ADR-002:** o banco de dados Supabase/Postgres existente permanece como fonte de dados de produção.
- **ADR-003:** NVIDIA NIM permanece como provedor de IA.
- **ADR-004:** o V2 receberá deployment Cloudflare compatível com sua superfície e backend.
- **ADR-005:** vocabulário de domínio canônico: Program, Participant, Segment, Episode.
- **ADR-006:** compatibilidade é temporária e explícita.
- **ADR-007:** verificação ao vivo do schema do banco de dados é pré-requisito para writes de produção.
- **ADR-011:** corrige a identidade V1/V2 e impede que a reconstrução posterior substitua o produto V2.

## 4. Estado Técnico Atual

A base técnica atual preserva a superfície do produto V2 e incorpora partes da infraestrutura desenvolvida na reconstrução posterior.

### Fase 0 — Baseline Arquitetural
- Status: concluída.
- Vocabulário canônico definido.
- Arquitetura-alvo: UI → Application/API → Domain → Persistence/AI/External Services.
- ADRs estruturais registradas.

### Fase 1 — Fundação de Dados, Segurança e Contratos
- Status: em andamento.
- Supabase/Postgres permanece como persistência.
- Autenticação server-side e proteção das rotas API estão presentes.
- Integração NVIDIA NIM está presente.
- CRUD principal de Shows, Episodes e Guests usa SupabasePersistence.
- Schema live do projeto correto foi validado.
- Authorization base Organization/Program e RLS/grants centrais estão presentes.
- Ainda faltam relacionamentos filhos do Episode, matriz completa de roles, testes allow/deny, Library e persistência canônica completa de History/Context.

## 5. Estrutura do Projeto

- `src/`: frontend React/Vite e backend atual.
- `supabase/`: migrações e artefatos relacionados ao Supabase.
- `plan/`: estado operacional das features e ship log.
- `loop/`: configuração e estado do Loop Engineering.
- `docs/`: documentação viva, ADRs e mapas de teste.

## 6. Gates Obrigatórios

### Gate A — Arquitetura
- Estado: PASSOU.

### Gate B — Banco e Segurança
- Estado: PARCIALMENTE PASSOU — schema/RLS/grants centrais validados; matriz de roles e testes com identidades reais ainda pendentes.

### Gate C — Persistência
- Estado: PARCIALMENTE PASSOU — CRUD principal usa Supabase; relacionamentos filhos, versionamento e testes ainda pendentes.

### Gate D — Editorial
- Estado: NÃO PASSOU — fluxo completo de episódio ainda precisa ser validado.

### Gate E — Prontidão para Produção
- Estado: NÃO PASSOU — testes, observabilidade, deployment, recovery e rollback ainda precisam ser fechados.

## 7. Próximos Passos

1. Fechar relacionamentos filhos do Episode no SupabasePersistence.
2. Fechar matriz de roles Organization/Program e testes allow/deny.
3. Estabelecer suíte automatizada de persistence/RLS/authz e contratos.
4. Implementar persistência real de History/Context.
5. Reconstruir Library sobre a arquitetura Supabase atual, sem reaplicar cegamente o backend legado.
6. Validar o fluxo editorial completo do V2.
7. Preparar e validar o deployment Cloudflare do V2.

## 8. Proteção contra Regressão de Versão

A regra canônica é:

> **V2 é o produto original. V1 é a reconstrução arquitetural posterior anteriormente rotulada como V2.**

Portanto:

- não substituir a UI do V2 por uma “nova UI V2”;
- não remover componentes do produto original por serem considerados “legados” sem análise explícita;
- não copiar V1 indiscriminadamente;
- reutilizar infraestrutura V1 somente quando ela for compatível com o produto V2;
- documentar qualquer conflito antes de alterar a superfície do produto.

A branch `reconcile/canonical-main` é a base atual de reconciliação. O estado e os gates acima descrevem o que está implementado e o que ainda precisa ser validado; não autorizam uma reconstrução da UI.

## 9. Cloudflare

O deployment de produção é exclusivamente do TakeMaster V2 e deverá ser compatível com a arquitetura atual. O fato de a infraestrutura Cloudflare ainda precisar ser implementada não autoriza importar automaticamente o runtime ou a estrutura da reconstrução V1.
