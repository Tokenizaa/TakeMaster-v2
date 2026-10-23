-- TakeMaster V2: add missing columns to organization_subscriptions.
-- Adiciona colunas necessárias para o fluxo de pagamento com VenoPag.
-- Não destrutiva: usa ALTER TABLE ADD COLUMN IF NOT EXISTS.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'organization_subscriptions'
      AND column_name = 'auto_renew'
  ) THEN
    ALTER TABLE public.organization_subscriptions ADD COLUMN auto_renew boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'organization_subscriptions'
      AND column_name = 'payment_method_type'
  ) THEN
    ALTER TABLE public.organization_subscriptions ADD COLUMN payment_method_type text DEFAULT 'credit_card';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'organization_subscriptions'
      AND column_name = 'payment_method_last4'
  ) THEN
    ALTER TABLE public.organization_subscriptions ADD COLUMN payment_method_last4 text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'organization_subscriptions'
      AND column_name = 'payment_method_brand'
  ) THEN
    ALTER TABLE public.organization_subscriptions ADD COLUMN payment_method_brand text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'organization_subscriptions'
      AND column_name = 'gateway_subscription_id'
  ) THEN
    ALTER TABLE public.organization_subscriptions ADD COLUMN gateway_subscription_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'organization_subscriptions'
      AND column_name = 'last_renewal_at'
  ) THEN
    ALTER TABLE public.organization_subscriptions ADD COLUMN last_renewal_at timestamp with time zone;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'organization_subscriptions'
      AND column_name = 'canceled_at'
  ) THEN
    ALTER TABLE public.organization_subscriptions ADD COLUMN canceled_at timestamp with time zone;
  END IF;
END $$;
