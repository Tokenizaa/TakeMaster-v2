# Próximos Passos para Concluir o Trabalho P0 - TakeMaster V2

Baseado na auditoria técnica P0 concluída, as seguintes inconsistências de contrato precisam ser corrigidas para completar o trabalho P0:

## 1. Show Entity - Campos Faltantes no Backend
Arquivo: `src/server/persistence.ts` - função `mapShow()`

Campos que precisam ser mapeados do banco para o contrato:
- `catalogStatus` → `r.catalog_status`
- `category` → `r.category`
- `distributionChannels` → `r.distribution_channels`
- `createdBy` → `r.created_by`
- `defaultCameras` → Este campo não existe no banco; verificar se deve ser adicionado ao schema ou se o frontend deve lidar com sua ausência

## 2. Episode Entity - Campos Faltantes no Backend
Arquivo: `src/server/persistence.ts` - função `mapEpisode()`

Campos que precisam ser mapeados do banco para o contrato:
- `createdBy` → `r.created_by`
- `updatedBy` → `r.updated_by`
- `topic` → Este campo não existe no banco; verificar se deve ser adicionado ao schema
- `synopsis` → Este campo não existe no banco; verificar se deve ser adicionado ao schema
- `presenterName` → Este campo não existe no banco; verificar se deve ser adicionado ao schema
- `tone` → Este campo não existe no banco; verificar se deve ser adicionado ao schema
- `targetDurationMinutes` → Este campo não existe no banco; verificar se deve ser adicionado ao schema
- `segments` → Este campo não existe como tal no banco; os segmentos estão na tabela `segments` e já são mapeados para `outline`
- `checklist` → Este campo não existe no banco; verificar se deve ser adicionado ao schema
- `plannedShorts` → Este campo não existe como tal no banco; os planned shorts estão na tabela `planned_shorts` e já são mapeados para `shorts`
- `materials` → Este campo não existe no banco; verificar se deve ser adicionado ao schema
- `editorialNotesForPost` → Este campo não existe no banco; verificar se deve ser adicionado ao schema

**Observação:** Alguns campos como `segments`, `plannedShorts` já estão sendo mapeados para outros campos no contrato (`outline` e `shorts` respectivamente). Verificar se o frontend realmente precisa desses campos separados ou se pode usar os já mapeados.

## 3. Guest/Participant Entity - Campo Faltante no Backend
Arquivo: `src/server/persistence.ts` - função `mapGuest()`

Campo que precisa ser mapeado do banco para o contrato:
- `organizationId` → `r.organization_id`

## 4. ScheduleEvent Entity - Campos Faltantes no Backend
Arquivo: `src/server/persistence.ts` - função `mapAgenda()`

Campos que precisam ser mapeados do banco para o contrato:
- `episodeTitle` → Este campo não existe no banco; verificar se deve ser adicionado ao schema ou derivado da tabela episodes
- `episodeNumber` → Este campo não existe no banco; verificar se deve ser adicionado ao schema ou derivado da tabela episodes
- `productionId` → Já existe como `r.production_id` no banco, mas não está sendo mapeado
- `assignedTeam` → Já existe como `r.assigned_team` no banco, mas não está sendo mapeado

## 5. LibraryAsset Entity - Campos Faltantes no Backend
Arquivo: `src/server/persistence.ts` - funções `getLibraryAssetById()` e `listLibraryAssets()`

Campos que precisam ser mapeados do banco para o contrato:
- `episodeId` → Já existe como `r.episode_id` no banco, mas não está sendo mapeado
- `episodeTitle` → Este campo não existe no banco; verificar se deve ser adicionado ao schema ou derivado da tabela episodes

## Processo de Correção Recomendado

Para cada arquivo a ser modificado (`src/server/persistence.ts`):

1. **Identificar onde o mapeamento ocorre** - Funções como `mapShow`, `mapEpisode`, `mapGuest`, `mapAgenda`, etc.
2. **Adicionar os campos faltantes** aos objetos de retorno
3. **Verificar se os campos existem no schema do banco** - Se não existem, decidir se:
   - Adicionar ao schema via migration (se forem realmente necessários)
   - Modificar o contrato frontend para não esperar esses campos
   - Fornecer valores padrão ou derivados quando apropriado
4. **Executar testes** após cada conjunto de correções:
   - `npm run lint`
   - `npm test` (observando que falhará por configuração do Supabase, mas não deve falhar por erros de código)
   - `npm run build`
5. **Documentar as mudanças** em um commit claro e descritivo

## Prioridade de Correção

Com base no impacto identificado na matriz:

### Alta Prioridade (Episode)
- `createdBy`, `updatedBy` - campos básicos de auditoria
- Campos relacionados ao conteúdo editorial se forem realmente usados pelo frontend

### Média Prioridade (Show, Guest/Participant, ScheduleEvent)
- Metadados do show que afetam a apresentação
- Campos de isolamento organizacional
- Campos de rastreabilidade de produção

### Baixa Prioridade (LibraryAsset)
- Associação de assets a episódios específicos

## Validação Após Correção

Após implementar as correções:
1. Verificar que nenhum erro de TypeScript é introduzido
2. Confirmar que o build ainda passa
3. Validar que as rotas API ainda retornam os campos esperados (quando o Supabase estiver configurado)
4. Assegurar que nenhuma funcionalidade existente seja quebrada

## Próximo Imediato

Começar pelas correções de maior impacto: Episode e Show entities, focando primeiro nos campos que existem no banco mas não estão sendo mapeados (como `createdBy`, `updatedBy`, `organizationId` em várias entidades).
