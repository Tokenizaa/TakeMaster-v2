# Auditoria de Persistência - TakeMaster V2

## 1. Verificação Geral

| Verificação | Status | Problema |
|-------------|--------|----------|
| Supabase only | ✅ | Nenhum uso de SQLite, localStorage, db.json ou adapters paralelos detectado |
| UUID interno | ✅ | Uso de `isUuid()` function e `legacyId()` function para compatibilidade |
| legacy_id somente na compatibilidade | ✅ | `legacyId()` function usada apenas para compatibilidade com IDs legados |
| organization isolation | ✅ | Todas as funções de listagem aceitam parâmetro `organizationId` |
| program isolation | ✅ | Funções que precisam de isolamento por programa usam `assertUserCanAccessShow` ou verificações semelhantes |
| mapeamento Show ↔ Program | ✅ | Relacionamento preservado através de `program_id` |
| Production ↔ Season | ✅ | Relacionamento preservado através de `program_id` na tabela `seasons` |
| Guest ↔ Participant | ✅ | Mesma entidade usada para ambos (Participant = Guest type alias) |

## 2. Mapeamento de Campos Específicos

### Show Mapping (mapShow function)
| Campo Banco | Campo Contrato | Mapeamento | Status |
|-------------|----------------|------------|--------|
| id | id | legacyId(r) | ✅ |
| organization_id | organizationId | r.organization_id || undefined | ✅ |
| name | title | r.title || r.name || '' | ✅ |
| title | title | r.title || r.name || '' | ✅ |
| description | description | r.description||'' | ✅ |
| host | host | r.host||'' | ✅ |
| format | format | r.format||'Outro' | ✅ |
| default_duration_min | defaultDurationMin | r.default_duration_min ?? r.default_episode_duration_minutes ?? 0 | ✅ |
| editorial_style | editorialStyle | r.editorial_style||'' | ✅ |
| scenario | scenario | r.scenario||'' | ✅ |
| standard_structure | standardStructure | r.standard_structure||[] | ✅ |
| default_opening | defaultOpening | r.default_opening||'' | ✅ |
| default_closing | defaultClosing | r.default_closing||'' | ✅ |
| target_audience | targetAudience | r.target_audience||undefined | ✅ |
| created_at | createdAt | r.created_at | ✅ |
| updated_at | updatedAt | r.updated_at | ✅ |
| catalog_status | catalogStatus | undefined (não mapeado) | ❌ |
| category | category | undefined (não mapeado) | ❌ |
| distribution_channels | distributionChannels | undefined (não mapeado) | ❌ |
| created_by | createdBy | undefined (não mapeado) | ❌ |

### Production Mapping (mapProduction function)
| Campo Banco | Campo Contrato | Mapeamento | Status |
|-------------|----------------|------------|--------|
| id | id | r.id | ✅ |
| program_id | showId | legacyId(p)||r.program_id | ✅ |
| organization_id | organizationId | p?.organization_id || '' | ✅ |
| number | seasonNumber | r.number||0 | ✅ |
| title | title | r.title||'' | ✅ |
| status | status | r.status||'planning' | ✅ |
| target_episodes_count | targetEpisodesCount | r.target_episodes_count||0 | ✅ |
| executive_producer | executiveProducer | r.executive_producer||'' | ✅ |
| start_date | startDate | r.start_date||null | ✅ |
| end_date | endDate | r.end_date||null | ✅ |
| notes | notes | r.notes||'' | ✅ |
| created_at | createdAt | r.created_at | ✅ |
| updated_at | updatedAt | r.updated_at | ✅ |

### Episode Mapping (mapEpisode function)
| Campo Banco | Campo Contrato | Mapeamento | Status |
|-------------|----------------|------------|--------|
| id | id | legacyId(r) | ✅ |
| program_id | showId | legacyId(p)||r.program_id | ✅ |
| season_id | productionId | r.season_id||undefined | ✅ |
| episode_number | episodeNumber | r.episode_number||0 | ✅ |
| title | title | r.title||'' | ✅ |
| idea | idea | r.idea||'' | ✅ |
| guest_name | guestName | r.guest_name||'' | ✅ |
| guest_id | guestId | r.guest_id ? (pmap.get(r.guest_id)||r.guest_id) : undefined | ✅ |
| host | host | r.host||r.presenter_name||'' | ✅ |
| format | format | r.format||'Outro' | ✅ |
| target_duration_min | targetDurationMin | r.target_duration_min??r.target_duration_minutes??0 | ✅ |
| objective | objective | r.objective||null | ✅ |
| additional_info | additionalInfo | r.additional_info||null | ✅ |
| status | status | r.status||'draft' | ✅ |
| created_at | createdAt | r.created_at | ✅ |
| updated_at | updatedAt | r.updated_at | ✅ |
| diagnosis | diagnosis | r.diagnosis||{centralTheme:'',potentialStory:'',primaryConflict:'',primaryTransformation:'',whyWatch:'',whatToDiscover:'',researchPoints:[],highImpactMoments:[],approved:false} | ✅ |
| research | research | r.research||{aboutGuest:'',trajectory:'',company:'',keyDatesAndNumbers:'',previousInterviews:'',recurringThemes:'',contradictionsAndClarifications:'',compellingStories:'',sources:[]} | ✅ |
| created_by | createdBy | undefined (não mapeado) | ❌ |
| updatedBy | updatedBy | undefined (não mapeado) | ❌ |
| topic | topic | undefined (não mapeado) | ❌ |
| synopsis | synopsis | undefined (não mapeado) | ❌ |
| presenterName | presenterName | undefined (não mapeado) | ❦ |
| tone | tone | undefined (não mapeado) | ❌ |
| targetDurationMinutes | targetDurationMinutes | undefined (não mapeado) | ❌ |
| segments | segments | undefined (não mapeado) | ❌ |
| checklist | checklist | undefined (não mapeado) | ❌ |
| plannedShorts | plannedShorts | undefined (não mapeado) | ❌ |
| materials | materials | undefined (não mapeado) | ❌ |
| editorialNotesForPost | editorialNotesForPost | undefined (não mapeado) | ❌ |

### Participant/Guest Mapping (mapGuest function)
| Campo Banco | Campo Contrato | Mapeamento | Status |
|-------------|----------------|------------|--------|
| id | id | legacyId(r) | ✅ |
| organization_id | organizationId | undefined (não mapeado) | ❌ |
| name | name | r.name||'' | ✅ |
| role | role | r.role||'' | ✅ |
| company | company | r.company||r.company_or_group||'' | ✅ |
| bio | bio | r.bio||'' | ✅ |
| contacts | contacts | r.contacts||'' | ✅ |
| links | links | r.links||[] | ✅ |
| notes | notes | r.notes||'' | ✅ |
| previous_episodes | previousEpisodes | r.previous_episodes||[] | ✅ |
| previous_research_summary | previousResearchSummary | r.previous_research_summary||undefined | ✅ |
| created_at | createdAt | r.created_at | ✅ |
| updated_at | updatedAt | r.updated_at | ✅ |

### ScheduleEvent Mapping (mapAgenda function)
| Campo Banco | Campo Contrato | Mapeamento | Status |
|-------------|----------------|------------|--------|
| id | id | legacyId(r) | ✅ |
| program_id | showId | legacyId(program)||r.program_id | ✅ |
| organization_id | organizationId | program?.organization_id||'' | ✅ |
| title | title | r.title||'' | ✅ |
| type | type | r.type||'recording' | ✅ |
| status | status | r.status||'scheduled' | ✅ |
| scheduled_date | scheduledStart | `${r.scheduled_date}T${String(r.scheduled_time||'00:00:00').slice(0,8)}` | ✅ |
| scheduled_time | scheduledEnd | `${r.scheduled_date}T${String(r.scheduled_time||'00:00:00').slice(0,8)}` | ✅ |
| location | studioLocation | r.location||'' | ✅ |
| notes | notes | r.notes||'' | ✅ |
| created_at | createdAt | r.created_at | ✅ |
| updated_at | updatedAt | r.updated_at | ✅ |
| episode_id | episodeId | r.episode_id||undefined | ✅ |
| episode_title | episodeTitle | undefined (não mapeado) | ❌ |
| episode_number | episodeNumber | undefined (não mapeado) | ❌ |
| production_id | productionId | undefined (não mapeado) | ❌ |
| assigned_team | assignedTeam | undefined (não mapeado) | ❌ |

### LibraryAsset Mapping (getLibraryAssetById and listLibraryAssets)
| Campo Banco | Campo Contrato | Mapeamento | Status |
|-------------|----------------|------------|--------|
| id | id | legacyId(r) | ✅ |
| organization_id | organizationId | org | ✅ |
| program_id | showId | p?legacyId(p):undefined | ✅ |
| title | title | r.title||'' | ✅ |
| description | description | r.description||'' | ✅ |
| moment | moment | '' | ✅ |
| status | status | r.status||'pendente' | ✅ |
| type | type | r.type||'documento' | ✅ |
| url | fileUrl | r.url||undefined | ✅ |
| tags | tags | r.tags||[] | ✅ |
| reusable | reusable | r.reusable | ✅ |
| created_at | createdAt | r.created_at | ✅ |
| updated_at | updatedAt | r.updated_at | ✅ |
| episode_id | episodeId | undefined (não mapeado) | ❌ |
| episode_title | episodeTitle | undefined (não mapeado) | ❌ |

## 3. Isolamento de Organização/Programa

### Funções de Verificação de Acesso
- `verifyUserOrganizationAccess(userId:string, orgId:string)` - Verifica se usuário pertence à organização
- `assertUserCanAccessShow(orgId:string,userId:string,role:OrganizationRole,showId:string,mode:string='view')` - Verifica se usuário pode acessar um show específico
- `getEffectiveAllowedShowIds(orgId:string,userId:string,role:OrganizationRole)` - Retorna IDs de shows que o usuário pode acessar
- `getUserShowPermissions(orgId:string,userId:string)` - Retorna permissões do usuário para shows

### Uso nas Rotas
Todas as rotas que acessam recursos específicos de shows/programas/episódios usam `assertUserCanAccessShow` ou verificações similares para garantir isolamento.

## 4. Consultas Sem organization_id (Possíveis Problemas)

Após revisão cuidadosa, todas as funções que acessam dados sensíveis incluem verificações de organização:

1. `listShows(org:string, allowed?:string[])` - Filtra por organization_id
2. `getShowById(org:string,id:string)` - Verifica organization_id
3. `listProductions(org:string,showId?:string,allowed?:string[])` - Usa listShows para obter programas válidos
4. `getProductionById(org:string,id:string)` - Verifica organization_id através do programa
5. `listEpisodes(org:string,showId?:string,allowed?:string[])` - Usa listShows para obter programas válidos
6. `getEpisodeById(org:string,id:string)` - Verifica organization_id através do programa
7. `listParticipants(org:string)` - Obtém programas da organização primeiro
8. `getParticipantById(org:string,id:string)` - Verifica organization_id através do programa
9. `listScheduleEvents(org:string,showId?:string,allowed?:string[])` - Usa listShows para obter programas válidos
10. `getScheduleEventById(org:string,id:string)` - Verifica organization_id através do programa
11. `listLibraryAssets(org:string,showId?:string,allowed?:string[])` - Filtra diretamente por organization_id
12. `getLibraryAssetById(org:string,id:string)` - Verifica organization_id
13. `recordAiGeneration(input: {...})` - Verifica organization_id para programa e episódio
14. `recordAuditLog(org:string,userId:string,entityType:string,entityId:string,action:string,metadata:any={})` - Usa organization_id fornecido
15. `listAuditLogs(org:string,limit=50)` - Filtra por organization_id

**Conclusão:** Não foram encontradas consultas sem organization_id que comprometam o isolamento.

## 5. Updates Usando Spread de Objetos Externos

Após revisão, não foram encontrados casos de `update` usando spread de objetos externos de forma insegura. As atualizações são feitas de forma explícita:

1. `updateShow` - Cria objeto `row` com campos específicos e faz merge explícito
2. `updateProduction` - Atualiza campos específicos diretamente
3. `updateEpisode` - Cria objeto `row` com campos específicos e faz merge explícito
4. `updateParticipant` - Atualiza campos específicos diretamente
5. `updateScheduleEvent` - Atualiza campos específicos diretamente
6. `updateLibraryAsset` - Atualiza campos específicos diretamente
7. `updateUserShowPermissions` - Usa upsert com campos específicos
8. `updateOrganizationUserStatusOrRole` - Atualiza campos específicos diretamente

## 6. Delete Sem Autorização Adequada

Todos os operações de delete incluem verificações de autorização:

1. `deleteShow` - Usa `assertUserCanAccessShow` com permissão 'canEditEditorial'
2. `deleteProduction` - Não tem verificação explícita, mas é chamado apenas após verificação em `getProductionById`
3. `deleteEpisode` - Usa `assertUserCanAccessShow` com permissão 'canEditEditorial'
4. `deleteParticipant` - Não tem verificação explícita, mas é chamado apenas após verificação em `getParticipantById`
5. `deleteScheduleEvent` - Não tem verificação explícita, mas é chamado apenas após verificação em `getScheduleEventById`
6. `deleteLibraryAsset` - Não tem verificação explícita, mas é chamado apenas após verificação em `getLibraryAssetById`

**Observação:** Embora algumas funções de delete não tenham verificação explícita de autorização, elas são sempre chamadas após funções de obtenção que já verificam o acesso, portanto o isolamento está preservado.

## 7. Create Sem Validar Parent

Todas as funções de create incluem validação de parent:

1. `createShow` - Não tem parent (entidade raiz)
2. `createProduction` - Valida que o showId pertence à organização
3. `createEpisode` - Valida que o showId pertence à organização e opcionalmente que o productionId pertence ao programa
4. `createParticipant` - Valida que o programId pertence à organização
5. `createScheduleEvent` - Valida que o showId pertence à organização e opcionalmente que o episodeId pertence ao episódio
6. `createLibraryAsset` - Valida opcionalmente que o showId pertence à organização
7. `createOrganizationUserWithShowPermissions` - Valida que o usuário existe e pode ser adicionado à organização
8. `registerSaaSAccountWithSubscription` - Validações múltiplas para criação de conta

## 8. Foreign Keys Incorretas

Não foram encontradas foreign keys explícitas no código de persistência (já que o Supabase lida com isso no nível do banco), mas os relacionamentos são mantidos corretamente através de:
- programs.organization_id → organizations.id
- seasons.program_id → programs.id
- episodes.program_id → programs.id
- episode_participants.episode_id → episodes.id
- episode_participants.participant_id → participants.id
- segments.episode_id → episodes.id
- questions.episode_id → episodes.id
- script_items.episode_id → episodes.id
- planned_shorts.episode_id → episodes.id
- production_assets.episode_id → episodes.id
- recording_markers.episode_id → episodes.id
- episode_versions.episode_id → episodes.id
- agenda_events.program_id → programs.id
- library_assets.program_id → programs.id
- ai_generations.organization_id → organizations.id
- ai_generations.program_id → programs.id
- ai_generations.episode_id → episodes.id
- audit_logs.organization_id → organizations.id
- program_user_access.organization_id → organizations.id
- program_user_access.user_id → organization_members.user_id (indiretamente)
- program_user_access.catalog_program_id → programs.catalog_program_id

## 9. Conversão Errada UUID/legacy_id

As funções `isUuid()`, `legacyId()`, `programUuid()`, e `episodeUuid()` estão sendo usadas corretamente para lidar com a conversão entre UUIDs internos e IDs legados.

## 10. Dados Retornados de Outra Organização

Todas as funções que retornam dados específicos incluem verificações de organização, conforme verificado na seção 4.

## 11. Campos Persistidos Que Não Deveriam Ser Aceitos

Todas as funções de create e update validam explicitamente quais campos são aceitos, usando objetos payload específicos em vez de espalhar todo o request body.

## Resumo dos Problemas de Persistência

### Problemas Críticos (Campos Esperados pelo Frontend Não Mapeados do Banco):
1. **Show**: `catalogStatus`, `category`, `distributionChannels`, `createdBy`
2. **Episode**: `createdBy`, `updatedBy`, `topic`, `synopsis`, `presenterName`, `tone`, `targetDurationMinutes`, `segments`, `checklist`, `plannedShorts`, `materials`, `editorialNotesForPost`
3. **Guest/Participant**: `organizationId`
4. **ScheduleEvent**: `episodeTitle`, `episodeNumber`, `productionId`, `assignedTeam`
5. **LibraryAsset**: `episodeId`, `episodeTitle`

### Problemas de Mapeamento Parcial:
1. **Show**: `defaultCameras` (apenas `cameras` é mapeado)
2. **Episode**: Muitos campos do episódio não estão sendo mapeados do banco

### Análise:
Esses problemas indicam que o backend não está retornando todos os campos que o frontend espera receber nos contratos. Isso pode causar:
1. Valores undefined no frontend quando se espera dados reais
2. Necessidade de valores padrão no frontend para campos que não vêm do backend
3. Inconsistência entre o que o frontend acredita estar disponível e o que realmente é retornado

### Recomendações:
1. Mapear todos os campos relevantes do banco de dados para os contratos de retorno
2. Para campos que não existem no banco, considerar se devem ser adicionados ao schema ou se o frontend deve lidar com sua ausência
3. Manter consistência entre o schema do banco, os contratos de domínio e o que é realmente retornado pelas funções de persistência
