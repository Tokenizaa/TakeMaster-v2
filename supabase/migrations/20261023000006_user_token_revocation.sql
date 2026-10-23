-- User token revocation tracking for revokeAllUserTokens
-- Migration: 20261023000006

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

-- User token revocation epoch table
-- Tracks when all tokens for a user were revoked (password reset, security event, etc.)
CREATE TABLE IF NOT EXISTS "public"."user_token_revocation" (
    "user_id" "uuid" NOT NULL PRIMARY KEY,
    "revoked_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reason" "text" DEFAULT 'password_reset'::"text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE "public"."user_token_revocation" OWNER TO "postgres";

COMMENT ON TABLE "public"."user_token_revocation" IS 'Tracks when all tokens for a user were revoked (password reset, security event). Token validation checks if token was issued before revocation epoch.';

CREATE INDEX IF NOT EXISTS "user_token_revocation_user_id_idx" ON "public"."user_token_revocation" USING btree ("user_id");

-- RLS policy for service role only
ALTER TABLE "public"."user_token_revocation" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_token_revocation_service_role" ON "public"."user_token_revocation"
    FOR ALL TO "service_role" USING (true) WITH CHECK (true);

-- Function to revoke all tokens for a user (upsert revocation epoch)
CREATE OR REPLACE FUNCTION "public"."revoke_all_user_tokens"(p_user_id uuid, p_reason text DEFAULT 'password_reset')
RETURNS void
LANGUAGE "plpgsql"
SET "search_path" TO ''
AS $$
BEGIN
    INSERT INTO "public"."user_token_revocation" ("user_id", "revoked_at", "reason", "updated_at")
    VALUES (p_user_id, now(), p_reason, now())
    ON CONFLICT ("user_id") DO UPDATE SET
        "revoked_at" = now(),
        "reason" = p_reason,
        "updated_at" = now();
END;
$$;

ALTER FUNCTION "public"."revoke_all_user_tokens"(uuid, text) OWNER TO "postgres";

COMMENT ON FUNCTION "public"."revoke_all_user_tokens"(uuid, text) IS 'Revokes all tokens for a user by setting revocation epoch. Returns void.';

-- Function to check if a user's tokens have been revoked after a given timestamp
CREATE OR REPLACE FUNCTION "public"."is_user_token_revoked"(p_user_id uuid, p_token_issued_at timestamptz)
RETURNS boolean
LANGUAGE "plpgsql"
SET "search_path" TO ''
AS $$
DECLARE
    v_revoked_at timestamptz;
BEGIN
    SELECT "revoked_at" INTO v_revoked_at
    FROM "public"."user_token_revocation"
    WHERE "user_id" = p_user_id;
    
    IF v_revoked_at IS NULL THEN
        RETURN false;
    END IF;
    
    -- Token is revoked if it was issued before the revocation epoch
    RETURN p_token_issued_at < v_revoked_at;
END;
$$;

ALTER FUNCTION "public"."is_user_token_revoked"(uuid, timestamptz) OWNER TO "postgres";

COMMENT ON FUNCTION "public"."is_user_token_revoked"(uuid, timestamptz) IS 'Checks if user tokens were revoked after the token was issued. Returns true if revoked.';

-- Update the cleanup function to also clean up old revocation entries (optional, keep for audit)
-- No cleanup needed - keep revocation records for audit trail