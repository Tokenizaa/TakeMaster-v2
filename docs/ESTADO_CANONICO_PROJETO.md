# Estado Canônico do Projeto TakeMaster V2

Este documento descreve o estado canônico (de referência) do projeto TakeMaster V2, baseado na documentação existente e nas decisões arquiteturais tomadas.

## 1. Visão Geral

TakeMaster V2 é uma reconstrução deliberada do produto, não uma continuação ou fork cego do V1. Ele preserva o modelo editorial comprovado, reutiliza o existente Supabase/Postgres como fonte de dados de produção, continua usando NVIDIA como provedor de IA e receberá uma nova implantação Cloudflare.

## 2. Decisões Arquiteturais Principais (ADRs)

- **ADR-001**: V2 é uma reconstrução, não um fork do V1.
- **ADR-002**: O banco de dados Supabase/Postgres existente permanece como fonte de dados de produção.
- **ADR-003**: NVIDIA NIM permanece como provedor de IA.
- **ADR-004**: V2 receberá um novo deployment Cloudflare, separado do V1.
- **ADR-005**: Vocabulário de domínio canônico: Program, Participant, Segment, Episode.
- **ADR-006**: Compatibilidade é temporária e explícita.
- **ADR-007**: Verificação ao vivo do schema do banco de dados é um pré-requisito para writes de produção.

## 3. Estado Atual (Baseado na documentação)

### 3.1 Fase 0 — Baseline Arquitetural
- Status: Concluída.
- Vocabulário canônico definido: Show → Program, Guest → Participant, OutlineBlock → Segment.
- Arquitetura-alvo definida: UI → Application/API → Domain → Persistence/AI/External Services.
- ADRs registradas para decisões estruturais.

### 3.2 Fase 1 — Fundação de Dados, Segurança e Contratos
- Status: Em andamento, com schema live já validado e fechamento de persistência/authz/testes pendente.
- Implementado:
  - Limite de servidor Supabase usando a configuração existente do projeto V1.
  - Validação de usuário autenticado no servidor.
  - Configuração centralizada do servidor para Supabase e NVIDIA.
  - Endpoint de saúde com status de conectividade do Supabase e configuração do NVIDIA.
  - Primitivas de erro de aplicação explícitas.
  - Auxiliar de sessão Supabase para o cliente.
  - Auxiliar de busca de API do cliente que pode anexar o token de acesso Supabase atual.
  - Integração NVIDIA NIM substituindo a dependência V2 Gemini.
  - Manuseio de modelo primário/fallback do NIM e timeout.
  - Parsing estrito de JSON da IA: saída inválida é um erro, não fallback de dados silenciosos.
  - Modelo de ambiente para o projeto Supabase compartilhado e configuração do NVIDIA.
- Estado atual:
  - CRUD principal de Shows, Episodes e Guests já usa SupabasePersistence.
  - Schema live do projeto correto foi validado.
  - Authorization base Organization/Program e RLS/grants centrais estão presentes.
  - O legado JSON foi isolado e não é mais usado pelo server.ts; o módulo src/server/db.ts foi removido nesta reconciliação.
  - Ainda faltam relacionamentos filhos do Episode, matriz completa de roles e testes automatizados allow/deny.
  - Library e History/Context ainda precisam de implementação/persistência canônica completa.

## 3.3 Dependências e Configuração
- O projeto usa Supabase como sistema persistente de registro.
- O projeto usa NVIDIA NIM como provedor de IA.
- O projeto terá um novo deployment Cloudflare (ainda não implantado).
- O vocabulário canônico foi definido e está sendo usado no código.

## 4. Estrutura do Projeto

### 4.1 Diretórios Principais
- `src/`: Código fonte da aplicação (React/Vite frontend, Node.js/Express backend).
- `supabase/`: Arquivos relacionados ao Supabase (migrações, funções, etc.).
- `plan/`: Contém o estado operacional das features e o ship log.
- `loop/`: Contém a configuração e o estado do Loop Engineering.
- `docs/`: Documentação viva, incluindo este arquivo e mapas de teste canônicos.

### 4.2 Arquivos de Configuração
- `package.json`: Definições de dependência e scripts.
- `tsconfig.json`: Configuração do TypeScript.
- `vite.config.ts`: Configuração do Vite para o frontend.
- `.env.example`: Modelo de variáveis de ambiente.

## 5. Gates Obrigatórios

O projeto não deve avançar apenas porque código foi implementado. Os gates obrigatórios são:

### Gate A — Arquitetura
- Condição: Fase 0 concluída.
- Estado atual: PASSOU.

### Gate B — Banco e Segurança
- Condição: schema + dados + grants + RLS + autorização validados.
- Estado atual: PARCIALMENTE PASSOU — schema/RLS/grants centrais validados e hardening aplicado; falta matriz de roles + testes com identidades reais.

### Gate C — Persistência
- Condição: Supabase é a fonte de verdade do V2.
- Estado atual: PARCIALMENTE PASSOU; CRUD principal usa Supabase, mas relacionamentos filhos, versionamento e testes de persistência ainda não estão fechados.

### Gate D — Editorial
- Condição: fluxo completo de episódio funcional.
- Estado atual: NÃO PASSOU.

### Gate E — Prontidão para Produção
- Condição: testes, observabilidade, deployment, recovery e rollback.
- Estado atual: NÃO PASSOU.

## 6. Estado Real Neste Momento

**Concluído:**
- baseline arquitetural;
- decisões estruturais;
- branch/PR de Fase 1;
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
- Fase 1 — 1.5 implementada na base; 1.6 e 1.7 parcialmente implementadas, com ativação final bloqueada pela validação live do banco compartilhado.

**Ainda bloqueado:**
- ativação da persistência Supabase nas rotas CRUD;
- conclusão dos relacionamentos filhos do Episode;
- matriz de roles Organization/Program;
- testes RLS allow/deny com identidades reais;
- remoção do JSON como fonte de verdade;
- testes completos.

**Regra para a próxima execução:**
> Não iniciar a reconstrução ampla da Fase 2 antes de fechar os gates de banco, segurança e persistência da Fase 1.

## 7. Próximos Passos

1. Fechar relacionamentos filhos do Episode no SupabasePersistence.
2. Fechar matriz de roles Organization/Program e testes allow/deny.
3. Estabelecer suíte automatizada de persistence/RLS/authz e contratos.
4. Implementar persistência real de History/Context.
5. Reconstruir Library sobre a arquitetura Supabase atual, sem reaplicar o backend legado do PR #5.
6. Só então avançar para a Fase 2 e posteriormente produção.
