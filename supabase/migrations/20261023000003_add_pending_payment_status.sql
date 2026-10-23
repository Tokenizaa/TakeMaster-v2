-- TakeMaster V2: add pending_payment status to organization_subscriptions check constraint.
-- Não destrutiva: remove o constraint antigo e cria um novo incluindo 'pending_payment'.

DO $$
BEGIN
  -- Remover constraint antigo se existir
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = 'organization_subscriptions'
      AND constraint_name = 'organization_subscriptions_status_check'
  ) THEN
    ALTER TABLE public.organization_subscriptions
      DROP CONSTRAINT organization_subscriptions_status_check;
  END IF;

  -- Recriar constraint com pending_payment incluído
  ALTER TABLE public.organization_subscriptions
    ADD CONSTRAINT organization_subscriptions_status_check
    CHECK (status = ANY (ARRAY[
      'trial'::text, 'active'::text, 'paused'::text,
      'cancelled'::text, 'expired'::text, 'pending_payment'::text
    ]));
END $$;
