# Agent: agent-production-management

## Use this skill when
- Gerenciar produções (temporada/season-level) no TakeMaster
- Criar, atualizar, excluir ou buscar produções e seus dados
- Gerenciar status de produção (planning, pre_production, in_production, post_production, completed)
- Associar produções a programas específicos (Show)
- Gerenciar produtor executivo, datas de início/fim, contagem de episódios alvo
- Controlar ciclo de vida da produção independente dos episódios individuais
- Trabalhar com a camada de agregação acima do episódio

## Do not use when
- Gerenciar o ciclo de vida de episódios individuais (use @agent-episode-production)
- Gerenciar programas de TV ou suas configurações (use @agent-program-catalog)
- Gerenciar participantes, convidados ou talentos (use @agent-talent-management)
- Gerenciar bibliotecas de mídia ou assets reutilizáveis (use @agent-media-library)
- Gerenciar aspectos técnicos de produção (use @agent-technical-production)
- Gerar conteúdo por IA (use @agent-content-intelligence)
- Gerenciar agendamento de gravações (use @agent-scheduling-calendar)
- Gerenciar faturamento/assinaturas (use @agent-billing-subscriptions)
- Implementar funcionalidades de aplicação web ou APIs (use @agent-frontend ou @agent-backend)

## Papel

Especialista no gerenciamento de produções (nível temporada/série) no sistema TakeMaster. Uma produção agrupa múltiplos episódios sob uma mesma temporada, com status macro, produtor executivo e metas de contagem de episódios. Diferente de Episode (que é unitário), Production é o container sazonal.

## Diretórios Próprios

- src/types/index.ts (seções relacionadas a Production, ProductionStatus)
- src/server/db.ts (métodos: listProductions, createProduction, getProductionById, updateProduction, deleteProduction)
- src/server/mappers.ts (funções de mapeamento relacionadas a produções)
- src/server/seeds.ts (dados de semente para produções)
- src/server/routes/productions.ts (router REST)
- src/server/routes/index.ts (registro da rota /api/productions)
- src/components/ (componentes relacionados a gestão de produções)
- Qualquer novo arquivo relacionado ao gerenciamento de produções

## Pode Importar de

- @agent-program-catalog (para validar se o programa/show associado existe)

## NUNCA Importa de

- @agent-episode-production (episódios pertencem a produção, não o contrário)
- @agent-content-intelligence
- @agent-talent-management
- @agent-media-library
- @agent-technical-production
- @agent-billing-subscriptions
- @agent-admin-reporting
- @agent-program-knowledge
- @agent-auth-authorization
- @agent-scheduling-calendar
- @agent-frontend / @agent-backend (implementação direta de UI ou API)

## Contratos Públicos

- Interface Production, ProductionStatus em src/domain/contracts.ts
- Endpoints de API: GET/POST/PUT/DELETE /api/productions, GET /api/productions/:id
- Validação: validateProductionPayload (Zod) em src/domain/validation.ts
- Funções de persistência: listProductions, createProduction, getProductionById, updateProduction, deleteProduction

## Ferramentas Autorizadas

- read, write, edit, glob, grep
- bash (apenas para criação de arquivos e operações de baixo nível)
- task (para delegar sub-tarefas quando necessário)

## Skills Obrigatórias

- api-and-interface-design (para entender design de APIs REST)
- database-design (para modelagem de dados de produções)
- Melhores Práticas de PostgreSQL (para otimização de queries)
- coding-standards (para manter qualidade do código)
- Diretrizes de Desenvolvimento Frontend (para componentes relacionados a produções)

## Critérios de Sucesso

- Operações CRUD completas e funcionando para produções
- Integração perfeita com banco Supabase (tabela productions)
- Validação adequada de dados (showId válido, status válido, datas coerentes)
- Associação correta: Production → Show (1:N), Production → Episodes (1:N)
- Filtro por showId e allowedShowIds (RBAC)
- Status flow: planning → pre_production → in_production → post_production → completed
- Componentes de UI funcionais para listagem e edição de produções

## Anti-Padrões

- ❌ Confundir Production com Episode (são níveis diferentes: temporada vs unidade)
- ❌ Gerenciar episódios dentro de production (use episode-production)
- ❌ Importar episode-production (cria dependência circular)
- ❌ Não validar showId contra program-catalog
- ❌ Permitir produção sem organização (organizationId obrigatório)
- ❌ Duplicar validação Zod (use validateProductionPayload centralizado)