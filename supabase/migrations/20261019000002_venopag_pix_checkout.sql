-- VenoPag PIX checkout: durable intents and idempotent activation.
-- This migration is intentionally additive. It does not rewrite existing billing rows.

CREATE TABLE IF NOT EXISTS public.program_payment_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE RESTRICT,
  catalog_program_id uuid NOT NULL REFERENCES public.program_catalog(id) ON DELETE RESTRICT,
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
  subscription_id uuid REFERENCES public.organization_subscriptions(id) ON DELETE RESTRICT,
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
-- may be retried with a new idempotency key; plan upgrades require a separate flow.
CREATE UNIQUE INDEX IF NOT EXISTS program_payment_intents_one_live_checkout_idx
  ON public.program_payment_intents (organization_id, catalog_program_id)
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

  -- Avoid duplicate subscription rows if the provider retries a webhook or two
  -- notifications race. The intent row lock serializes finalization for this intent.
  SELECT op.subscription_id INTO v_subscription_id
  FROM public.organization_programs op
  WHERE op.organization_id = v_intent.organization_id
    AND op.catalog_program_id = v_intent.catalog_program_id
    AND op.status = 'active'
    AND op.subscription_id IS NOT NULL
  LIMIT 1
  FOR UPDATE;

  IF v_subscription_id IS NULL THEN
    INSERT INTO public.organization_subscriptions (
      organization_id, plan_id, status, starts_at, ends_at, external_reference, created_at, updated_at
    ) VALUES (
      v_intent.organization_id, v_intent.plan_id, 'active', now(), NULL,
      'venopag:' || v_intent.id::text, now(), now()
    )
    RETURNING id INTO v_subscription_id;

    UPDATE public.organization_programs
    SET subscription_id = v_subscription_id,
        status = 'active',
        starts_at = now(),
        ends_at = NULL,
        updated_at = now()
    WHERE organization_id = v_intent.organization_id
      AND catalog_program_id = v_intent.catalog_program_id;

    IF NOT FOUND THEN
      INSERT INTO public.organization_programs (
        organization_id, catalog_program_id, subscription_id, program_id, status, starts_at, created_at, updated_at
      ) VALUES (
        v_intent.organization_id, v_intent.catalog_program_id, v_subscription_id,
        v_intent.program_id, 'active', now(), now(), now()
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
