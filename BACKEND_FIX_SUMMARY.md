# Correção de Inconsistências de Contrato - Backend

## Resumo
Foram realizadas correções em `src/server/persistence.ts` para mapear campos do banco de dados que estavam ausentes nos contratos de retorno, conforme especificado em `loop/NEXT_STEPS_P0.md`.

## Alterações Realizadas

### 1. Show Entity - `mapShow()` function
- `catalogStatus`: Mapeado de `r.catalog_status` (era `undefined`)
- `category`: Mapeado de `r.category` (era `undefined`)
- `distributionChannels`: Mapeado de `r.distribution_channels` (era `[]`)
- `createdBy`: Mapeado de `r.created_by` (era `undefined`)

### 2. Episode Entity - `mapEpisode()` function
- `createdBy`: Mapeado de `r.created_by` (era `undefined`)
- `updatedBy`: Mapeado de `r.updated_by` (era `undefined`)

### 3. Guest/Participant Entity - `mapGuest()` function
- `organizationId`: Mapeado de `r.organization_id` (era `undefined`)

### 4. ScheduleEvent Entity - `mapAgenda()` function
- `productionId`: Mapeado de `r.production_id` (era `undefined`)
- `assignedTeam`: Mapeado de `r.assigned_team` (era `[]`)

### 5. LibraryAsset Entity
- `listLibraryAssets()`: `episodeId` mapeado de `x.episode_id` (era `undefined`)
- `getLibraryAssetById()`: `episodeId` mapeado de `r.episode_id` (era `undefined`)

## Validação
- ✅ Build bem-sucedido: `npm run build` passa sem erros
- ✅ Lint limpo: `npm run lint` passa sem erros de TypeScript
- ✅ Nenhuma regressão detectada
- ✅ Mudanças são aditivas e retrocompatíveis

## Próximos Passos
Para campos que não existem no banco (como indicado no documento), a equipe deve:
1. Verificar se o frontend realmente precisa desses campos
2. Decidir entre adicionar ao schema via migration ou ajustar os contratos
3. Validar se mapeamentos existentes (como `segments` → `outline` e `plannedShorts` → `shorts`) são suficientes

As correções de alta prioridade mencionadas no documento (focando nos campos que existem no banco) foram concluídas com sucesso.