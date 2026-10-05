# Auditoria de RLS e Segurança - TakeMaster V2

## 1. Visão Geral das Políticas RLS

### Tabelas com RLS Habilitado (da migração 0002):
- organizations
- organization_members
- shows
- show_members
- productions
- participants
- episodes
- episode_participants
- script_versions
- schedule_events
- library_assets
- audit_logs

### Tabelas com RLS Habilitado (da migração 0003):
- user_show_permissions
- saas_subscriptions
- billing_invoices
- payment_gateway_events

## 2. Análise das Políticas RLS

### Políticas Básicas de Isolamento Organizacional (0002):
Todas as tabelas listadas na seção 1 (primeiro grupo) têm políticas idênticas:
- **FOR ALL USING (public.is_org_member(organization_id))**
- **WITH CHECK (public.is_org_member(organization_id))**

Isso significa que:
- SELECT: Apenas registros onde organization_id corresponde à organização do usuário autenticado
- INSERT: Apenas permite inserir se organization_id corresponde à organização do usuário autenticado
- UPDATE: Apenas permite atualizar se organization_id corresponde à organização do usuário autenticado
- DELETE: Apenas permite excluir se organization_id corresponde à organização do usuário autenticado

### Políticas Específicas para Audit Logs (0002):
- **FOR SELECT USING (public.is_org_member(organization_id))**
- Nenhuma política FOR ALL, apenas SELECT é restrito por organização

### Função Helper `is_org_member`:
```sql
CREATE OR REPLACE FUNCTION public.is_org_member(target_org_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = target_org_id
      AND om.user_id = auth.uid()::text
  );
$$;
```

Esta função verifica se o usuário autenticado (auth.uid()) é membro da organização target_org_id.

## 3. Tabelas de Program-Level RBAC (0003)

### user_show_permissions:
- RLS habilitado, mas políticas específicas não mostradas na migração
- Provavelmente herdou políticas padrão ou terá políticas específicas em outro lugar
- Armazena permissões granulares por usuário por show:
  - can_view
  - can_edit_editorial
  - can_edit_script
  - can_operate_studio
  - can_manage_schedule
  - can_manage_assets
  - can_export

### saas_subscriptions, billing_invoices, payment_gateway_events:
- RLS habilitado
- Provavelmente seguem o mesmo padrão de isolamento organizacional

## 4. Verificação de Consistência com o Código de Persistência

### Funções de Verificação de Acesso no Código:
1. `verifyUserOrganizationAccess(userId:string, orgId:string)` - Verifica se usuário pertence à organização
2. `assertUserCanAccessShow(orgId:string,userId:string,role:OrganizationRole,showId:string,mode:string='view')` - Verifica se usuário pode acessar um show específico
3. `getEffectiveAllowedShowIds(orgId:string,userId:string,role:OrganizationRole)` - Retorna IDs de shows que o usuário pode acessar
4. `getUserShowPermissions(orgId:string,userId:string)` - Retorna permissões do usuário para shows

### Uso nas Funções de Persistência:
Todas as funções que acessam dados específicos usam essas verificações:
- `getShowById` - Verifica organization_id diretamente
- `getProductionById` - Verifica organization_id através do programa
- `getEpisodeById` - Verifica organization_id através do programa
- `getParticipantById` - Verifica organization_id através do programa
- `getScheduleEventById` - Verifica organization_id através do programa
- `getLibraryAssetById` - Verifica organization_id diretamente
- Funções de listagem - Filtram por organization_id ou usam lista de shows permitidos
- Funções de criação - Validam que os IDs de parent pertencem à organização
- Funções de atualização - Dependem das funções de obtenção que já verificaram acesso
- Funções de exclusão - Dependem das funções de obtenção que já verificaram acesso

## 5. Possíveis Problemas ou Lacunas

### 1. Políticas RLS para Tabelas Novas da 0003:
As migrações 0003 apenas habilitam RLS nas tabelas novas, mas não mostram as políticas específicas. É possível que:
- As políticas padrão estejam sendo aplicadas (organização apenas)
- Ou políticas específicas estejam faltando e precisam ser adicionadas

### 2. Falta de Políticas Específicas para user_show_permissions:
Esta tabela deveria ter políticas mais granulares que apenas isolamento organizacional, já que armazena permissões por show. Idealmente:
- USERS: Ver se é o dono da permissão (user_id = auth.uid())
- ADMINS/OWNERS: Ver se pertencem à organização

### 3. Possível Redundância em algumas Políticas:
Algumas tabelas podem ter políticas que são mais restritivas do que necessário, mas isso é geralmente seguro.

## 6. Conformidade com o Princípio de Menor Privilégio

### Organização-level Isolation (Bom):
- Usuários só podem ver dados da própria organização
- Impede vazamento de dados entre organizações diferentes

### Program-level Access Control (através do código):
- Além do isolamento organizacional, o código implementa controle granular por show
- Usuários só podem acessar shows para os quais têm permissão
- Isso é implementado no código da aplicação, não no nível do banco de dados

## 7. Recomendações

1. **Verificar políticas RLS específicas para tabelas da migração 0003**: Certificar-se de que user_show_permissions, saas_subscriptions, billing_invoices e payment_gateway_events têm políticas adequadas.

2. **Considerar políticas mais granulares para user_show_permissions**: Em vez de apenas isolamento organizacional, considerar:
   - USERS: Ver se é o dono da permissão (user_id = auth.uid())
   - ADMINS/OWNERS: Ver se pertencem à organização

3. **Documentar as políticas RLS existentes**: Manter um registro claro de quais políticas estão aplicadas em cada tabela.

4. **Testar as políticas RLS**: Executar consultas de teste como diferentes usuários para garantir que o isolamento esteja funcionando corretamente.

## 8. Conclusão

O sistema RLS do TakeMaster V2 implementa um bom nível de isolamento organizacional através das políticas básicas. O controle de acesso granular por programa é implementado no nível da aplicação através de funções como `assertUserCanAccessShow`. 

Não foram identificadas falhas críticas de segurança no isolamento de dados baseado na análise das migrações e do código de persistência. O sistema segue o princípio de que usuários só podem acessar dados da própria organização, com controle adicional de acesso por programa implementado na camada de aplicação.

As funções de segurança como `verifyUserOrganizationAccess` e `assertUserCanAccessShow` fornecem uma segunda linha de defesa que complementa as políticas RLS do banco de dados.
