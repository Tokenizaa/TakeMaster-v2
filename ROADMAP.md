# TakeMaster V2 — Roadmap Executivo e Escopo

## Objetivo do projeto

Reconstruir o TakeMaster V2 como uma plataforma estável, coerente e evolutiva, usando o V2 como base limpa e incorporando apenas melhorias comprovadas do V1.

Princípios fixos:

- V2 é uma reconstrução, não um fork do V1.
- V1 continua sendo referência de comportamento e fonte de funcionalidades comprovadas.
- V2 usará o mesmo Supabase/Postgres do V1.
- V2 continuará usando NVIDIA NIM como provedor de IA.
- V2 terá uma nova implantação Cloudflare.
- O vocabulário canônico será definido no V2; compatibilidade com nomes legados ficará restrita às bordas.
- Nenhuma migração destrutiva será feita sem validação do schema, dados, RLS e dependências do banco compartilhado.
- Cada fase deve terminar com critérios verificáveis antes de avançar.

## Status geral

| Fase | Escopo | Status |
|---|---|---|
| 0 | Baseline arquitetural | CONCLUÍDA, com gate de banco pendente |
| 1 | Fundação de dados, segurança e contratos | EM ANDAMENTO |
| 2 | Núcleo editorial | PLANEJADA |
| 3 | Operação e contexto de produção | PLANEJADA |
| 4 | IA, qualidade e observabilidade | PLANEJADA |
| 5 | Produção, deploy e operação | PLANEJADA |

> A numeração foi normalizada para 0–5. O antigo “Phase 6” de produção foi absorvido como Fase 5.

---

# FASE 0 — Baseline Arquitetural

## Objetivo

Entender exatamente o que existe em V1 e V2, separar valor comprovado de dívida histórica e definir a arquitetura-alvo antes de migrar funcionalidades.

### 0.1 — Inventário V1 × V2
**Escopo:** comparar entidades, telas, APIs, persistência, autenticação, IA, operações e infraestrutura.

**Status:** CONCLUÍDA.

Resultado:
- Identificados os conceitos editoriais compartilhados.
- Identificadas as funcionalidades operacionais que surgiram posteriormente no V1.
- Identificados mecanismos legados de normalização/mapeamento que não devem virar arquitetura permanente do V2.

### 0.2 — Vocabulário canônico
**Escopo:** definir nomes oficiais do domínio e aliases temporários.

**Status:** CONCLUÍDA.

Vocabulário principal:
- Show → Program
- Guest → Participant
- OutlineBlock → Segment
- ProductionAsset / Material → ProductionAsset
- Episode → Episode

### 0.3 — Arquitetura-alvo
**Escopo:** definir fronteiras entre UI, aplicação/API, domínio, persistência e integrações externas.

**Status:** CONCLUÍDA.

Modelo:
UI → Application/API → Domain → Persistence / AI / External Services

Regra: UI não é camada de segurança; domínio não depende do formato das tabelas Supabase nem do payload da NVIDIA.

### 0.4 — ADRs e decisões estruturais
**Escopo:** registrar decisões que não devem ser reabertas casualmente durante a implementação.

**Status:** CONCLUÍDA.

Decisões registradas:
- reconstrução em vez de fork;
- banco Supabase existente;
- NVIDIA NIM;
- novo deployment Cloudflare;
- domínio canônico;
- compatibilidade explícita e temporária.

### 0.5 — Gate de banco compartilhado
**Escopo:** validar schema real, tabelas, relacionamentos, constraints, migrations, dados, RLS, grants, funções e dependências do Supabase do V1.

**Status:** PENDENTE / BLOQUEADOR.

A tentativa de inspeção live do banco sofreu timeout. Não será feita inferência do schema.

**Critério de saída:** schema e regras de autorização documentados e reproduzíveis.

---

# FASE 1 — Fundação de Dados, Segurança e Contratos

## Objetivo

Criar a fundação técnica sobre a qual todo o V2 será construído, sem ainda assumir que o JSON local é a persistência definitiva.

## 1.1 — Configuração e boundaries externos
**Escopo:**
- configuração centralizada;
- Supabase URL/chaves;
- NVIDIA NIM URL/chave/modelos;
- timeout e fallback;
- separação server/browser.

**Status:** CONCLUÍDA.

## 1.2 — Autenticação
**Escopo:**
- sessão Supabase no browser;
- login;
- renovação de sessão;
- validação do token no servidor;
- identidade do usuário disponível para autorização.

**Status:** IMPLEMENTADA.

## 1.3 — Proteção das APIs
**Escopo:**
- Bearer token nas chamadas do cliente;
- middleware de autenticação;
- proteger /api/*;
- health endpoint separado de autenticação.

**Status:** IMPLEMENTADA.

## 1.4 — Integração NVIDIA NIM
**Escopo:**
- remover Gemini;
- chamada HTTP ao NIM;
- modelo primário;
- modelo fallback;
- timeout;
- resposta JSON;
- rejeição de JSON inválido/vazio.

**Status:** IMPLEMENTADA NA FUNDAÇÃO.

## 1.5 — Contratos de aplicação e validação
**Escopo:**
- contratos de request/response;
- validação de entrada;
- erros padronizados;
- normalização somente nas bordas;
- impedir payloads incompatíveis de contaminarem o domínio.

**Status:** PARCIAL.

Já existe tratamento de erro e parsing estrito de IA. A validação completa dos contratos de domínio/API ainda falta.

## 1.6 — Persistência Supabase
**Escopo:**
- conectar V2 ao banco compartilhado;
- mapear entidades canônicas para schema existente;
- adapter de persistência;
- leitura/escrita;
- transações quando necessárias;
- autosave/persistência confiável;
- evitar dependência direta da UI no schema.

**Status:** PENDENTE.

Atualmente o CRUD existente ainda usa JSON local.

**Bloqueio:** depende do 0.5.

## 1.7 — Autorização, organização e programas
**Escopo:**
- User → Organization → Program → Production → Episode;
- membership;
- permissões;
- isolamento entre organizações;
- regras por programa;
- RLS;
- grants mínimos;
- testes allow/deny.

**Status:** PENDENTE.

A autenticação foi implementada, mas autenticação não substitui autorização. O acesso aos dados deverá ser protegido também no banco, combinando grants e RLS. citeturn0search0turn0search1

## 1.8 — Relacionamentos editoriais
**Escopo:**
- Episode → Participants;
- Episode → Content;
- Episode → Operations;
- Episode → Assets;
- constraints e integridade referencial.

**Status:** PENDENTE.

## 1.9 — Testes da fundação
**Escopo:**
- testes de contratos;
- autenticação;
- autorização;
- persistência;
- RLS;
- erros;
- smoke test da API.

**Status:** PENDENTE.

O RLS deverá possuir testes explícitos de acesso permitido e negado antes de considerar a camada segura. citeturn0search0

## Critério de saída da Fase 1

A Fase 1 só será considerada CONCLUÍDA quando:
1. schema real do banco estiver validado;
2. persistência V2 estiver operando no Supabase compartilhado;
3. auth + authorization estiverem funcionando;
4. RLS/grants estiverem testados;
5. APIs tiverem contratos claros;
6. JSON local deixar de ser a fonte de verdade;
7. testes básicos da fundação passarem.

---

# FASE 2 — Núcleo Editorial

## Objetivo

Reconstruir o fluxo principal de criação e produção de episódios.

### 2.1 — Programs / Shows
**Escopo:** criação, edição, seleção, configuração e contexto do programa.

**Status:** PLANEJADA.

### 2.2 — Episodes
**Escopo:** ciclo de vida do episódio, metadados, status, contexto e persistência.

**Status:** PLANEJADA.

### 2.3 — Participants / Guests
**Escopo:** cadastro, vínculo ao episódio e histórico contextual.

**Status:** PLANEJADA.

### 2.4 — Diagnosis
**Escopo:** diagnóstico editorial da ideia/episódio.

**Status:** PLANEJADA.

### 2.5 — Research
**Escopo:** pesquisa, fontes, contexto e material de preparação.

**Status:** PLANEJADA.

### 2.6 — Outline / Segments
**Escopo:** estrutura editorial do episódio e segmentos.

**Status:** PLANEJADA.

### 2.7 — Questions
**Escopo:** perguntas principais, ordem, agrupamento e edição.

**Status:** PLANEJADA.

### 2.8 — Follow-ups
**Escopo:** repiques ligados às perguntas e contexto editorial.

**Status:** PLANEJADA.

### 2.9 — Script
**Escopo:** roteiro, blocos, versões e edição.

**Status:** PLANEJADA.

### 2.10 — Cameras
**Escopo:** configuração e contexto de câmeras/produção.

**Status:** PLANEJADA.

### 2.11 — Assets / Production Assets
**Escopo:** materiais, referências e assets vinculados ao episódio.

**Status:** PLANEJADA.

### 2.12 — Shorts
**Escopo:** planejamento de cortes/shorts derivados do episódio.

**Status:** PLANEJADA.

### 2.13 — Recording Markers
**Escopo:** marcações de gravação e pontos relevantes para edição.

**Status:** PLANEJADA.

### 2.14 — Technical Checklist
**Escopo:** checklist técnico de gravação.

**Status:** PLANEJADA.

### 2.15 — Script Versions
**Escopo:** histórico e versionamento do roteiro.

**Status:** PLANEJADA.

### 2.16 — Studio Mode
**Escopo:** modo operacional para uso durante gravação.

**Status:** PLANEJADA.

## Critério de saída da Fase 2

Fluxo completo de episódio funcionando de ponta a ponta, persistido no Supabase, com dados relacionados íntegros e sem dependência de JSON local.

---

# FASE 3 — Operação e Contexto de Produção

## Objetivo

Reconstruir as capacidades operacionais que amadureceram no V1 e transformá-las em módulos coerentes.

### 3.1 — Catalog
**Escopo:** visão catalogada de programas, episódios, participantes e produção.

**Status:** PLANEJADA.

### 3.2 — Production Context
**Escopo:** contexto operacional necessário para cada produção/episódio.

**Status:** PLANEJADA.

### 3.3 — Agenda
**Escopo:** planejamento temporal de episódios, gravações e atividades.

**Status:** PLANEJADA.

### 3.4 — Library
**Escopo:** organização e acesso aos materiais de produção.

**Status:** PLANEJADA.

### 3.5 — Dashboard
**Escopo:** visão consolidada de produção, pendências e estado dos episódios.

**Status:** PLANEJADA.

### 3.6 — History / Context
**Escopo:** histórico e recuperação de contexto relevante.

**Status:** PLANEJADA.

### 3.7 — Operational Onboarding
**Escopo:** preparação inicial de organizações, programas, usuários e contexto operacional.

**Status:** PLANEJADA.

## Critério de saída da Fase 3

Operação diária completa sem depender de conhecimento interno do V1 e com contexto persistido de forma consistente.

---

# FASE 4 — IA, Qualidade e Observabilidade

## Objetivo

Transformar a IA em uma camada confiável e observável, e elevar o sistema a um nível de qualidade adequado para produção.

### 4.1 — NVIDIA typed contracts
**Escopo:** contratos tipados para cada operação de IA.

**Status:** FUNDAÇÃO IMPLEMENTADA; CONTRATOS COMPLETOS PENDENTES.

### 4.2 — Runtime validation
**Escopo:** validar respostas da IA antes de entrarem no domínio.

**Status:** PARCIAL.

Parsing estrito já existe; validação estrutural por operação ainda falta.

### 4.3 — Invalid response handling
**Escopo:** tratar JSON inválido, resposta vazia, schema incompatível, timeout e erro de provider.

**Status:** PARCIAL.

### 4.4 — Fallback
**Escopo:** fallback de modelo/provedor quando aplicável e política clara de degradação.

**Status:** FUNDAÇÃO IMPLEMENTADA.

### 4.5 — Context control
**Escopo:** controlar exatamente quais dados do episódio entram em cada prompt.

**Status:** PENDENTE.

### 4.6 — Prompt versioning
**Escopo:** versionar prompts, contratos e mudanças de comportamento.

**Status:** PENDENTE.

### 4.7 — Observabilidade
**Escopo:** logs estruturados, métricas, erros, latência, chamadas de IA e health checks.

**Status:** PENDENTE.

### 4.8 — Testes
**Escopo:**
- unit;
- domain;
- API;
- authz;
- persistence;
- AI contract;
- smoke;
- regressão de fluxos críticos.

**Status:** PENDENTE.

## Critério de saída da Fase 4

IA previsível, validada e observável; falhas controladas; regressões detectáveis automaticamente.

---

# FASE 5 — Produção, Deploy e Operação

## Objetivo

Colocar o V2 em produção de forma reproduzível, segura e recuperável.

### 5.1 — Environments
**Escopo:** desenvolvimento, staging/preview e produção.

**Status:** PLANEJADA.

### 5.2 — Secrets
**Escopo:** Supabase, NVIDIA, Cloudflare e demais secrets fora do código.

**Status:** PLANEJADA.

### 5.3 — Database migrations
**Escopo:** migrations versionadas, aplicáveis e reversíveis quando possível.

**Status:** PLANEJADA.

### 5.4 — Backup / Recovery
**Escopo:** estratégia de backup, recuperação e validação periódica.

**Status:** PLANEJADA.

### 5.5 — Cloudflare deployment
**Escopo:** novo deployment do V2 no Cloudflare, separado do V1.

**Status:** PLANEJADA.

### 5.6 — CI/CD
**Escopo:** build, testes, preview, deploy e controles de release.

**Status:** PLANEJADA.

### 5.7 — Rollback
**Escopo:** retorno seguro para versão anterior de aplicação e procedimento para incidentes de banco.

**Status:** PLANEJADA.

### 5.8 — Runtime health
**Escopo:** health checks, disponibilidade e sinais de degradação.

**Status:** FUNDAÇÃO IMPLEMENTADA; produção pendente.

### 5.9 — Monitoring
**Escopo:** monitoramento operacional, erros, latência, IA e persistência.

**Status:** PLANEJADA.

### 5.10 — Operations documentation
**Escopo:** runbooks, troubleshooting, recuperação, deploy e manutenção.

**Status:** PLANEJADA.

### 5.11 — Release checklist
**Escopo:** checklist obrigatório antes de cada release.

**Status:** PLANEJADA.

## Critério de saída da Fase 5

V2 implantado no novo ambiente Cloudflare, com banco compartilhado corretamente protegido, CI/CD, secrets, migrations, monitoramento, rollback e documentação operacional.

---

# Gates obrigatórios

O projeto não deve avançar apenas porque código foi implementado.

### Gate A — Arquitetura
**Condição:** Fase 0 concluída.

**Estado atual:** PASSOU, exceto validação live do banco.

### Gate B — Banco e segurança
**Condição:** schema + dados + grants + RLS + autorização validados.

**Estado atual:** NÃO PASSOU.

### Gate C — Persistência
**Condição:** Supabase é a fonte de verdade do V2.

**Estado atual:** NÃO PASSOU; JSON local ainda existe.

### Gate D — Editorial
**Condição:** fluxo completo de episódio funcional.

**Estado atual:** NÃO PASSOU.

### Gate E — Production readiness
**Condição:** testes, observabilidade, deployment, recovery e rollback.

**Estado atual:** NÃO PASSOU.

---

# Estado real neste momento

**Concluído:**
- baseline arquitetural;
- decisões estruturais;
- branch/PR de Phase 1;
- configuração Supabase/NVIDIA;
- AuthGate;
- autenticação server-side;
- autenticação nas chamadas da API;
- proteção das rotas API;
- integração base NVIDIA NIM;
- fallback de modelo;
- parsing estrito de JSON da IA;
- health endpoint.

**Em andamento:**
- Fase 1.

**Ainda bloqueado:**
- inspeção confiável do Supabase compartilhado;
- schema definitivo;
- RLS/grants;
- autorização Organization/Program;
- adapter de persistência Supabase;
- remoção do JSON como fonte de verdade;
- testes completos.

**Regra para a próxima execução:**

> Não iniciar a reconstrução ampla da Fase 2 antes de fechar os gates de banco, segurança e persistência da Fase 1.
