# Auditoria de Contratos Frontend/Backend - TakeMaster V2

## 1. Show Entity

| Campo | Tipo no Frontend (types) | Tipo no Backend (persistence) | Consistente? | Problema |
|-------|--------------------------|-------------------------------|--------------|----------|
| id | string | string (legacyId ou uuid) | ✅ |  |
| organizationId | string \| undefined | string \| undefined (organization_id) | ✅ |  |
| title | string | string (title ou name) | ✅ |  |
| description | string | string (description) | ✅ |  |
| host | string | string (host) | ✅ |  |
| format | ShowFormat | string (format) | ✅ |  |
| defaultDurationMin | number | number (default_duration_min ou default_episode_duration_minutes) | ✅ |  |
| editorialStyle | string | string (editorial_style) | ✅ |  |
| scenario | string | string (scenario) | ✅ |  |
| cameras | CameraConfig[] | CameraConfig[] (via camerasFor + mapCamera) | ✅ |  |
| defaultCameras | CameraConfig[] \| undefined | Não persistido diretamente | ⚠️ | Campo não persistido no backend |
| name | string \| undefined | string (name) | ✅ |  |
| standardStructure | string[] | string[] (standard_structure) | ✅ |  |
| defaultOpening | string | string (default_opening) | ✅ |  |
| defaultClosing | string | string (default_closing) | ✅ |  |
| catalogStatus | CatalogStatus \| undefined | undefined (não mapeado) | ❌ | Campo não mapeado do banco para o contrato |
| category | string \| undefined | undefined (não mapeado) | ❌ | Campo não mapeado do banco para o contrato |
| targetAudience | string \| undefined | string \| undefined (target_audience) | ✅ |  |
| distributionChannels | string[] \| undefined | undefined (não mapeado) | ❌ | Campo não mapeado do banco para o contrato |
| createdBy | string \| undefined | undefined (não mapeado) | ❌ | Campo não mapeado do banco para o contrato |
| createdAt | string | string (created_at) | ✅ |  |
| updatedAt | string | string (updated_at) | ✅ |  |

**Problemas Identificados:**
1. Campos `catalogStatus`, `category`, `distributionChannels`, `createdBy` não estão sendo mapeados do banco de dados para o contrato Show no backend (função `mapShow`).
2. Campo `defaultCameras` não é persistido no backend, apenas `cameras`.

## 2. Production Entity

| Campo | Tipo no Frontend (types) | Tipo no Backend (persistence) | Consistente? | Problema |
|-------|--------------------------|-------------------------------|--------------|----------|
| id | string | string (id) | ✅ |  |
| organizationId | string | string (organization_id) | ✅ |  |
| showId | string | string (show_id ou program_id via legacyId) | ✅ |  |
| title | string | string (title) | ✅ |  |
| seasonNumber | number | number (number) | ✅ |  |
| status | ProductionStatus | string (status) | ✅ |  |
| targetEpisodesCount | number | number (target_episodes_count) | ✅ |  |
| executiveProducer | string | string (executive_producer) | ✅ |  |
| startDate | string \| undefined | string \| undefined (start_date) | ✅ |  |
| endDate | string \| undefined | string \| undefined (end_date) | ✅ |  |
| notes | string | string (notes) | ✅ |  |
| createdAt | string | string (created_at) | ✅ |  |
| updatedAt | string | string (updated_at) | ✅ |  |

**Status:** Todos os campos consistentes.

## 3. Episode Entity

| Campo | Tipo no Frontend (types) | Tipo no Backend (persistence) | Consistente? | Problema |
|-------|--------------------------|-------------------------------|--------------|----------|
| id | string | string (legacyId ou id) | ✅ |  |
| organizationId | string \| undefined | string \| undefined (via program.organization_id) | ✅ |  |
| showId | string | string (program_id via legacyId) | ✅ |  |
| productionId | string \| undefined | string \| undefined (season_id) | ✅ |  |
| episodeNumber | number | number (episode_number) | ✅ |  |
| title | string | string (title) | ✅ |  |
| idea | string | string (idea) | ✅ |  |
| guestName | string \| undefined | string \| undefined (guest_name) | ✅ |  |
| guestId | string \| undefined | string \| undefined (guest_id) | ✅ |  |
| participants | EpisodeParticipant[] \| undefined | EpisodiosParticipant[] (via episodio_participants) | ✎ |  |
| host | string | string (host ou presenter_name) | ✅ |  |
| format | ShowFormat | string (format) | ✅ |  |
| targetDurationMin | number | number (target_duration_min ou target_duration_minutes) | ✅ |  |
| objective | string \| undefined | string \| undefined (objective) | ✅ |  |
| additionalInfo | string \| undefined | string \| undefined (additional_info) | ✅ |  |
| status | EpisodeStatus | string (status) | ✅ |  |
| diagnosis | EditorialDiagnosis | EditorialDiagnosis (objeto fixo ou fornecido) | ✅ |  |
| research | ResearchData | ResearchData (objeto fixo ou fornecido) | ✅ |  |
| outline | OutlineBlock[] | OutlineBlock[] (via segments) | ✅ |  |
| questions | QuestionItem[] | QuestionItem[] (via questions) | ✅ |  |
| script | ScriptItem[] | ScriptItem[] (via script_items) | ✅ |  |
| cameras | CameraConfig[] | CameraConfig[] (via camerasFor) | ✅ |  |
| assets | ProductionAsset[] | ProductionAsset[] (via production_assets) | ✅ |  |
| shorts | PlannedShort[] | PlannedShort[] (via planned_shorts) | ✅ |  |
| recordingMarkers | RecordingMarker[] | RecordingMarker[] (via recording_markers) | ✅ |  |
| technicalChecklist | TechnicalChecklist | TechnicalChecklist (objeto fixo ou fornecido) | ✅ |  |
| versions | ScriptVersion[] | ScriptVersion[] (via episode_versions) | ✅ |  |
| editorScriptSynthesis | string \| undefined | string \| undefined (editor_script_synthesis) | ✅ |  |
| recordingTimeElapsed | number \| undefined | number \| undefined (recording_time_elapsed) | ✅ |  |
| topic | string \| undefined | undefined (não mapeado) | ❌ | Campo não mapeado do banco para o contrato |
| synopsis | string \| undefined | undefined (não mapeado) | ❌ | Campo não mapeado do banco para o contrato |
| presenterName | string \| undefined | undefined (não mapeado) | ❌ | Campo não mapeado do banco para o contrato |
| tone | string \| undefined | undefined (não mapeado) | ❌ | Campo não mapeado do banco para o contrato |
| targetDurationMinutes | number \| undefined | undefined (não mapeado) | ❌ | Campo não mapeado do banco para o contrato |
| segments | any[] \| undefined | undefined (não mapeado) | ❌ | Campo não mapeado do banco para o contrato |
| checklist | ChecklistItem[] \| undefined | undefined (não mapeado) | ❌ | Campo não mapeado do banco para o contrato |
| plannedShorts | PlannedShort[] \| undefined | undefined (não mapeado) | ❌ | Campo não mapeado do banco para o contrato |
| materials | ProductionMaterial[] \| undefined | undefined (não mapeado) | ❌ | Campo não mapeado do banco para o contrato |
| editorialNotesForPost | string \| undefined | undefined (não mapeado) | ❌ | Campo não mapeado do banco para o contrato |
| createdBy | string \| undefined | undefined (não mapeado) | ❌ | Campo não mapeado do banco para o contrato |
| updatedBy | string \| undefined | undefined (não mapeado) | ❌ | Campo não mapeado do banco para o contrato |
| createdAt | string | string (created_at) | ✅ |  |
| updatedAt | string | string (updated_at) | ✅ |  |

**Problemas Identificados:**
Muitos campos do contrato Episode não estão sendo mapeados do banco de dados para o contrato no backend. Isso sugere que o frontend pode estar usando valores padrão ou o backend não está retornando todos os campos esperados.

## 4. Guest/Participant Entity

| Campo | Tipo no Frontend (types) | Tipo no Backend (persistence) | Consistente? | Problema |
|-------|--------------------------|-------------------------------|--------------|----------|
| id | string | string (legacyId ou id) | ✅ |  |
| organizationId | string \| undefined | undefined (não mapeado) | ❌ | Campo não mapeado do banco para o contrato |
| name | string | string (name) | ✅ |  |
| role | string | string (role) | ✅ |  |
| company | string | string (company ou company_or_group) | ✅ |  |
| bio | string | string (bio) | ✅ |  |
| contacts | string | string (contacts) | ✅ |  |
| links | string[] | string[] (links) | ✅ |  |
| notes | string | string (notes) | ✅ |  |
| previousEpisodes | string[] \| number | string[] \| number (previous_episodes) | ✅ |  |
| previousResearchSummary | string \| undefined | string \| undefined (previous_research_summary) | ✅ |  |
| createdAt | string | string (created_at) | ✅ |  |
| updatedAt | string \| undefined | string \| undefined (updated_at) | ✅ |  |

**Problemas Identificados:**
1. Campo `organizationId` não está sendo mapeado do banco de dados para o contrato Guest no backend (função `mapGuest`).

## 5. ScheduleEvent Entity

| Campo | Tipo no Frontend (types) | Tipo no Backend (persistence) | Consistente? | Problema |
|-------|--------------------------|-------------------------------|--------------|----------|
| id | string | string (legacyId ou id) | ✅ |  |
| organizationId | string | string (via program.organization_id) | ✅ |  |
| showId | string | string (via program_id) | ✅ |  |
| productionId | string \| undefined | undefined (não mapeado) | ❌ | Campo não mapeado do banco para o contrato |
| episodeId | string \| undefined | string \| undefined (episode_id) | ✅ |  |
| episodeTitle | string \| undefined | undefined (não mapeado) | ❌ | Campo não mapeado do banco para o contrato |
| episodeNumber | number \| undefined | undefined (não mapeado) | ❌ | Campo não mapeado do banco para o contrato |
| title | string | string (title) | ✅ |  |
| type | ScheduleEventType | string (type) | ✅ |  |
| status | ScheduleEventStatus | string (status) | ✅ |  |
| scheduledStart | string | string (scheduled_date + scheduled_time) | ✅ |  |
| scheduledEnd | string | string (scheduled_date + scheduled_time) | ✅ |  |
| studioLocation | string | string (location) | ✅ |  |
| assignedTeam | string[] | undefined (não mapeado) | ❌ | Campo não mapeado do banco para o contrato |
| notes | string | string (notes) | ✅ |  |
| createdAt | string | string (created_at) | ✅ |  |
| updatedAt | string | string (updated_at) | ✅ |  |

**Problemas Identificados:**
1. Campos `productionId`, `episodeTitle`, `episodeNumber`, `assignedTeam` não estão sendo mapeados do banco de dados para o contrato ScheduleEvent no backend.

## 6. LibraryAsset Entity

| Campo | Tipo no Frontend (types) | Tipo no Backend (persistence) | Consistente? | Problema |
|-------|--------------------------|-------------------------------|--------------|----------|
| id | string | string (legacyId ou id) | ✅ |  |
| organizationId | string | string (organization_id) | ✅ |  |
| showId | string \| undefined | string \| undefined (via program_id) | ✅ |  |
| episodeId | string \| undefined | undefined (não mapeado) | ❌ | Campo não mapeado do banco para o contrato |
| episodeTitle | string \| undefined | undefined (não mapeado) | ❌ | Campo não mapeado do banco para o contrato |
| title | string | string (title) | ✅ |  |
| description | string | string (description) | ✅ |  |
| moment | string | string (moment) | ✅ |  |
| status | string \| undefined | string \| undefined (status) | ✅ |  |
| type | AssetType | string (type) | ✅ |  |
| fileUrl | string \| undefined | string \| undefined (url ou fileUrl) | ✅ |  |
| tags | string[] | string[] (tags) | ✅ |  |
| reusable | boolean \| undefined | boolean \| undefined (reusable) | ✅ |  |
| createdAt | string | string (created_at) | ✅ |  |
| updatedAt | string | string (updated_at) | ✅ |  |

**Problemas Identificados:**
1. Campos `episodeId`, `episodeTitle` não estão sendo mapeados do banco de dados para o contrato LibraryAsset no backend.

## Resumo dos Problemas de Contrato

### Problemas Críticos (Campos Esperados pelo Frontend Não Retornados pelo Backend):
1. **Show**: `catalogStatus`, `category`, `distributionChannels`, `createdBy`, `defaultCameras`
2. **Episode**: Muitos campos incluindo `topic`, `synopsis`, `presenterName`, `tone`, `targetDurationMinutes`, `segments`, `checklist`, `plannedShorts`, `materials`, `editorialNotesForPost`, `createdBy`, `updatedBy`
3. **Guest/Participant**: `organizationId`
4. **ScheduleEvent**: `productionId`, `episodeTitle`, `episodeNumber`, `assignedTeam`
5. **LibraryAsset**: `episodeId`, `episodeTitle`

### Análise:
Esses problemas indicam que:
1. O frontend está esperando mais dados do que o backend está atualmente fornecendo
2. Ou o frontend está usando valores padrão para campos que não estão sendo retornados
3. Há uma desacoplamento entre o que o frontend acredita estar disponível e o que o backend realmente retorna

### Recomendações:
1. Verificar se o frontend está realmente usando todos esses campos ou se alguns são apenas teóricos
2. Se o frontend está usando estes campos, então o backend precisa ser atualizado para mapeá-los corretamente
3. Se o frontend não está usando estes campos, então os tipos no frontend podem ser overly generous e precisam ser ajustados

No entanto, baseado na arquitetura canônica que preserva contratos existentes, é mais provável que o frontend esteja usando estes campos e o backend precise ser corrigido para retorná-los.
