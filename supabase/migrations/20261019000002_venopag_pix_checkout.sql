-- VenoPag PIX checkout and program-scoped commercial ownership.
-- Additive migration; existing organizations, programs and subscriptions are preserved.

ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS executive_user_id uuid;

CREATE INDEX IF NOT EXISTS programs_executive_user_idx
  ON public.programs (executive_user_id)
  WHERE executive_user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.program_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'editor'
    CHECK (role IN ('executive','producer','editor','host','viewer')),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('pending','active','revoked')),
  permissions jsonb NOT NULL DEFAULT '{"canView":true,"canEditEditorial":false,"canEditScript":false,"canOperateStudio":false,"canManageSchedule":false,"canManageAssets":false,"canExport":false}'::jsonb,
  authorized_by uuid,
  authorized_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (program_id, user_id)
);

CREATE INDEX IF NOT EXISTS program_memberships_user_status_idx
  ON public.program_memberships (organization_id, user_id, status);
CREATE INDEX IF NOT EXISTS program_memberships_program_status_idx
  ON public.program_memberships (program_id, status);

ALTER TABLE public.program_memberships ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.program_memberships FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.program_memberships TO service_role;

-- RLS helper must not grant every organization member access to every program.
-- Organization owner/admin remain global administrators; other users require an active program membership.
CREATE OR REPLACE FUNCTION public.has_program_access(p_program_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $
  SELECT EXISTS (
    SELECT 1
    FROM public.programs p
    WHERE p.id = p_program_id
      AND (
        EXISTS (
          SELECT 1 FROM public.organization_members om
          WHERE om.organization_id = p.organization_id
            AND om.user_id = auth.uid()
            AND om.active = true
            AND om.role IN ('owner','admin')
        )
        OR EXISTS (
          SELECT 1 FROM public.program_memberships pm
          WHERE pm.organization_id = p.organization_id
            AND pm.program_id = p.id
            AND pm.user_id = auth.uid()
            AND pm.status = 'active'
        )
        OR EXISTS (
          SELECT 1
          FROM public.organization_programs op
          JOIN public.program_user_access pua
            ON pua.organization_id = op.organization_id
           AND pua.catalog_program_id = op.catalog_program_id
          WHERE op.program_id = p.id
            AND op.status = 'active'
            AND pua.user_id = auth.uid()
            AND pua.status = 'active'
        )
      )
  );
$;

REVOKE ALL ON FUNCTION public.has_program_access(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_program_access(uuid) TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.program_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE RESTRICT,
  plan_id uuid NOT NULL REFERENCES public.commercial_plans(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','active','paused','cancelled','expired')),
  starts_at timestamptz,
  ends_at timestamptz,
  external_reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS program_subscriptions_one_active_per_program_idx
  ON public.program_subscriptions (program_id)
  WHERE status = 'active';
CREATE INDEX IF NOT EXISTS program_subscriptions_org_program_idx
  ON public.program_subscriptions (organization_id, program_id, created_at DESC);

ALTER TABLE public.program_subscriptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.program_subscriptions FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.program_subscriptions TO service_role;

CREATE TABLE IF NOT EXISTS public.program_payment_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE RESTRICT,
  catalog_program_id uuid REFERENCES public.program_catalog(id) ON DELETE RESTRICT,
  plan_id uuid NOT NULL REFERENCES public.commercial_plans(id) ON DELETE RESTRICT,
  created_by uuid NOT NULL,
  idempotency_key text NOT NULL,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL DEFAULT 'BRL' CHECK (currency = 'BRL'),
  status text NOT NULL DEFAULT 'creating'
    CHECK (status IN ('creating','pending','confirmed','expired','canceled','contested','chargedback','refunded','failed','reconciliation_required')),
  provider text NOT NULL DEFAULT 'venopag' CHECK (provider = 'venopag'),
  provider_request_number text,
  provider_transaction_id text,
  provider_status text,
  pix_copy_paste text,
  qr_url text,
  qr_image text,
  checkout_url text,
  expires_at timestamptz,
  confirmed_at timestamptz,
  subscription_id uuid REFERENCES public.program_subscriptions(id) ON DELETE RESTRICT,
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, idempotency_key),
  UNIQUE (provider_request_number)
);

CREATE INDEX IF NOT EXISTS program_payment_intents_org_created_idx
  ON public.program_payment_intents (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS program_payment_intents_program_status_idx
  ON public.program_payment_intents (program_id, status);

-- One in-flight or completed initial checkout per program. Expired/failed attempts
-- may be retried; plan changes require a separate commercial flow.
CREATE UNIQUE INDEX IF NOT EXISTS program_payment_intents_one_live_checkout_idx
  ON public.program_payment_intents (organization_id, program_id)
  WHERE status IN ('creating','pending','confirmed','reconciliation_required');

ALTER TABLE public.program_payment_intents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.program_payment_intents FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.program_payment_intents TO service_role;

CREATE OR REPLACE FUNCTION public.finalize_venopag_payment(
  p_intent_id uuid,
  p_provider_status text,
  p_transaction_id text DEFAULT NULL,
  p_provider_payload jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_intent public.program_payment_intents%ROWTYPE;
  v_subscription_id uuid;
  v_mapped_status text;
BEGIN
  SELECT * INTO v_intent
  FROM public.program_payment_intents
  WHERE id = p_intent_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'payment intent not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_intent.status = 'confirmed' AND v_intent.subscription_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'intent_id', v_intent.id,
      'status', v_intent.status,
      'subscription_id', v_intent.subscription_id,
      'already_finalized', true
    );
  END IF;

  v_mapped_status := CASE lower(coalesce(p_provider_status, ''))
    WHEN 'confirmed' THEN 'confirmed'
    WHEN 'expired' THEN 'expired'
    WHEN 'canceled' THEN 'canceled'
    WHEN 'cancelled' THEN 'canceled'
    WHEN 'contested' THEN 'contested'
    WHEN 'chargedback' THEN 'chargedback'
    WHEN 'charged_back' THEN 'chargedback'
    WHEN 'refunded' THEN 'refunded'
    WHEN 'failed' THEN 'failed'
    WHEN 'pending' THEN 'pending'
    ELSE NULL
  END;

  IF v_mapped_status IS NULL THEN
    RAISE EXCEPTION 'unsupported VenoPag status: %', p_provider_status USING ERRCODE = '22023';
  END IF;

  IF v_mapped_status <> 'confirmed' THEN
    UPDATE public.program_payment_intents
    SET status = v_mapped_status,
        provider_status = p_provider_status,
        provider_transaction_id = coalesce(p_transaction_id, provider_transaction_id),
        updated_at = now()
    WHERE id = p_intent_id;
    RETURN jsonb_build_object('intent_id', p_intent_id, 'status', v_mapped_status);
  END IF;

  SELECT ps.id INTO v_subscription_id
  FROM public.program_subscriptions ps
  WHERE ps.program_id = v_intent.program_id
    AND ps.organization_id = v_intent.organization_id
    AND ps.status = 'active'
  LIMIT 1
  FOR UPDATE;

  IF v_subscription_id IS NULL THEN
    INSERT INTO public.program_subscriptions (
      organization_id, program_id, plan_id, status, starts_at, ends_at,
      external_reference, created_at, updated_at
    ) VALUES (
      v_intent.organization_id, v_intent.program_id, v_intent.plan_id, 'active', now(), NULL,
      'venopag:' || v_intent.id::text, now(), now()
    )
    RETURNING id INTO v_subscription_id;
  END IF;

  -- Catalog membership is optional for custom programs. When it exists, activate
  -- the access mapping without reusing the legacy organization-level subscription FK.
  IF v_intent.catalog_program_id IS NOT NULL THEN
    UPDATE public.organization_programs
    SET status = 'active',
        program_id = v_intent.program_id,
        starts_at = now(),
        ends_at = NULL,
        updated_at = now()
    WHERE organization_id = v_intent.organization_id
      AND catalog_program_id = v_intent.catalog_program_id;

    IF NOT FOUND THEN
      INSERT INTO public.organization_programs (
        organization_id, catalog_program_id, program_id, status, starts_at, created_at, updated_at
      ) VALUES (
        v_intent.organization_id, v_intent.catalog_program_id, v_intent.program_id,
        'active', now(), now(), now()
      );
    END IF;
  END IF;

  UPDATE public.program_payment_intents
  SET status = 'confirmed',
      provider_status = p_provider_status,
      provider_transaction_id = coalesce(p_transaction_id, provider_transaction_id),
      subscription_id = v_subscription_id,
      confirmed_at = coalesce(confirmed_at, now()),
      error_code = NULL,
      updated_at = now()
  WHERE id = p_intent_id;

  RETURN jsonb_build_object(
    'intent_id', p_intent_id,
    'status', 'confirmed',
    'subscription_id', v_subscription_id,
    'already_finalized', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_venopag_payment(uuid, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_venopag_payment(uuid, text, text, jsonb) TO service_role;
