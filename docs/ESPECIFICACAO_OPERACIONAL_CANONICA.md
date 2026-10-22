# TakeMaster-v2 — Especificação Operacional Canônica

**Status:** especificação baseada em inspeção do código de `main`; não é certificação de funcionamento.  
**Objetivo:** definir o comportamento ponta a ponta esperado e registrar, por etapa, o que o runtime realmente faz, suas dependências, permissões, falhas e provas de aceite.  
**Regra de leitura:** “Implementado no código” não significa “validado em execução”. Itens classificados como lacuna ou risco não podem ser considerados aprovados antes de correção e teste.  
**Escopo:** cadastro, contratação/habilitação, pré-setup, operação diária, equipe e permissões, administração geral e rotinas recorrentes.  
**Fontes primárias:** `src/App.tsx`, `src/components/LoginModal.tsx`, `src/components/AdminPanelView.tsx`, `src/server/routes/*`, `src/server/auth.ts`, `src/server/authorization.ts`, `src/server/persistence.ts`, `docs/MODELO_ACESSO_MULTIPROGRAMA.md`, `docs/PLANEJAMENTO_INTEGRACAO_VENOPAG.md`, `docs/SCHEMA_RUNTIME_AUDIT.md`, `docs/testing/CANONICAL_TEST_MAP.md`.

---

## 1. Decisões operacionais e vocabulário

### 1.1 Entidades

- **Identidade de usuário:** conta única da pessoa no Supabase Auth.
- **Organização:** contexto administrativo comum ao qual um usuário pode pertencer por `organization_members`.
- **Programa:** unidade operacional e editorial persistida em `programs`; possui dados, episódios, temporadas, agenda, materiais e permissões.
- **Assinatura:** vínculo comercial em `organization_subscriptions` com plano de `commercial_plans`. No modelo comercial pretendido, contratação e autorização de um programa devem ser isoláveis por programa; o código atual ainda opera principalmente com assinatura no nível de organização.
- **Administrador da organização:** papel `owner` ou `admin` em `organization_members`; não equivale automaticamente a administrador global da plataforma.
- **Administrador global:** papel/escopo de plataforma independente da organização. **Não foi comprovado no código um mecanismo de autorização global próprio e completo.**
- **Pré-setup:** processo idempotente que cria e valida a configuração mínima necessária para o programa começar a operar sem depender de preenchimento manual de dados técnicos.

### 1.2 Princípios obrigatórios

1. A conta é única; permissões são concedidas separadamente por programa.
2. Nenhum cliente pode escolher ou forjar um papel privilegiado apenas enviando `role` no payload.
3. A organização e o programa ativos devem ser derivados de uma sessão válida e validados no backend.
4. Contratação não significa pagamento confirmado; pagamento não significa setup concluído; setup concluído não significa que o primeiro acesso foi validado.
5. Cada etapa deve ter estado persistido e resultado verificável. Não usar respostas constantes como se a operação tivesse ocorrido.
6. Operações de criação/atualização devem ser seguras contra repetição quando isso for relevante (idempotência).
7. Falhas devem deixar um estado recuperável, sem conta órfã, assinatura falsa, programa parcialmente habilitado ou indicação de sucesso prematura.
8. Não executar testes destrutivos, pagamentos reais, reset de seed ou geração de IA paga contra produção.
9. Não imprimir credenciais, códigos de acesso, tokens ou conteúdo de `.env` em logs, relatórios ou commits.

---

## 2. Mapa do fluxo principal do usuário

### Etapa U01 — Cadastro da identidade

- **Tela/ação:** aba de cadastro do `LoginModal`; usuário informa nome, e-mail, código de acesso, função e dados iniciais do programa/plano.
- **Endpoint:** o frontend usa a camada `src/services/api.ts`; o backend disponibiliza `POST /api/auth/login` para login e uma rota de sessão, mas **não foi identificado um endpoint público dedicado de cadastro self-service** no roteador atual.
- **Funções atuais:** `registerSaaSAccountWithSubscription()` chama `createOrganizationUserWithShowPermissions()`, em `src/server/persistence.ts`.
- **Persistência atual:** Supabase Auth; `organization_members`. Opcionalmente `programs` e `organization_subscriptions` são gravados no mesmo fluxo de registro.
- **Permissão esperada:** cadastro público só pode criar perfil comum dentro de fluxo comercial permitido. O cliente não deve poder criar `owner/admin` enviando esse valor.
- **Automação esperada:** normalizar e-mail; verificar duplicidade; criar identidade; associar ao contexto correto; criar evento/auditoria; devolver estado de cadastro e próxima etapa. A operação deve ser transacional ou compensável.
- **Sucesso verificável:** identidade encontrada no Auth; associação ativa válida; resposta não contém segredo; login subsequente funciona; conta permanece após recarregar.
- **Falhas:** e-mail duplicado, organização inexistente, falha ao criar membership ou ao criar programa devem produzir erro explícito e compensação/recuperação. Não deixar conta sem vínculo nem reportar cadastro concluído se etapas críticas falharam.
- **Aceite:** `REG-001` cadastro válido; `REG-002` e-mail duplicado; `REG-003` payload com papel privilegiado; `REG-004` falha induzida entre criação de conta e vínculo.
- **Estado no código:** **parcial / contrato de cadastro a esclarecer**. A função de persistência existe, mas a rota pública de cadastro não foi encontrada em `src/server/routes/index.ts`; o fluxo precisa ser rastreado de ponta a ponta no frontend e backend.

### Etapa U02 — Login e criação da sessão

- **Tela/ação:** usuário informa e-mail/identificador, organização e código de acesso.
- **Endpoints:** `POST /api/auth/login`; `POST /api/auth/session` valida token bearer; `POST /api/auth/switch-org` troca o contexto de organização.
- **Funções:** `loginWithEmailOrUserId()`, `buildAuthSession()`, `resolveRequestAuthContext()`, `verifySessionToken()` em `src/server/auth.ts`.
- **Persistência consultada:** Supabase Auth, `organization_members`, `program_user_access` e dados da organização/programa necessários para construir o contexto.
- **Permissão:** conta existente, membership ativo e organização permitida; token válido e chave interna de sessão forte.
- **Automação esperada:** gerar sessão com expiração; derivar o papel e os programas permitidos no servidor; carregar o contexto real e não confiar no estado do navegador.
- **Sucesso:** login retorna sessão; endpoint de sessão confirma a mesma identidade e organização; recarregar a página restaura o contexto de forma segura.
- **Falhas:** credenciais inválidas ou vínculo suspenso devem retornar 401/403 sem vazar existência de contas; token inválido/expirado deve negar acesso; chave interna fraca deve impedir assinatura/verificação.
- **Aceite:** `AUTH-010` login válido; `AUTH-011` contexto de sessão; `AUTH-012` código inválido; `AUTH-013` usuário suspenso; `AUTH-014` troca de contexto não autorizado.
- **Estado:** endpoints e funções existem; execução E2E autenticada ainda deve ser comprovada com evidência de cada perfil.

### Etapa U03 — Contratação, pagamento e habilitação

- **Tela/ação:** responsável seleciona plano e programa e conclui a contratação.
- **Endpoints atuais:** `GET /api/billing/overview`; `POST /api/billing/subscribe`; endpoints de renovação automática e renovação manual em `src/server/routes/billing.ts`.
- **Funções atuais:** `listSaaSPlans()`, `listOrganizationSubscriptions()`, `subscribeOrUpdatePlan()`, `toggleSubscriptionAutoRenew()`, `processAutomaticRenewalCycle()`.
- **Tabelas:** `commercial_plans`, `organization_subscriptions`; a auditoria do schema também identifica `program_catalog`. Faturas e eventos de gateway têm tipos na aplicação, mas `listBillingInvoices()` e `listPaymentGatewayEvents()` retornam arrays vazios.
- **Permissão atual:** consulta requer membership; contratação/alteração de plano exige papel `owner/admin` da organização.
- **Comportamento encontrado:** `subscribeOrUpdatePlan()` cria assinatura `active` após localizar o plano e cancela uma assinatura ativa anterior. Não foi demonstrada confirmação de pagamento por gateway. `toggleSubscriptionAutoRenew()` retorna `true` sem persistir a preferência; `processAutomaticRenewalCycle()` apenas localiza e retorna a assinatura.
- **Automação esperada:** criar intenção de cobrança; redirecionar/invocar gateway VenoPag; validar assinatura do webhook; processar eventos com idempotência; reconciliar status; ativar o acesso somente após confirmação confiável; tratar pendência, falha, cancelamento, estorno e renovação.
- **Sucesso:** pagamento confirmado por evento autenticado do gateway; registro comercial vinculado ao programa contratado; estado habilitado calculado no servidor; usuário recebe confirmação e pode iniciar setup.
- **Falhas:** não habilitar em timeout, retorno de navegador ou payload não autenticado; não duplicar cobranças/eventos; preservar assinatura anterior até mudança de plano confirmada; registrar estado pendente/falha recuperável.
- **Aceite:** `BILLING-001` leitura de planos; `BILLING-002` contratação sem confirmação não ativa acesso; `BILLING-003` evento válido idempotente; `BILLING-004` assinatura inválida rejeitada; `BILLING-005` falha/estorno; `BILLING-006` renovação persiste; testes com gateway simulado em ambiente isolado.
- **Estado:** **bloqueador de produção**. `docs/PLANEJAMENTO_INTEGRACAO_VENOPAG.md` classifica a integração como planejamento não implementado/validado; o fluxo atual não prova pagamento real.

### Etapa U04 — Criação do programa e vínculo do responsável

- **Tela/ação:** o responsável define título, formato, apresentador e informações editoriais básicas.
- **Endpoints:** `GET/POST /api/shows`; `GET/PUT/DELETE /api/shows/:id`.
- **Funções:** `createShow()`, `updateShow()`, `deleteShow()`, `listShows()`, `getShowById()` em `persistence.ts`.
- **Tabela:** `programs`; colunas runtime incluem `organization_id`, `legacy_id`, `title/name`, `host`, `format`, `default_duration_min`, `editorial_style`, `scenario`, `standard_structure`, `default_opening`, `default_closing`.
- **Permissão atual:** criar e atualizar exigem papel `owner/admin` da organização; leitura exige membership e, para item individual, verificação de acesso ao programa.
- **Automação esperada:** criar programa ligado ao contratante/responsável e à assinatura correta; associar um identificador canônico; registrar status comercial/setup; impedir duplicação por repetição de requisição.
- **Sucesso:** programa aparece na listagem permitida; consulta individual retorna o mesmo registro; organização e responsável correspondem à contratação.
- **Falhas:** payload inválido retorna erro de validação; programa de outra organização retorna 404/403; falha de persistência não deve aparecer como sucesso.
- **Aceite:** `CATALOG-001` CRUD isolado; `CATALOG-002` validação; `CATALOG-003` isolamento entre duas organizações/programas.
- **Estado:** CRUD existe; associação comercial e propriedade individual do programa não estão comprovadas como fluxo completo.

### Etapa U05 — Pré-setup automático e checklist de prontidão

- **Tela/ação:** depois de contratação confirmada, usuário vê uma página de setup com progresso, status por etapa e opção de continuar após falha.
- **Endpoints atuais relacionados:** `POST /api/seed/reset` chama `populateOrganizationWorkspace()`; `GET /api/knowledge-base/shows/:showId/knowledge`; `POST /api/knowledge-base/shows/:showId/editorial-identity`; `POST /api/knowledge-base/shows/:showId/suggest-pautas`.
- **Funções atuais:** `populateOrganizationWorkspace()` em `persistence.ts` retorna simplesmente `true`; as rotas de knowledge base geram conteúdo de IA, mas não provam a criação completa do setup nem persistem, por si só, um estado de onboarding.
- **Tabelas envolvidas/esperadas:** `programs`, `seasons`, `episodes`, `participants`, `agenda_events`, `library_assets`, `program_user_access`; tabelas editoriais como `questions`, `segments`, `script_items`, `planned_shorts`, `recording_markers`, `episode_versions`; `ai_generations` quando aplicável.
- **Permissão:** membership ativo e autorização do programa em cada operação; não expor endpoint de reset a usuários comuns em produção.
- **Automação necessária:** criar defaults idempotentes; preparar estrutura editorial, agenda inicial opcional, configurações de estúdio/câmeras, biblioteca e permissões do responsável; marcar cada subetapa; verificar referências e persistência; gravar `setup_status` e versão do setup; suportar retry sem duplicar registros.
- **Sucesso:** cada subetapa tem evidência persistida; reconsulta após novo login encontra a configuração; estado só passa a `ready` após todas as verificações obrigatórias.
- **Falhas:** estado `setup_failed`/parcial com motivo seguro e retry; nunca retornar sucesso constante; não recriar duplicatas; não habilitar o programa operacionalmente se o setup obrigatório falhar.
- **Aceite:** `SETUP-001` provisionamento de ambiente vazio; `SETUP-002` retry idempotente; `SETUP-003` falha parcial e retomada; `SETUP-004` setup de um programa não altera outro; `SETUP-005` estado de pronto confirmado por leitura independente.
- **Estado:** **não implementado funcionalmente no ponto de entrada encontrado**. A função de população é stub e a rota `/api/seed/reset` é acessível a qualquer membro ativo, o que exige revisão e bloqueio fora de ambientes de teste.

### Etapa U06 — Carregamento do workspace

- **Tela/ação:** abrir o painel principal após login e setup.
- **Endpoint:** `GET /api/state` é referenciado pela suíte E2E; verificar sua montagem no servidor e os dados efetivamente retornados antes de declarar o contrato completo.
- **Frontend:** `src/App.tsx` carrega sessão, programas, temporadas, episódios, participantes, agenda e arquivos pela camada `src/services/api.ts`.
- **Persistência:** dados operacionais do schema canônico listados em `docs/SCHEMA_RUNTIME_AUDIT.md`.
- **Permissão:** todos os dados retornados devem ser filtrados no servidor por organização e programa permitido; esconder menu na UI não é controle de segurança.
- **Automação esperada:** apresentar estado vazio orientado quando o setup ainda não terminou; apresentar estado pronto quando coleções foram carregadas; erro de API deve ser visível e permitir nova tentativa.
- **Sucesso:** nenhuma coleção crítica falha silenciosamente; IDs e contagens batem com consultas independentes; atualizar/reabrir mantém dados.
- **Falhas:** expiração de sessão redireciona ao login; API indisponível mostra erro; não usar dados demo como se fossem dados persistidos.
- **Aceite:** `WORKSPACE-001` coleções; `WORKSPACE-002` ambiente vazio; `WORKSPACE-003` persistência após recarga; `PLATFORM-001..004` health e shell UI.
- **Estado:** frontend e endpoints existem em parte; saúde da API não prova carregamento da UI ou do workspace.

---

## 3. Rotina diária do usuário

### Etapa U07 — Programas, temporadas e episódios

- **Telas/ações:** listar programa; criar/editar programa; criar temporada/produção; criar episódio; abrir editor; alterar estado; retomar trabalho.
- **Endpoints:** `/api/shows`, `/api/productions`, `/api/episodes` com operações GET/POST/PUT/DELETE conforme rota.
- **Funções:** `listShows/createShow/updateShow/deleteShow`; `listProductions/createProduction/updateProduction/deleteProduction`; `listEpisodes/createEpisode/updateEpisode/deleteEpisode`.
- **Tabelas:** `programs`, `seasons`, `episodes` e entidades editoriais dependentes.
- **Permissão atual:** programas verificam membership, papel e/ou `assertProgramAccess`; temporadas e episódios verificam membership, mas há pontos nas rotas de coleção/CRUD que precisam ser revisados para garantir que cada operação de escrita também chama `assertProgramAccess` para o programa relacionado.
- **Automação esperada:** validar payload; vincular episódio à temporada/programa corretos; salvar alterações; preservar histórico/versões quando aplicável; não permitir referência cruzada entre programas.
- **Sucesso:** API retorna registro salvo; leitura posterior retorna os mesmos campos; edição e recarga mantêm estado; associações são coerentes.
- **Falhas:** validação retorna 400; item ausente 404; falta de autorização 403; erro de banco 500 sem detalhes internos ou segredo.
- **Aceite:** `PRODUCTION-001`, `EPISODE-001`, mais testes negativos para IDs de outro programa e alterações sem permissão.
- **Estado:** CRUD presente; cobertura de autorização por recurso precisa de revisão sistemática.

### Etapa U08 — Participantes/equipe, agenda e biblioteca

- **Telas/ações:** criar/editar/remover participante; agendar sessão; criar/editar/remover evento; adicionar/editar/remover referência de material.
- **Endpoints:** `/api/guests`, `/api/schedule`, `/api/library`, cada qual com GET/POST/PUT/DELETE.
- **Funções:** `listParticipants/createParticipant/updateParticipant/deleteParticipant`; `listScheduleEvents/createScheduleEvent/updateScheduleEvent/deleteScheduleEvent`; `listLibraryAssets/createLibraryAsset/updateLibraryAsset/deleteLibraryAsset`.
- **Tabelas:** `participants`, `agenda_events`, `library_assets`; vínculos a programa/episódio conforme schema canônico.
- **Permissão atual:** as rotas verificam membership; várias operações de convidado/agenda/biblioteca não invocam explicitamente `assertProgramAccess` em cada mutação. **Isso é um ponto de revisão de segurança, não uma aprovação.**
- **Automação esperada:** validar datas/horários e relações; vincular cada registro ao programa certo; evitar duplicação de evento em retry; manter referências de arquivos válidas; auditar mudanças relevantes.
- **Sucesso:** criação/edição aparece na consulta seguinte e somente no escopo permitido.
- **Falhas:** dados inválidos rejeitados; IDs de outros programas não devem ser aceitos; falha de armazenamento não pode retornar sucesso.
- **Aceite:** `GUEST-001`, `SCHEDULE-001`, `LIBRARY-001` e testes de isolamento entre programas.
- **Estado:** CRUD presente; isolamento por programa deve ser reforçado/confirmado em todas as rotas e funções.

### Etapa U09 — Preparação editorial e geração de IA

- **Telas/ações:** diagnóstico editorial, pesquisa, outline, roteiro, perguntas de aprofundamento, síntese, shorts e assistência contextual.
- **Endpoints:** `POST /api/ai/diagnosis`, `/research`, `/outline`, `/script` e demais rotas montadas em `src/server/routes/ai.ts`; knowledge base em `/api/knowledge-base/shows/:showId/*`.
- **Funções:** `generateEditorialDiagnosis()`, `generateEditorialResearch()`, `generateSmartOutline()`, `generateStudioScript()`, `generateFollowUpRepiques()`, `generatePlannedShorts()`, `generateEditorScriptSynthesis()`, `generateContextualAssist()`, `generateProgramEditorialIdentity()`, `generateProgramPitchSuggestions()`.
- **Tabelas:** `ai_generations` e entidades editoriais/episódio quando a geração for persistida.
- **Permissão atual:** rotas de IA exigem membership; endpoints de conhecimento verificam acesso ao programa. Deve-se confirmar que cada geração com `showId/episodeId` verifica o recurso alvo e que resultado não é gravado no programa errado.
- **Automação esperada:** carregar contexto autorizado; mostrar carregamento/erro; registrar metadados de geração sem registrar segredos ou conteúdo sensível desnecessário; exigir confirmação do usuário para persistir/ substituir texto editorial.
- **Sucesso:** retorno válido, erro de provedor tratado, custo/uso controlado, persistência confirmada separadamente.
- **Falhas:** sem credencial/provedor, timeout ou limite de uso devem gerar erro legível sem destruir texto existente; não simular sucesso; não executar chamadas pagas em E2E de produção.
- **Aceite:** `AI-001` bloqueio anônimo; `AI-002` autorização por programa; `AI-003` resposta de erro; `AI-004` persistência explícita e recuperação; usar mock para cenários automatizados.
- **Estado:** rotas e funções existem; teste autenticado com provedor real não deve ser pressuposto nem realizado como parte da bateria segura de produção.

### Etapa U10 — Estúdio, autosave e retomada

- **Telas/ações:** configurar câmeras, preparar gravação, usar modo de estúdio e editar roteiro.
- **Componentes:** `StudioSetupView.tsx`, componentes de `EpisodeEditor`, `StudioMode` e `src/App.tsx`.
- **Endpoints/funções:** atualizações passam por handlers de `App.tsx` e APIs de programas/episódios; confirmar no rastreamento de cada ação o endpoint exato antes de implementar testes detalhados.
- **Tabelas:** `programs` para configurações de programa; `episodes`, `script_items`, `recording_markers`, `episode_versions` conforme recurso utilizado.
- **Permissão:** acesso ao programa e capacidade de edição; visualizador não pode persistir alterações editoriais.
- **Automação esperada:** autosave com confirmação do backend; indicador de salvamento pendente/salvo/erro; impedir perda de alteração ao navegar; retomada após login.
- **Sucesso:** atualização confirmada pelo servidor e conteúdo recuperado por leitura nova.
- **Falhas:** manter alterações locais em caso de erro recuperável e mostrar aviso; não exibir “salvo” sem confirmação.
- **Aceite:** `EDITOR-001` edição e leitura; `EDITOR-002` falha de rede; `EDITOR-003` recuperação após recarga; `RBAC-001` usuário sem permissão de edição.
- **Estado:** componentes e lógica de autosave existem; fluxo integral ainda precisa ser executado e documentado.

---

## 4. Fluxo de equipe e multiprograma

### Etapa U11 — Convidar/autorizar um profissional

- **Tela/ação:** responsável escolhe usuário existente ou cria identidade e concede papel/acesso ao programa.
- **Endpoints atuais:** `POST /api/admin/users`; `PUT /api/admin/users/:id/permissions`; `PUT /api/admin/users/:id/status`.
- **Funções:** `createOrganizationUserWithShowPermissions()`, `updateUserShowPermissions()`, `updateOrganizationUserStatusOrRole()`.
- **Tabelas:** `organization_members`, `program_user_access`, Supabase Auth; programa em `programs`.
- **Permissão atual:** as três rotas exigem papel `owner/admin` da organização. A função de criação usa `db.auth.admin.createUser`; permissões de programa são registradas por `catalog_program_id`.
- **Risco:** criação de usuário novo e autorização de um usuário já existente não parecem constituir um fluxo único de convite; é necessário comprovar que não se criam contas duplicadas para a mesma pessoa. A função de permissões ignora IDs de programa que não tenham `catalog_program_id`.
- **Automação esperada:** procurar identidade existente; criar convite ou vínculo sem duplicar conta; conceder apenas programa/escopo solicitado; notificar o usuário; auditar autor e mudança; confirmar a autorização após nova sessão.
- **Sucesso:** uma identidade consegue acessar apenas programas explicitamente autorizados; revogar A não remove acesso legítimo a B.
- **Falhas:** programa inexistente, conta não encontrada ou permissão inválida não pode ser silenciosamente ignorada; não revelar credenciais de outro usuário.
- **Aceite:** `MULTI-001` mesma identidade em A e B; `MULTI-002` revogar A preserva B; `MULTI-003` tentativa de ler B sem autorização é negada; `MULTI-004` convite/usuário duplicado; `MULTI-005` papel comum não consegue administrar equipe.
- **Estado:** modelo documentado; implementação ainda não validada conforme `docs/MODELO_ACESSO_MULTIPROGRAMA.md`.

### Etapa U12 — Suspensão e remoção de acesso

- **Tela/ação:** administrador suspende membership ou altera papel; profissional tenta usar sessão existente.
- **Endpoint:** `PUT /api/admin/users/:id/status`; permissões por programa em `PUT /api/admin/users/:id/permissions`.
- **Persistência:** `organization_members.active/role`; `program_user_access.status`.
- **Permissão:** administrador da organização no modelo atual; operação global exige papel global separado, ainda não comprovado.
- **Automação esperada:** impedir novas requisições imediatamente após suspensão; invalidar/revalidar contexto da sessão; manter histórico auditável; não revogar programas não relacionados indevidamente.
- **Sucesso:** API protegida retorna 403 para usuário suspenso e o painel reflete o estado.
- **Falhas:** se a alteração não persistir, UI deve mostrar erro e manter o estado anterior; não indicar suspensão concluída antes da confirmação.
- **Aceite:** `RBAC-002` suspensão; `RBAC-003` reativação; `RBAC-004` revogação isolada por programa.
- **Estado:** mutação existe; invalidação imediata e isolamento devem ser testados.

---

## 5. Fluxo do administrador geral

### Distinção obrigatória

O painel atual usa papéis `owner/admin` em `organization_members`. A rota `GET /api/admin/overview` chama `assertOrganizationRole(..., ['owner','admin'])` e então executa `listUsersAndOrganizations()`, que busca usuários/organizações de escopo global. Isso cria um **risco de autorização**: ser admin de uma organização não pode implicar acesso global automaticamente.

O papel visual “Direção Geral (Admin Master)” em `LoginModal.tsx` não prova a existência de uma autorização global própria no backend.

### Etapa A01 — Autenticação e acesso ao painel global

- **Tela:** `AdminPanelView.tsx`.
- **Endpoints:** `GET /api/admin/overview` e demais rotas administrativas.
- **Funções:** `resolveRequestAuthContext()`, `assertOrganizationRole()`, `listUsersAndOrganizations()`.
- **Persistência:** Supabase Auth, `organization_members`, organizações e usuários.
- **Permissão exigida desejada:** claim/role global dedicado verificado no servidor, independente de papel da organização. Separar explicitamente `platform_admin` de `owner/admin`.
- **Automação:** verificar autorização em toda requisição, não só esconder item de menu; auditar acessos e ações globais.
- **Sucesso:** administrador global vê painel global; admin de organização só vê seu escopo.
- **Falha:** usuário sem privilégio global recebe 403 mesmo se for `owner` de uma organização.
- **Aceite:** `GLOBAL-001` global autorizado; `GLOBAL-002` admin de organização não vê dados globais; `GLOBAL-003` usuário comum negado.
- **Estado:** **bloqueador de segurança a resolver** antes de validar o painel como global.

### Etapa A02 — Visão operacional e diagnóstico

- **Tela/ação:** consultar usuários, organizações, programas, assinaturas, indicadores e logs.
- **Endpoints/funções:** `GET /api/admin/overview`; relatório `buildAdminReportSummary()`; dados de programas, usuários, assinaturas e auditoria.
- **Tabelas:** `organization_members`, Auth, `programs`, `seasons`, `episodes`, `organization_subscriptions`, `commercial_plans`, `audit_log`.
- **Permissão:** escopo global para visão global; escopo organizacional para relatório restrito.
- **Automação:** indicadores calculados a partir de dados reais; marcar métricas indisponíveis em vez de exibir zero fictício; filtrar dados por escopo.
- **Sucesso:** contagens conciliam com consultas de referência e o painel identifica falhas sem expor segredos.
- **Falhas:** dados indisponíveis exibidos como erro/indisponível; não transformar ausência de integração em faturamento zero ou sucesso.
- **Aceite:** `GLOBAL-004` conciliação de contagens; `GLOBAL-005` filtro de escopo; `GLOBAL-006` dados de cobrança ausentes explicitamente sinalizados.
- **Estado:** painel e funções de resumo existem; faturas/eventos de gateway retornam listas vazias e algumas métricas são constantes zero, portanto não são fonte confiável de faturamento.

### Etapa A03 — Gerenciar contas, papéis e acessos

- **Tela/ação:** criar usuário, alterar permissões, suspender/reativar conta.
- **Endpoints:** `POST /api/admin/users`; `PUT /api/admin/users/:id/permissions`; `PUT /api/admin/users/:id/status`.
- **Funções/tabelas:** funções de gestão em `persistence.ts`; Auth, `organization_members`, `program_user_access`.
- **Permissão:** papel global para ações de plataforma; admin de organização apenas no seu contexto.
- **Automação:** validar transição de papéis; impedir autoelevação; registrar ator, alvo, escopo e resultado; atualizar sessão/permissões.
- **Sucesso:** leitura posterior confirma mudança e teste de autorização reflete a mudança.
- **Falhas:** 403 sem autorização; 404 alvo inexistente; validação impede papel inválido; falha de gravação não mostra sucesso.
- **Aceite:** `GLOBAL-007` impedir autoelevação; `GLOBAL-008` alteração válida; `GLOBAL-009` tentativa cross-org; `GLOBAL-010` trilha de auditoria.
- **Estado:** endpoints existem; separação global/organizacional e controles completos não estão comprovados.

### Etapa A04 — Administração comercial

- **Tela:** aba de assinaturas e relatórios em `AdminPanelView.tsx`.
- **Endpoints:** `/api/billing/overview`, `/api/billing/subscribe`, endpoints de auto-renew/renew-now.
- **Persistência:** `commercial_plans`, `organization_subscriptions`; faturas e eventos ainda retornam arrays vazios.
- **Permissão:** papel autorizado no escopo do contrato; operações globais só com papel global.
- **Automação:** conciliar status do gateway, assinatura e acesso ao programa; emitir histórico de eventos e alertas para falha de renovação.
- **Sucesso:** status comercial bate com o gateway; usuário é habilitado/suspenso conforme regras contratuais.
- **Falha:** não modificar assinatura apenas por retorno visual; divergência gera alerta e estado de reconciliação.
- **Aceite:** `GLOBAL-011` conciliação gateway; `GLOBAL-012` assinatura não confirmada; `GLOBAL-013` falha de renovação.
- **Estado:** **incompleto**; integração VenoPag ainda documentada como planejamento.

### Etapa A05 — Auditoria e incidentes

- **Tela/ação:** consultar eventos, investigar falha, corrigir configuração e verificar recuperação.
- **Tabelas/funções:** `audit_log`, logger estruturado e métricas; consultar nomes reais no schema canônico.
- **Permissão:** acesso a logs sensíveis limitado; nunca revelar tokens, códigos, chaves ou conteúdo de `.env`.
- **Automação:** registrar ator, ação, alvo, instante, resultado e identificador de correlação; redigir dados sensíveis.
- **Sucesso:** é possível reconstruir a intervenção e confirmar o estado depois dela.
- **Falha:** falha de auditoria deve ser tratada conforme criticidade; não mascarar incidente.
- **Aceite:** `AUDIT-001` ação administrativa registrada; `AUDIT-002` segredos ausentes; `OPS-001` falha recuperável; `OPS-002` serviço e UI verificados.
- **Estado:** infraestrutura de log existe; cobertura e conteúdo de auditoria precisam ser conferidos por operação.

---

## 6. Rotinas automáticas recorrentes que o produto deve garantir

| Rotina | Gatilho esperado | Resultado persistido | Estado encontrado |
|---|---|---|---|
| Validar assinatura e habilitação | Login e acesso a recurso | Acesso calculado com base em status comercial real | Não comprovado ponta a ponta |
| Completar pré-setup | Pagamento confirmado/contrato habilitado | Estado e versão de setup; recursos padrão criados | Stub atual; falta implementar |
| Revalidar sessão e permissões | Toda requisição protegida | Acesso atualizado e escopo correto | Parcial; testar suspensão e cache de sessão |
| Autosave editorial | Alteração no editor | Conteúdo confirmado no banco | Lógica de UI existe; precisa E2E |
| Gerar conteúdo com IA | Ação explícita do usuário | Resposta e metadados; persistência quando confirmada | Rotas existem; validar autorização, erro e persistência |
| Renovação comercial | Ciclo da assinatura | Estado e evento conciliados com gateway | Stub atual; falta implementar |
| Auditar ação privilegiada | Alteração administrativa | Evento auditável sem segredos | Cobertura não comprovada |
| Recuperação de falha | Erro de API, provedor ou setup | Estado recuperável e retry seguro | Contrato precisa ser implementado/validado |
| Verificação de saúde | Monitoramento | Status técnico da API | `/health` existe; não prova UI ou fluxo de negócio |

---

## 7. Matriz canônica de dados

O runtime usa o schema descrito em `docs/SCHEMA_RUNTIME_AUDIT.md`. Não presumir que tabelas legadas tenham os mesmos nomes.

| Domínio | Entidades canônicas identificadas |
|---|---|
| Identidade/acesso | Supabase Auth, `organizations`, `organization_members`, `program_user_access` |
| Catálogo/comercial | `programs`, `program_catalog`, `commercial_plans`, `organization_subscriptions` |
| Produção | `seasons`, `episodes`, `participants`, `agenda_events`, `library_assets` |
| Editorial | `questions`, `segments`, `script_items`, `planned_shorts`, `recording_markers`, `episode_versions` |
| IA/auditoria | `ai_generations`, `audit_log` |

**Bloqueador de reprodutibilidade:** `docs/SCHEMA_RUNTIME_AUDIT.md` registra divergência histórica entre migrations legadas e schema de runtime. Não aplicar migrations antigas nem renomear tabelas para fazer teste passar. Qualquer mudança de schema exige baseline canônica e verificação em ambiente isolado.

---

## 8. Critérios globais de falha e sucesso

Toda jornada só é aprovada quando cumprir todos os critérios aplicáveis:

1. **UI:** tela abre, navegação funciona, estado de carregamento/erro é visível e não há erro crítico de console/rede.
2. **API:** status HTTP esperado e contrato de resposta válido.
3. **Autorização:** teste positivo e negativo; verificar o escopo no servidor.
4. **Persistência:** consultar novamente por API/banco após a mutação e, quando aplicável, após novo login.
5. **Isolamento:** recurso de outro usuário/programa/organização não pode ser lido nem alterado.
6. **Falha:** timeout, erro de provedor e payload inválido não geram sucesso falso nem dados parciais sem recuperação.
7. **Observabilidade:** logs úteis sem segredos; evidência identificada por ID do teste.
8. **Segurança comercial:** nenhum pagamento real; nenhuma assinatura ativa sem evento confiável; nenhuma chamada paga de IA automatizada.
9. **Limpeza:** CRUD de E2E só em ambiente `test` ou `staging`, com identidade dedicada e limpeza apenas dos registros criados pelo teste.
10. **Relatório:** contar separadamente passed, failed, skipped e not-run; skipped não é aprovado.

---

## 9. Plano de aceite antes de declarar a plataforma utilizável

### Fase 1 — Contratos e bloqueadores
- Rastrear o fluxo real do formulário de cadastro até a API; definir endpoint de cadastro canônico.
- Definir papel global no backend e separar de `owner/admin` organizacional.
- Corrigir a consulta global de `/api/admin/overview` para respeitar o escopo.
- Remover/bloquear o endpoint de seed/reset em produção.
- Definir o modelo de contratação por programa, pagamento VenoPag e confirmação idempotente.
- Definir estados explícitos: `pending_payment`, `payment_confirmed`, `setup_pending`, `setup_running`, `setup_failed`, `ready`, `suspended`, `cancelled` (nomes finais dependem de ADR e schema).

### Fase 2 — Pré-setup idempotente
- Implementar orquestração de setup e estado persistido.
- Criar defaults necessários uma única vez.
- Testar retry, falha parcial, isolamento e recuperação.
- Só habilitar o workspace após validação do setup.

### Fase 3 — Autorização e isolamento
- Auditar cada rota de mutação por recurso e assegurar `assertProgramAccess` onde aplicável.
- Testar conta comum, admin de organização, administrador global e usuário suspenso.
- Testar multiprograma A/B com uma identidade e permissões independentes.

### Fase 4 — Jornadas E2E completas em ambiente isolado
- Cadastro → contratação simulada → confirmação simulada → setup → primeiro login → criação de episódio → edição/IA mock → agenda/biblioteca → logout/novo login → confirmação de persistência.
- Administrador global → visão geral → usuário → permissão → suspensão → auditoria → conciliação comercial simulada.
- Executar apenas contra `E2E_TARGET_KIND=test|staging` com `E2E_ALLOW_PERSISTENT_WRITES=true`; nunca habilitar escrita persistente contra produção.
- Não inventar endpoints ausentes: logout, recuperação de senha e webhook de gateway continuam não comprovados segundo `docs/testing/CANONICAL_TEST_MAP.md`.

### Fase 5 — Certificação
- Rodar lint, build e bateria E2E aprovada.
- Guardar SHA exato, URL/ambiente, data, relatório JSON/HTML, traces/screenshot para falhas e evidência de persistência.
- Corrigir todos os bloqueadores críticos e reexecutar os testes afetados.
- Só declarar “pronto para uso” quando os dois perfis passarem as jornadas completas e os critérios de isolamento/comercial forem comprovados.

---

## 10. Referência dos endpoints observados

Prefixos montados em `src/server/routes/index.ts`:

| Prefixo | Rotas/uso observado |
|---|---|
| `/api/auth` | `POST /login`, `POST /session`, `POST /switch-org`; logout/recuperação não encontrados |
| `/api/shows` | listar, criar, consultar, atualizar e excluir programas |
| `/api/episodes` | listar, criar, consultar, atualizar e excluir episódios |
| `/api/productions` | temporadas/produções CRUD |
| `/api/guests` | participantes CRUD |
| `/api/schedule` | agenda CRUD |
| `/api/library` | biblioteca CRUD |
| `/api/billing` | overview, subscribe, auto-renew e renew-now; gateway/webhook não comprovado |
| `/api/admin` | overview, criar usuário, atualizar permissões e status |
| `/api/ai` | geração de conteúdo editorial |
| `/api/knowledge-base` | conhecimento/identidade editorial e sugestões por programa |
| `/api/seed` | `POST /reset`; chama stub, requer bloqueio em produção |
| `/health` | saúde técnica básica da API |

---

## 11. Declaração de estado no momento da documentação

**Não certificado para produção como fluxo SaaS completo.** O repositório contém telas e APIs operacionais, mas a inspeção identificou bloqueadores materiais: cadastro público não tem contrato de endpoint claramente comprovado; assinatura é ativada sem prova de pagamento; integração VenoPag está apenas planejada; pré-setup automático é stub; a administração global não está isolada de forma comprovada do papel administrativo de organização; há rotas de CRUD cuja autorização por programa precisa de revisão; e logout/recuperação/webhook não foram encontrados conforme o mapa E2E.

Esta especificação é o contrato de referência para a próxima fase de implementação e testes. Ela não afirma que os testes foram executados nem que os fluxos estão aprovados.
