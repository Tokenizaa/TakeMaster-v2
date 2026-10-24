-- Atomic claim lifecycle for password reset tokens.
-- Apply this migration before deploying code that calls these RPCs.
ALTER TABLE public.password_reset_tokens
  ADD COLUMN IF NOT EXISTS claim_id uuid,
  ADD COLUMN IF NOT EXISTS claim_expires_at timestamptz;

CREATE OR REPLACE FUNCTION public.claim_password_reset_token(p_token_hash text, p_claim_id uuid)
RETURNS TABLE(user_id uuid, email text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.password_reset_tokens AS t
  SET claim_id = p_claim_id, claim_expires_at = now() + interval '15 minutes'
  WHERE t.token_hash = p_token_hash
    AND t.used_at IS NULL
    AND t.expires_at > now()
    AND (t.claim_id IS NULL OR t.claim_expires_at < now())
  RETURNING t.user_id, t.email;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_password_reset_token_claim(p_token_hash text, p_claim_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE changed integer;
BEGIN
  UPDATE public.password_reset_tokens
  SET used_at = now(), claim_id = NULL, claim_expires_at = NULL
  WHERE token_hash = p_token_hash AND claim_id = p_claim_id
    AND used_at IS NULL AND expires_at > now();
  GET DIAGNOSTICS changed = ROW_COUNT;
  RETURN changed = 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_password_reset_token_claim(p_token_hash text, p_claim_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  UPDATE public.password_reset_tokens
  SET claim_id = NULL, claim_expires_at = NULL
  WHERE token_hash = p_token_hash AND claim_id = p_claim_id AND used_at IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_password_reset_token(text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_password_reset_token_claim(text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_password_reset_token_claim(text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_password_reset_token(text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_password_reset_token_claim(text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_password_reset_token_claim(text, uuid) TO service_role;
