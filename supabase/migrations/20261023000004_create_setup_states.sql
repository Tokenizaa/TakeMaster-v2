-- TakeMaster V2: create setup_states table.
-- Armazena o estado de pré-setup de cada programa para permitir retry e idempotência.
-- Não destrutiva: usa CREATE TABLE IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS public.setup_states (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid NOT NULL,
  program_id uuid NOT NULL,
  status text DEFAULT 'setup_pending' NOT NULL,
  version integer DEFAULT 0 NOT NULL,
  steps jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  completed_at timestamp with time zone,
  error text,
  CONSTRAINT setup_states_status_check
    CHECK (status = ANY (ARRAY[
      'not_started'::text, 'setup_pending'::text, 'setup_running'::text,
      'setup_failed'::text, 'ready'::text, 'suspended'::text, 'cancelled'::text
    ]))
);

ALTER TABLE public.setup_states OWNER TO postgres;

COMMENT ON TABLE public.setup_states IS
  'Estado de pré-setup de cada programa. Permite retry idempotente e recuperação de falhas.';

-- Índice para consulta rápida por organização e programa
CREATE INDEX IF NOT EXISTS idx_setup_states_org_program
  ON public.setup_states(organization_id, program_id);
