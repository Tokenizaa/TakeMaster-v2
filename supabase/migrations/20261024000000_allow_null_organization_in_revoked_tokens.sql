-- Permitir organization_id NULL em revoked_tokens para suporte a sessões globais
-- do administrador de plataforma (platform_admin sem organização).
--
-- Contexto: sessões globais de platform_admin não possuem organizationId. Ao revogar
-- tais tokens (logout), não há organização para gravar. Antes desta migration a coluna
-- organization_id era NOT NULL (com FK para organizations), o que impedia a revogação
-- de sessões globais.
--
-- Esta migration apenas relaxa a restrição NOT NULL (não apaga nem altera dados).
-- É reversível: a migration de rollback restabelece NOT NULL (desde que não existam
-- linhas com organization_id NULL).
--
-- NÃO APLICAR automaticamente em produção sem revisão. Aplicar apenas após validação
-- do fluxo de login global do platform_admin.

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- Torna organization_id anulável (sessões globais não têm organização).
ALTER TABLE "public"."revoked_tokens"
  ALTER COLUMN "organization_id" DROP NOT NULL;

-- O índice e as políticas existentes continuam válidos (NULL não é indexado de forma
-- problemática aqui; a consulta por token_hash continua funcionando).

-- ============================================================================
-- ROLLBACK (reverter somente se não houver linhas com organization_id NULL):
-- ALTER TABLE "public"."revoked_tokens" ALTER COLUMN "organization_id" SET NOT NULL;
-- ============================================================================
