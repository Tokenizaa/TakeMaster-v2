-- Password reset tokens and token revocation for secure logout
-- Migration: 20261023000005

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

-- Password reset tokens table
CREATE TABLE IF NOT EXISTS "public"."password_reset_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "token_hash" "text" NOT NULL,
    "email" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "used_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "public"."password_reset_tokens" OWNER TO "postgres";

COMMENT ON TABLE "public"."password_reset_tokens" IS 'Tokens seguros para redefinição de senha. Token armazenado apenas como hash (SHA-256). Expiração curta (1h), uso único.';

CREATE INDEX IF NOT EXISTS "password_reset_tokens_user_id_idx" ON "public"."password_reset_tokens" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "password_reset_tokens_expires_at_idx" ON "public"."password_reset_tokens" USING btree ("expires_at");
CREATE INDEX IF NOT EXISTS "password_reset_tokens_token_hash_idx" ON "public"."password_reset_tokens" USING btree ("token_hash");

-- Revoked tokens table for server-side logout
CREATE TABLE IF NOT EXISTS "public"."revoked_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "token_hash" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "revoked_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "reason" "text" DEFAULT 'logout'::"text" NOT NULL,
    CONSTRAINT "revoked_tokens_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "public"."revoked_tokens" OWNER TO "postgres";

COMMENT ON TABLE "public"."revoked_tokens" IS 'Tokens revogados (logout server-side). Hash do token JWT (SHA-256). Expiração baseada no exp original do token.';

CREATE INDEX IF NOT EXISTS "revoked_tokens_token_hash_idx" ON "public"."revoked_tokens" USING btree ("token_hash");
CREATE INDEX IF NOT EXISTS "revoked_tokens_user_id_idx" ON "public"."revoked_tokens" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "revoked_tokens_expires_at_idx" ON "public"."revoked_tokens" USING btree ("expires_at");

-- Cleanup function for expired revoked tokens (can be run via pg_cron or scheduled job)
CREATE OR REPLACE FUNCTION "public"."cleanup_expired_revoked_tokens"() RETURNS integer
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
DECLARE
    v_count integer;
BEGIN
    DELETE FROM "public"."revoked_tokens" WHERE "expires_at" < now();
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

-- Cleanup function for expired password reset tokens
CREATE OR REPLACE FUNCTION "public"."cleanup_expired_password_reset_tokens"() RETURNS integer
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
DECLARE
    v_count integer;
BEGIN
    DELETE FROM "public"."password_reset_tokens" WHERE "expires_at" < now() OR "used_at" IS NOT NULL;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

-- RLS policies for password_reset_tokens (service role only)
ALTER TABLE "public"."password_reset_tokens" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "password_reset_tokens_service_role" ON "public"."password_reset_tokens"
    FOR ALL TO "service_role" USING (true) WITH CHECK (true);

-- RLS policies for revoked_tokens (service role only)
ALTER TABLE "public"."revoked_tokens" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "revoked_tokens_service_role" ON "public"."revoked_tokens"
    FOR ALL TO "service_role" USING (true) WITH CHECK (true);

COMMENT ON TABLE "public"."password_reset_tokens" IS 'Tokens seguros para redefinição de senha. Token armazenado apenas como hash (SHA-256). Expiração curta (1h), uso único. Não revelar se email existe.';

COMMENT ON TABLE "public"."revoked_tokens" IS 'Tokens revogados (logout server-side). Hash do token JWT (SHA-256). Expiração baseada no exp original do token.';