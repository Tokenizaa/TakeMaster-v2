# ADR-010 — Workaround para falha de `auth.admin.listUsers()` no GoTrue

**Status:** Aceito — workaround ativo

## Contexto

A função `authUsers()` em `src/server/persistence.ts` (linha ~229) utiliza `db.auth.admin.listUsers({page:1, perPage:1000})` para buscar todos os usuários do Supabase Auth.

**Comportamento observado no projeto:** `auth.admin.listUsers()` retornou HTTP 500 com "Database error finding users" para páginas grandes. A causa é atribuída ao GoTrue com base nesse erro; ainda não há confirmação de correção upstream.

Este é um bug no lado do Supabase/GoTrue, não no código da aplicação. A função `authUsers()` é chamada por:
- `listUsersAndOrganizations()`
- `listOrganizationUsersWithPermissions(orgId)`
- `updateUserShowPermissions(orgId, userId, ...)`

Todas retornam `User[]` e dependem da lista completa de usuários do Auth.

## Decisão

Usar os membros ativos como índice dos usuários elegíveis e hidratar cada id via `auth.admin.getUserById`:

- `authUsers()` consulta `organization_members` com `active = true`, remove ids duplicados e hidrata os usuários via `getUserById`.
- `listOrganizationUsersWithPermissions()` exclui e registra usuários de associação que não puderam ser hidratados.
- `buildAuthSession()` usa `getAuthUserById()` para consultar diretamente o usuário autenticado.

Não é usada feature flag. Usuários sem associação ativa não aparecem no diretório e não podem concluir a criação de sessão.

## Consequências

**Positivas:**
- Evita a chamada problemática de `listUsers()`.
- Mantém o formato `User[]` consumido pelo backend.
- `getUserById()` também permite buscar o usuário da sessão sem enumerar todo o Auth.

**Negativas:**
- Hidrata usuários com chamadas individuais; o custo cresce com o número de associações ativas.
- Usuários sem associação ativa não são enumerados no diretório.

**Riscos:**
- Muitas associações podem causar aumento de latência e carga por causa das consultas paralelas individuais.
- A lista de associações retornada pelo PostgREST pode ser limitada pela configuração de max rows.

## Plano de remoção

1. Monitorar releases do Supabase GoTrue e investigar a causa do erro 500 observado.
2. Quando a chamada funcionar de forma estável em staging, comparar paginação, desempenho e cobertura de usuários sem associação.
3. Só então considerar voltar a enumerar usuários pelo Auth; manter o índice de membros se atender melhor aos requisitos do produto.

**Critério de revisão:** `listUsers` com paginação maior funcionar consistentemente em staging e a abordagem oferecer cobertura/performance melhores, sem alterar silenciosamente os usuários visíveis no diretório.
