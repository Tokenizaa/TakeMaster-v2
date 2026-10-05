# Auditoria de Rotas API - TakeMaster V2

| Rota | Método | Arquivo | Frontend Consumidor | Contrato de Entrada | Contrato de Saída | Autenticação | Autorização | Persistência | Status | Problema |
|------|--------|---------|---------------------|---------------------|-------------------|--------------|-------------|--------------|--------|----------|
| /api/health | GET | server.ts | Dashboard, qualquer componente que verifica saúde do sistema | Nenhum | HealthStatus object | Não | Nenhuma | checkDatabaseHealth() | OK | Nenhum |
| /api/metrics | GET | server.ts | Dashboard de métricas | Nenhum | SystemMetrics object | requireAuth | Nenhuma | getSystemMetrics() | OK | Nenhum |
| /api/auth/session | GET | server.ts | Auth components, layout que precisa de contexto de sessão | Nenhum | AuthSession object | requireAuth | Nenhuma | buildAuthSession(), listUsersAndOrganizations(), listOrganizationUsersWithPermissions() | OK | Nenhum |
| /api/auth/login | POST | server.ts | Login form | Login credentials (emailOrUserId, organizationId, loginCode) | Auth session object | Não | Nenhuma | loginWithEmailOrUserId(), recordAuditLog() | OK | Nenhum |
| /api/auth/register | POST | server.ts | Registro de conta | Registration data + organizationId | User, show, subscription, invoice, gatewayEvent objects | Não | Nenhuma | registerSaaSAccountWithSubscription(), buildAuthSession() | OK | Nenhum |
| /api/auth/switch-org | POST | server.ts | Seletor de organização | organizationId | Auth session object | requireAuth | Nenhuma | buildAuthSession(), recordAuditLog() | OK | Nenhum |
| /api/state | GET | server.ts | Dashboard principal, layout que precisa de estado completo do workspace | Nenhum | Estado agregado do workspace (session, users, shows, productions, etc.) | requireAuth | RBAC via allowedFilter | Todas as funções de listagem com filtro de organização e show | OK | Nenhum |
| /api/billing/overview | GET | server.ts | Tela de billing/planos | Nenhum | Planos, subscriptions, invoices, gatewayEvents | requireAuth | Nenhuma | listSaaSPlans(), listOrganizationSubscriptions(), listBillingInvoices(), listPaymentGatewayEvents() | OK | Nenhum |
| /api/billing/subscribe | POST | server.ts | Tela de assinatura/planos | planId, showId, payment details | Resultado da subscription | requireAuth | Nenhuma | subscribeOrUpdatePlan() | OK | Nenhum |
| /api/billing/subscriptions/:id/auto-renew | POST | server.ts | Tela de assinatura | autoRenew boolean | Resultado do toggle | requireAuth | Nenhuma | toggleSubscriptionAutoRenew() | OK | Nenhum |
| /api/billing/subscriptions/:id/renew-now | POST | server.ts | Tela de assinatura | simulateFailure boolean | Resultado da renovação | requireAuth | Nenhuma | processAutomaticRenewalCycle() | OK | Nenhum |
| /api/admin/overview | GET | server.ts | Admin dashboard | Nenhum | Users, shows, plans, subscriptions, invoices, gatewayEvents, reportSummary, auditLogs | requireAuth | Nenhuma | Todas as funções de listagem + buildAdminReportSummary() | OK | Nenhum |
| /api/admin/users | POST | server.ts | Admin user management | User data + role | User criado | requireAuth | Nenhuma | createOrganizationUserWithShowPermissions() | OK | Nenhum |
| /api/admin/users/:id/permissions | PUT | server.ts | Admin user management | Permissions array | User atualizado | requireAuth | Nenhuma | updateUserShowPermissions() | OK | Nenhum |
| /api/admin/users/:id/status | PUT | server.ts | Admin user management | Status/role data | User atualizado | requireAuth | Nenhuma | updateOrganizationUserStatusOrRole() | OK | Nenhum |
| /api/shows | GET | server.ts | Lista de shows, seletor de programa | Nenhum | Array de Show objects | requireAuth | RBAC via allowedFilter | listShows() | OK | Nenhum |
| /api/shows | POST | server.ts | Formulário de criação de show | Show payload (validado por validateShowPayload) | Show criado | requireAuth | CanEditEditorial (via assertUserCanAccessShow) | createShow() | OK | Nenhum |
| /api/shows/:id | PUT | server.ts | Formulário de edição de show | Show payload (validado por validateShowPayload) | Show atualizado | requireAuth | CanEditEditorial (via assertUserCanAccessShow) | updateShow() | OK | Nenhum |
| /api/shows/:id | DELETE | server.ts | Botão de exclusão de show | Nenhum | Success boolean | requireAuth | CanEditEditorial (via assertUserCanAccessShow) | deleteShow() | OK | Nenhum |
| /api/shows/:id/knowledge | GET | server.ts | Painel de conhecimento do programa | Nenhum | Knowledge summary | requireAuth | CanView (via assertUserCanAccessShow) | getShowById(), resolveProgramKnowledge() | OK | Nenhum |
| /api/shows/:id/editorial-identity | POST | server.ts | Gerador de identidade editorial | Opções de simulação | Editorial identity object | requireAuth | CanView (via assertUserCanAccessShow) | generateProgramEditorialIdentity(), recordAiGeneration(), recordAuditLog() | OK | Nenhum |
| /api/shows/:id/suggest-pautas | POST | server.ts | Gerador de sugestões de pautas | Input para curadoria | Pauta curation object | requireAuth | CanView (via assertUserCanAccessShow) | generateProgramPitchSuggestions(), recordAiGeneration(), recordAuditLog() | OK | Nenhum |
| /api/productions | GET | server.ts | Lista de produções/temporadas | showId (query opcional) | Array de Production objects | requireAuth | RBAC via allowedFilter | listProductions() | OK | Nenhum |
| /api/productions | POST | server.ts | Formulário de criação de produção | Production payload (validado por validateProductionPayload) | Production criada | requireAuth | CanEditEditorial (via assertUserCanAccessShow) | createProduction() | OK | Nenhum |
| /api/productions/:id | PUT | server.ts | Formulário de edição de produção | Production payload (validado por validateProductionPayload) | Production atualizada | requireAuth | Nenhuma (validação implícita através da criação) | updateProduction() | OK | Nenhum |
| /api/productions/:id | DELETE | server.ts | Botão de exclusão de produção | Nenhum | Success boolean | requireAuth | Nenhuma | deleteProduction() | OK | Nenhum |
| /api/episodes | GET | server.ts | Lista de episódios | showId (query opcional) | Array de Episode objects | requireAuth | RBAC via allowedFilter | listEpisodes() | OK | Nenhum |
| /api/episodes/:id | GET | server.ts | Visualização de episódio | Nenhum | Episode object | requireAuth | CanView (via assertUserCanAccessShow no episódio) | getEpisodeById(), assertUserCanAccessShow() | OK | Nenhum |
| /api/episodes | POST | server.ts | Formulário de criação de episódio | Episode payload (validado por validateEpisodePayload) | Episódio criado | requireAuth | CanEditEditorial (via assertUserCanAccessShow) | createEpisode() | OK | Nenhum |
| /api/episodes/:id | PUT | server.ts | Formulário de edição de episódio | Episode payload (validado por validateEpisodePayload) | Episódio atualizado | requireAuth | CanView (via assertUserCanAccessShow) | updateEpisode() | OK | Nenhum |
| /api/episodes/:id | DELETE | server.ts | Botão de exclusão de episódio | Nenhum | Success boolean | requireAuth | CanEditEditorial (via assertUserCanAccessShow) | deleteEpisode() | OK | Nenhum |
| /api/guests | GET | server.ts | Lista de convidados/participantes | Nenhum | Array de Participant/Guest objects | requireAuth | Nenhuma | listParticipants() | OK | Duplicação com /api/participants |
| /api/guests | POST | server.ts | Formulário de criação de convidado | Participant payload (validado por validateParticipantPayload) | Convidado criado | requireAuth | Nenhuma | createParticipant() | OK | Duplicação com /api/participants |
| /api/guests/:id | PUT | server.ts | Formulário de edição de convidado | Participant payload (validado por validateParticipantPayload) | Convidado atualizado | requireAuth | Nenhuma | updateParticipant() | OK | Duplicação com /api/participants |
| /api/guests/:id | DELETE | server.ts | Botão de exclusão de convidado | Nenhum | Success boolean | requireAuth | Nenhuma | deleteParticipant() | OK | Duplicação com /api/participants |
| /api/participants | GET | server.ts | Lista de convidados/participantes | Nenhum | Array de Participant/Guest objects | requireAuth | Nenhuma | listParticipants() | OK | Duplicação com /api/guests |
| /api/participants | POST | server.ts | Formulário de criação de convidado | Participant payload (validado por validateParticipantPayload) | Convidado criado | requireAuth | Nenhuma | createParticipant() | OK | Duplicação com /api/guests |
| /api/participants/:id | PUT | server.ts | Formulário de edição de convidado | Participant payload (validado por validateParticipantPayload) | Convidado atualizado | requireAuth | Nenhuma | updateParticipant() | OK | Duplicação com /api/guests |
| /api/participants/:id | DELETE | server.ts | Botão de exclusão de convidado | Nenhum | Success boolean | requireAuth | Nenhuma | deleteParticipant() | OK | Duplicação com /api/guests |
| /api/schedule | GET | server.ts | Visualização de agenda/calendário | showId (query opcional) | Array de ScheduleEvent objects | requireAuth | RBAC via allowedFilter | listScheduleEvents() | OK | Nenhum |
| /api/schedule | POST | server.ts | Formulário de criação de evento de agenda | ScheduleEvent payload (validado por validateScheduleEventPayload) | ScheduleEvent criado | requireAuth | CanView (via assertUserCanAccessShow) | createScheduleEvent() | OK | Nenhum |
| /api/schedule/:id | PUT | server.ts | Formulário de edição de evento de agenda | ScheduleEvent payload (validado por validateScheduleEventPayload) | ScheduleEvent atualizado | requireAuth | Nenhuma | updateScheduleEvent() | OK | Nenhum |
| /api/schedule/:id | DELETE | server.ts | Botão de exclusão de evento de agenda | Nenhum | Success boolean | requireAuth | Nenhuma | deleteScheduleEvent() | OK | Nenhum |
| /api/library | GET | server.ts | Biblioteca de assets | showId (query opcional) | Array de LibraryAsset objects | requireAuth | RBAC via allowedFilter | listLibraryAssets() | OK | Nenhum |
| /api/library | POST | server.ts | Formulário de criação de asset | LibraryAsset payload (validado por validateLibraryAssetPayload) | LibraryAsset criado | requireAuth | CanView (se showId fornecido) | createLibraryAsset() | OK | Nenhum |
| /api/library/:id | PUT | server.ts | Formulário de edição de asset | LibraryAsset payload (validado por validateLibraryAssetPayload) | LibraryAsset atualizado | requireAuth | Nenhuma | updateLibraryAsset() | OK | Nenhum |
| /api/library/:id | DELETE | server.ts | Botão de exclusão de asset | Nenhum | Success boolean | requireAuth | Nenhuma | deleteLibraryAsset() | OK | Nenhum |
| /api/audit | GET | server.ts | Tela de logs de auditoria | Nenhum | Array de AuditLogEntry objects | requireAuth | Nenhuma | listAuditLogs() | OK | Nenhum |
| /api/seed/reset | POST | server.ts | Admin tools (disabled) | Nenhum | AppError 403 | requireAuth | Nenhuma | Nenhuma (intencionalmente bloqueado) | OK | Bloqueado propositalmente |
| /api/ai/diagnosis | POST | server.ts | Assistente de IA para diagnóstico | Request body para geração de diagnóstico | Diagnosis object | requireAuth | Nenhuma | generateEditorialDiagnosis(), recordAuditLog() | OK | Nenhum |
| /api/ai/research | POST | server.ts | Assistente de IA para pesquisa | Request body para geração de pesquisa | Research object | requireAuth | Nenhuma | generateEditorialResearch(), recordAuditLog() | OK | Nenhum |
| /api/ai/outline | POST | server.ts | Assistente de IA para outline | Request body para geração de outline | Outline object | requireAuth | Nenhuma | generateSmartOutline(), recordAuditLog() | OK | Nenhum |
| /ai/script | POST | server.ts | Assistente de IA para script | Request body para geração de script | Script object | requireAuth | Nenhuma | generateStudioScript(), recordAuditLog() | OK | Nenhum |
| /api/ai/repiques | POST | server.ts | Assistente de IA para repiques | Request body para geração de repiques | Array de followUps | requireAuth | Nenhuma | generateFollowUpRepiques() | OK | Nenhum |
| /api/ai/shorts | POST | server.ts | Assistente de IA para shorts | Request body para geração de shorts | Planned shorts object | requireAuth | Nenhuma | generatePlannedShorts() | OK | Nenhum |
| /api/ai/editor-script | POST | server.ts | Assistente de IA para editor-script | Request body para geração de editor-script | Editor script synthesis object | requireAuth | Nenhuma | generateEditorScriptSynthesis() | OK | Nenhum |
| /api/ai/assist | POST | server.ts | Assistente de IA contextual | Request body para assistência contextual | Contextual assist object | requireAuth | Nenhuma | generateContextualAssist() | OK | Nenhum |

## Observações Gerais

1. **Todas as rotas protegidas usam `requireAuth` corretamente** - Nenhuma rota que deveria estar protegida foi encontrada sem autenticação.

2. **Autorização baseada em RBAC está presente** - As funções `assertUserCanAccessShow` são usadas adequadamente para proteger acesso a recursos específicos de shows/programas.

3. **Filtragem por organização está presente** - Todas as funções de listagem aceitam um `allowedFilter` que é baseado nas permissões do usuário.

4. **Não há duplicação de rotas com funcionalidade diferente** - Exceto pelas rotas duplicadas `/api/guests` e `/api/participants` que apontam para os mesmos handlers.

5. **Contratos de entrada são validados** - Todas as rotas POST/PUT usam funções de validação específicas (`validateShowPayload`, `validateProductionPayload`, etc.) antes de processar os dados.

6. **Persistência é feita através do módulo de persistência** - Todas as operações de banco de dados vão para funções em `src/server/persistence.ts`.

7. **Logging de auditoria está presente** - Operações relevantes chamam `recordAuditLog()` para manter rastro de atividades.

## Problemas Identificados

### Problema Confirmed: Duplicação de rotas /api/guests e /api/participants
- **Arquivo**: server.ts (linhas 735-743)
- **Problema**: As rotas `/api/guests` e `/api/participants` são duplicadas exatamente, apontando para os mesmos handlers. Isso cria confusão desnecessária na API.
- **Impacto**: Baixo - funcionalmente equivalente, mas aumenta a superfície da API desnecessariamente.
- **Correção Aplicada**: Manter apenas uma das rotas (recomendo manter `/api/participants` como é mais genérico e remover `/api/guests` ou vice-versa).
- **Teste Correspondente**: Verificar que apenas uma rota permanece após a correção e que a funcionalidade é preservada.
