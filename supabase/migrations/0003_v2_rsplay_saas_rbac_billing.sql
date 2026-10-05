-- TakeMaster V2 / RSPlay TV SaaS — Migration 0003: Program-Level RBAC, Subscriptions & Payment Gateway
-- Enforces individual login per program, granular content visibility, monthly plans, and auto-renewal billing.

-- 1. Extend users with password_hash / login_code and status
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS login_code TEXT NOT NULL DEFAULT 'rsplay123';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'invited'));
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS job_title TEXT NOT NULL DEFAULT 'Produtor';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- 2. Program-Level Access Permissions (Show-Level RBAC)
-- Guarantees each user only sees and edits the programs & contents released for their profile.
CREATE TABLE IF NOT EXISTS public.user_show_permissions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  show_id TEXT NOT NULL REFERENCES public.shows(id) ON DELETE CASCADE,
  can_view BOOLEAN NOT NULL DEFAULT true,
  can_edit_editorial BOOLEAN NOT NULL DEFAULT true,
  can_edit_script BOOLEAN NOT NULL DEFAULT true,
  can_operate_studio BOOLEAN NOT NULL DEFAULT true,
  can_manage_schedule BOOLEAN NOT NULL DEFAULT false,
  can_manage_assets BOOLEAN NOT NULL DEFAULT true,
  can_export BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id, show_id)
);

CREATE INDEX IF NOT EXISTS idx_user_show_perm_user ON public.user_show_permissions(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_user_show_perm_show ON public.user_show_permissions(organization_id, show_id);

-- 3. SaaS Monthly Subscriptions & Payment Gateway State
CREATE TABLE IF NOT EXISTS public.saas_subscriptions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  show_id TEXT REFERENCES public.shows(id) ON DELETE SET NULL,
  plan_id TEXT NOT NULL DEFAULT 'rsplay_studio_pro' CHECK (plan_id IN ('rsplay_programa_individual', 'rsplay_studio_pro', 'rsplay_broadcast_enterprise')),
  plan_name TEXT NOT NULL DEFAULT 'Plano Estúdio Pro RSPlay',
  billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'annual')),
  amount_cents INTEGER NOT NULL DEFAULT 129000,
  currency TEXT NOT NULL DEFAULT 'BRL',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'suspended')),
  auto_renew BOOLEAN NOT NULL DEFAULT true,
  payment_gateway TEXT NOT NULL DEFAULT 'stripe_pix_gateway',
  payment_method_type TEXT NOT NULL DEFAULT 'credit_card' CHECK (payment_method_type IN ('credit_card', 'pix_automatico', 'boleto_corporativo')),
  payment_method_last4 TEXT NOT NULL DEFAULT '4242',
  payment_method_brand TEXT NOT NULL DEFAULT 'Visa Corporate',
  gateway_customer_id TEXT NOT NULL DEFAULT '',
  gateway_subscription_id TEXT NOT NULL DEFAULT '',
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  last_renewal_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Billing Invoices & Automatic Renewal Ledger
CREATE TABLE IF NOT EXISTS public.billing_invoices (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  subscription_id TEXT NOT NULL REFERENCES public.saas_subscriptions(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  description TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'open', 'failed', 'refunded')),
  payment_method TEXT NOT NULL DEFAULT 'credit_card',
  gateway_transaction_id TEXT NOT NULL,
  auto_renewal_cycle BOOLEAN NOT NULL DEFAULT true,
  due_date TIMESTAMPTZ NOT NULL,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Payment Gateway Webhook & Event Logs
CREATE TABLE IF NOT EXISTS public.payment_gateway_events (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  subscription_id TEXT REFERENCES public.saas_subscriptions(id) ON DELETE SET NULL,
  provider TEXT NOT NULL DEFAULT 'rsplay_stripe_gateway',
  event_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processed',
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_show_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_gateway_events ENABLE ROW LEVEL SECURITY;
