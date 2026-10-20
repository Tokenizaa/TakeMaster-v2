-- Correct VenoPag reversals: do not let the confirmed-payment idempotency guard
-- swallow later refunds, chargebacks, or contested events.
-- Preserve payment intent history while revoking subscription and program access.
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
  v_executive_user_id uuid;
  v_billing_period text;
  v_ends_at timestamptz;
  v_mapped_status text;
BEGIN
  SELECT * INTO v_intent
  FROM public.program_payment_intents
  WHERE id = p_intent_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'payment intent not found' USING ERRCODE = 'P0002';
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

  IF v_mapped_status = 'confirmed'
     AND v_intent.status = 'confirmed'
     AND v_intent.subscription_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'intent_id', v_intent.id,
      'status', v_intent.status,
      'subscription_id', v_intent.subscription_id,
      'already_finalized', true
    );
  END IF;

  IF v_mapped_status <> 'confirmed' THEN
    UPDATE public.program_payment_intents
    SET status = v_mapped_status,
        provider_status = p_provider_status,
        provider_transaction_id = coalesce(p_transaction_id, provider_transaction_id),
        updated_at = now()
    WHERE id = p_intent_id;

    -- A reversal must undo the access created by an earlier confirmation.
    -- Keep the intent as the audit record, but revoke the active entitlement.
    IF v_intent.subscription_id IS NOT NULL
       AND v_mapped_status IN ('contested','chargedback','refunded') THEN
      UPDATE public.program_subscriptions
      SET status = CASE WHEN v_mapped_status = 'contested' THEN 'paused' ELSE 'cancelled' END,
          ends_at = now(),
          updated_at = now()
      WHERE id = v_intent.subscription_id
        AND status IN ('active','paused');

      UPDATE public.program_memberships
      SET status = 'revoked',
          revoked_at = coalesce(revoked_at, now()),
          updated_at = now()
      WHERE organization_id = v_intent.organization_id
        AND program_id = v_intent.program_id
        AND status = 'active';

      -- This legacy catalog link is an alternate RLS access path.
      -- Remove only the link belonging to the reversed program's intent.
      IF v_intent.catalog_program_id IS NOT NULL THEN
        DELETE FROM public.organization_programs
        WHERE organization_id = v_intent.organization_id
          AND program_id = v_intent.program_id
          AND catalog_program_id = v_intent.catalog_program_id;
      END IF;
    END IF;

    RETURN jsonb_build_object('intent_id', p_intent_id, 'status', v_mapped_status);
  END IF;

  UPDATE public.program_subscriptions
  SET status = 'expired', updated_at = now()
  WHERE organization_id = v_intent.organization_id
    AND program_id = v_intent.program_id
    AND status = 'active'
    AND ends_at IS NOT NULL
    AND ends_at <= now();

  SELECT ps.id INTO v_subscription_id
  FROM public.program_subscriptions ps
  WHERE ps.program_id = v_intent.program_id
    AND ps.organization_id = v_intent.organization_id
    AND ps.status = 'active'
    AND (ps.ends_at IS NULL OR ps.ends_at > now())
  LIMIT 1
  FOR UPDATE;

  IF v_subscription_id IS NULL THEN
    SELECT cp.billing_period INTO v_billing_period
    FROM public.commercial_plans cp WHERE cp.id = v_intent.plan_id;

    v_ends_at := CASE v_billing_period
      WHEN 'monthly' THEN now() + interval '1 month'
      WHEN 'annual' THEN now() + interval '1 year'
      ELSE NULL
    END;

    IF v_ends_at IS NULL THEN
      RAISE EXCEPTION 'unsupported billing period for VenoPag PIX: %', v_billing_period USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.program_subscriptions (
      organization_id, program_id, plan_id, status, starts_at, ends_at,
      external_reference, created_at, updated_at
    ) VALUES (
      v_intent.organization_id, v_intent.program_id, v_intent.plan_id, 'active', now(), v_ends_at,
      'venopag:' || v_intent.id::text, now(), now()
    )
    RETURNING id INTO v_subscription_id;
  END IF;

  SELECT p.executive_user_id INTO v_executive_user_id
  FROM public.programs p WHERE p.id = v_intent.program_id;

  IF v_executive_user_id IS NOT NULL THEN
    UPDATE public.program_memberships
    SET status = 'active',
        permissions = '{"canView":true,"canEditEditorial":true,"canEditScript":true,"canOperateStudio":true,"canManageSchedule":true,"canManageAssets":true,"canExport":true}'::jsonb,
        authorized_at = coalesce(authorized_at, now()),
        revoked_at = NULL,
        updated_at = now()
    WHERE organization_id = v_intent.organization_id
      AND program_id = v_intent.program_id
      AND user_id = v_executive_user_id
      AND role = 'executive';

    IF NOT FOUND THEN
      INSERT INTO public.program_memberships (
        organization_id, program_id, user_id, role, status, permissions,
        authorized_by, authorized_at, created_at, updated_at
      ) VALUES (
        v_intent.organization_id, v_intent.program_id, v_executive_user_id, 'executive', 'active',
        '{"canView":true,"canEditEditorial":true,"canEditScript":true,"canOperateStudio":true,"canManageSchedule":true,"canManageAssets":true,"canExport":true}'::jsonb,
        v_executive_user_id, now(), now(), now()
      );
    END IF;
  END IF;

  -- Catalog membership is optional for custom programs. Never silently reassign a
  -- catalog entry already bound to a different program instance in this organization.
  IF v_intent.catalog_program_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.organization_programs op
      WHERE op.organization_id = v_intent.organization_id
        AND op.catalog_program_id = v_intent.catalog_program_id
        AND op.program_id IS NOT NULL
        AND op.program_id <> v_intent.program_id
    ) THEN
      RAISE EXCEPTION 'catalog program is already linked to another program instance' USING ERRCODE = '23505';
    END IF;

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
