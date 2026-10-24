-- OPERAÇÃO MANUAL - NÃO APLICAR AUTOMATICAMENTE
-- Remover associação organizacional indevida do administrador de plataforma (platform_admin)
--
-- Contexto (auditado em fix/platform-admin-separation):
--   - Usuário platform_admin: olfnetto@gmail.com (id: b18e03ea-eef2-45fb-99dd-5b5ed3945812)
--     (platformRole = 'platform_admin' em auth.users.user_metadata)
--   - Associação atual (indevida para o perfil global):
--     organization_id = 1007f204-6eef-49bc-a31f-2040a4fcebcb ('RS Play TV'), role = 'owner'
--   - A plataforma agora permite login global de platform_admin SEM organização
--     (buildAuthSession com organizationId undefined gera sessão global).
--
-- Critério de conclusão para aplicar (NÃO atingido automaticamente nesta etapa):
--   Comprovar que o login global do platform_admin funciona SEM a associação organizacional.
--   Até que isso seja validado em ambiente isolado, NÃO remover a associação.
--
-- Esta operação é REVERSÍVEL: o bloco de rollback re-insere a associação original.
-- Executar apenas após revisão humana e confirmação de que o login global funciona.

-- ---------------------------------------------------------------------------
-- 1. EXECUTAR (somente após validação do login global sem organização)
-- ---------------------------------------------------------------------------
DELETE FROM "public"."organization_members"
WHERE "user_id" = 'b18e03ea-eef2-45fb-99dd-5b5ed3945812'
  AND "organization_id" = '1007f204-6eef-49bc-a31f-2040a4fcebcb'
  AND "active" = true;

-- ---------------------------------------------------------------------------
-- 2. ROLLBACK (restaura a associação original, se algo der errado)
-- ---------------------------------------------------------------------------
-- INSERT INTO "public"."organization_members" (
--   "id", "organization_id", "user_id", "role", "active", "created_at", "updated_at"
-- ) VALUES (
--   gen_random_uuid(),
--   '1007f204-6eef-49bc-a31f-2040a4fcebcb',
--   'b18e03ea-eef2-45fb-99dd-5b5ed3945812',
--   'owner',
--   true,
--   now(),
--   now()
-- ) ON CONFLICT ("organization_id", "user_id") DO UPDATE
--   SET "role" = EXCLUDED."role", "active" = EXCLUDED."active", "updated_at" = now();

-- ---------------------------------------------------------------------------
-- 3. VERIFICAÇÃO PÓS-EXECUÇÃO (esperado: 0 linhas ativas para este usuário)
-- ---------------------------------------------------------------------------
-- SELECT "user_id", "organization_id", "role", "active"
-- FROM "public"."organization_members"
-- WHERE "user_id" = 'b18e03ea-eef2-45fb-99dd-5b5ed3945812';
