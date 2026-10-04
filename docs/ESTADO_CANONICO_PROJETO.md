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
- Status: Concluída, com gate de banco pendente.
- Vocabulário canônico definido: Show → Program, Guest → Participant, OutlineBlock → Segment.
- Arquitetura-alvo definida: UI → Application/API → Domain → Persistence/AI/External Services.
- ADRs registradas para decisões estruturais.

### 3.2 Fase 1 — Fundação de Dados, Segurança e Contratos
- Status: Em andamento, bloqueada pela validação live do banco compartilhado.
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
- Ainda não habilitado:
  - Endpoints CRUD existentes ainda são apoiados pelo banco de dados JSON do V2. Eles ainda não foram trocados para o banco de dados de produção compartilhado.
  - A interface do usuário agora é fechada pela autenticação Supabase, e as rotas de API exigem um token Bearer validado. A autorização do banco de dados/RLS ainda não foi verificada ao vivo.
  - Nenhuma migração de esquema de produção foi aplicada.
- Motivo: O projeto Supabase conectado sofreu timeout durante a inspeção ao vivo do schema. Como o V2 compartilhará a fonte de dados de produção do V1, a Fase 1 não deve adivinhar o esquema ou escrever migrações contra um estado não verificado.
- Próximo gate necessário:
  1. Obter uma conexão live bem-sucedida com o Supabase.
  2. Capturar tabelas, colunas, chaves estrangeiras, políticas RLS, grants, funções/RPCs e histórico de migrações.
  3. Reconciliar esse instantâneo com as migrações do repositório V1 e a camada de persistência.
  4. Definir o adaptador de persistência V2 e os predicados de autorização.
  5. Adicionar testes de banco de dados para comportamento allow/deny.
  6. Só então mudar o CRUD do V2 de JSON para Supabase.

### 3.3 Dependências e Configuração
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
- Estado atual: PASSOU, exceto validação live do banco.

### Gate B — Banco e Segurança
- Condição: schema + dados + grants + RLS + autorização validados.
- Estado atual: PARCIALMENTE PASSOU — schema/RLS/grants centrais validados e hardening aplicado; falta matriz de roles + testes com identidades reais.

### Gate C — Persistência
- Condição: Supabase é a fonte de verdade do V2.
- Estado atual: NÃO PASSOU; adapter está pronto para as entidades raiz, mas JSON local ainda é a fonte de verdade.

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

Para avançar para o Gate B (Banco e Segurança) e Gate C (Persistência), é necessário:
1. Estabelecer uma conexão live com o Supabase.
2. Validar o schema live do banco de dados.
3. Reconciliar o schema live com as migrações do repositório.
4. Definir o adaptador de persistência V2 e os predicados de autorização.
5. Ativar a persistência Supabase nas rotas CRUD.
6. Implementar testes de banco de dados para comportamento allow/deny.
7. Remover o JSON local como fonte de verdade.
8. Concluir a matriz de roles Organization/Program.
9. Executar testes RLS allow/deny com identidades reais.

Este estado canônico deve ser mantido atualizado conforme o projeto avança através das fases e gates.