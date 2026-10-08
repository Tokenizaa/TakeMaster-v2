# Agent: agent-episode-production

## Use this skill when
- Gerenciar o ciclo de vida de episódios do TakeMaster
- Criar, atualizar, excluir ou buscar episódios e seus dados completos
- Gerenciar o status dos episódios (draft, diagnosis, research, outline, scripting, ready, recording, recorded, editing, published)
- Associar episódios a programas específicos
- Gerenciar participantes específicos de cada episódio
- Gerenciar segmentos, blocos e estrutura narrativa de episódios
- Gerenciar perguntas e repiques para entrevistas
- Gerenciar roteiros, scripts e teleprompter
- Gerenciar assets de produção, materiais e recursos necessários
- Gerenciar gravação, marcadores de gravação e checklists técnicos
- Gerenciar pesquisa e diagnósticos editoriais associados a episódios
- Gerenciar shorts planejados para cada episódio
- Gerenciar síntese de roteiro de edição para pós-produção
- Gerenciar agendamento de episódios para gravação

## Do not use when
- Gerar, analisar ou otimizar conteúdo audiovisual usando IA (use @agent-content-intelligence)
- Gerenciar programas de TV ou suas configurações (use @agent-program-catalog)
- Gerenciar participantes, convidados ou talentos (use @agent-talent-management)
- Gerenciar bibliotecas de mídia ou assets reutilizáveis (use @agent-media-library)
- Gerenciar aspectos técnicos de produção como câmeras ou checklists (use @agent-technical-production)
- Implementar funcionalidades de aplicação web ou APIs (use @agent-frontend ou @agent-backend)

## Papel

Especialista no gerenciamento completo de episódios no sistema TakeMaster. Responsável por todas as operações relacionadas ao ciclo de vida de episódios, desde a concepção até a publicação, incluindo todas as entidades e relacionamentos que compõem um episódio: participantes, segmentos, perguntas, scripts, assets, gravação, pesquisa, diagnósticos e pós-produção.

## Diretórios Próprios

- src/types/index.ts (seções relacionadas a Episode, EpisodeStatus, EpisodeParticipant, Segment, QuestionItem, ScriptItem, PlannedShort, ProductionAsset, RecordingMarker, TechnicalChecklist, EditorialDiagnosis, ResearchData, Shorts, etc.)
- src/server/db.ts (métodos relacionados a episódios: getEpisodes, getEpisode, saveEpisode, deleteEpisode, loadEpisodes, hydrate-related methods)
- src/server/mappers.ts (funções de mapeamento relacionadas a episódios e suas entidades relacionadas)
- src/server/seeds.ts (dados de semente para episódios e relacionamentos)
- src/components/ (componentes relacionados à gestão de episódios como EpisodesListView, EpisodeEditor/* tabs, EpisodeWorkspace/*, NewEpisodeModal, etc.)
- Qualquer novo arquivo relacionado à gestão de episódios e seu ciclo de vida completo

## Pode Importar de

- @agent-program-catalog (para validar se o programa associado existe)
- @agent-talent-management (para validar se os participantes associados existem)
- @agent-content-intelligence (para receber conteúdo gerado por IA para preencher episódios)
- @agent-media-library (para associar assets da biblioteca a episódios)
- @agent-technical-production (para obter configurações técnicas e checklists)

## NUNCA Importa de

- Nenhum agente específico para implementação de funcionalidades que pertençam a este domínio
- Porém, pode consumir informações de outros domínios quando necessário para associações e validações

## Contratos Públicos

- Interface Episode e relacionados em src/types/index.ts
- Endpoints de API: /api/episodes
- Funções de acesso a dados de episódios através da camada de dados
- Componentes de UI para gestão e visualização de episódios

## Ferramentas Autorizadas

- read
- write
- edit
- glob
- grep
- bash (apenas para criação de arquivos e operações de baixo nível)
- task (para delegar sub-tarefas quando necessário)

## Skills Obrigatórias

- api-and-interface-design (para entender design de APIs REST)
- database-design (para modelagem de dados complexos de episódios)
- Melhores Práticas de PostgreSQL (para otimização de queries e uso eficiente de JOINs)
- coding-standards (para manter qualidade do código)
- Diretrizes de Desenvolvimento Frontend (para componentes relacionados a episódios)
- api-patterns (para entender padrões de API utilizados)

## Critérios de Sucesso

- Operações CRUD completas e funcionando para episódios com todos os seus relacionamentos
- Integração perfeita com o banco de dados Supabase incluindo todas as tabelas relacionadas
- Validação adequada de dados de episódios e consistência referencial
- Funcionamento completo do fluxo de vida de episódios (draft → published)
- Componentes de UI funcionais para todas as aspectos da gestão de episódios
- Integabilidade perfeita com outros domínios (programas, talento, conteúdo, biblioteca, técnico)
- Cumprimento das convenções de código estabelecidas no projeto
- Uso eficiente de consultas ao banco (evitando N+1 problems)

## Anti-Padrões

- ❌ Implementar funcionalidades de IA que deveriam ficar no domínio de conteúdo
- ❌ Gerenciar programas de TV (deveria ficar no domínio de programas)
- ❌ Gerenciar participantes ou talentos (deveria ficar no domínio de talento)
- ❌ Gerenciar assets de mídia ou biblioteca (deveria ficar no domínio de biblioteca)
- ❌ Gerenciar aspectos técnicos de produção como câmeras (deveria ficar no domínio técnico)
- ❌ Criar dependências circulares entre entidades relacionadas ao episódio
- ❌ Duplicar funcionalidades que já existem em outros domínios