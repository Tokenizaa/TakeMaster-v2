-- TakeMaster V2: payment intents table + transactional confirmation function.
--
-- Esta migration adiciona:
-- 1. Tabela payment_intents (intenção de pagamento vinculada a uma subscription)
-- 2. Tabela payment_gateway_events (eventos brutos do gateway para auditoria)
-- 3. Função PL/pgSQL confirm_payment_and_activate_subscription que valida e
--    atualiza ambos os registros em UMA transação atômica via RPC.
--
-- Não destrutiva: usa CREATE TABLE IF NOT EXISTS e CREATE OR REPLACE FUNCTION.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'payment_intents'
  ) THEN
    CREATE TABLE public.payment_intents (
      id uuid DEFAULT gen_random_uuid() NOT NULL,
      organization_id uuid NOT NULL,
      program_id uuid,
      subscription_id uuid,
      plan_id text NOT NULL,
      amount_cents integer NOT NULL,
      currency text DEFAULT 'BRL' NOT NULL,
      status text DEFAULT 'created' NOT NULL,
      gateway_provider text NOT NULL,
      gateway_transaction_id text,
      gateway_payload jsonb DEFAULT '{}'::jsonb,
      webhook_received_at timestamp with time zone,
      reconciled_at timestamp with time zone,
      metadata jsonb DEFAULT '{}'::jsonb,
      created_at timestamp with time zone DEFAULT now() NOT NULL,
      updated_at timestamp with time zone DEFAULT now() NOT NULL,
      CONSTRAINT payment_intents_status_check
        CHECK (status = ANY (ARRAY[
          'created'::text, 'pending_payment'::text, 'payment_confirmed'::text,
          'payment_failed'::text, 'expired'::text, 'cancelled'::text,
          'refunded'::text, 'reconciliation_needed'::text
        ]))
    );
    ALTER TABLE public.payment_intents OWNER TO postgres;
    COMMENT ON TABLE public.payment_intents IS
      'Intenção de pagamento vinculada a um programa e subscription. Usada para conciliar webhooks do VenoPag com ativação de assinatura.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'payment_gateway_events'
  ) THEN
    CREATE TABLE public.payment_gateway_events (
      id bigint NOT NULL,
      organization_id uuid NOT NULL,
      subscription_id uuid,
      provider text NOT NULL,
      event_type text NOT NULL,
      status text NOT NULL,
      payload jsonb DEFAULT '{}'::jsonb NOT NULL,
      created_at timestamp with time zone DEFAULT now() NOT NULL
    );
    ALTER TABLE public.payment_gateway_events OWNER TO postgres;
    ALTER TABLE public.payment_gateway_events ALTER COLUMN id
      ADD GENERATED ALWAYS AS IDENTITY (
        SEQUENCE NAME public.payment_gateway_events_id_seq
        START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1
      );
    COMMENT ON TABLE public.payment_gateway_events IS
      'Eventos brutos recebidos do gateway VenoPag para auditoria e reconciliação.';
  END IF;
END $$;

-- Atualizar payment_intents para garantir a coluna subscription_id (se já existir sem ela)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'payment_intents'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payment_intents'
      AND column_name = 'subscription_id'
  ) THEN
    ALTER TABLE public.payment_intents ADD COLUMN subscription_id uuid;
  END IF;
END $$;

-- Função transacional para confirmação de pagamento e ativação de subscription.
-- Executada via RPC (service_role) para bypassar RLS.
-- Valida: pagamento pertence à organização, subscription vinculada existe e está pendente.
-- Atualiza ambos os registros na mesma transação.
CREATE OR REPLACE FUNCTION public.confirm_payment_and_activate_subscription(
  p_payment_intent_id uuid,
  p_organization_id uuid,
  p_gateway_transaction_id text,
  p_gateway_payload jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO 'public'
AS $$
DECLARE
  v_intent_status text;
  v_subscription_id uuid;
  v_subscription_status text;
  v_rows_updated integer;
  v_result jsonb;
BEGIN
  -- 1. Validar intenção de pagamento
  SELECT status, subscription_id
    INTO v_intent_status, v_subscription_id
    FROM public.payment_intents
   WHERE id = p_payment_intent_id
     AND organization_id = p_organization_id;

  IF v_intent_status IS NULL THEN
    RAISE EXCEPTION 'Intenção de pagamento não encontrada para esta organização'
      USING ERRCODE = '404';
  END IF;

  -- 2. Idempotência: já confirmada
  IF v_intent_status = 'payment_confirmed' THEN
    RETURN jsonb_build_object(
      'status', 'already_processed',
      'message', 'Pagamento já confirmado anteriormente',
      'payment_intent_id', p_payment_intent_id::text
    );
  END IF;

  -- 3. Validar que há subscription vinculada
  IF v_subscription_id IS NULL THEN
    RAISE EXCEPTION 'Intenção de pagamento não possui subscription vinculada'
      USING ERRCODE = '400';
  END IF;

  -- 4. Validar estado da subscription vinculada
  SELECT status
    INTO v_subscription_status
    FROM public.organization_subscriptions
   WHERE id = v_subscription_id
     AND organization_id = p_organization_id;

  IF v_subscription_status IS NULL THEN
    RAISE EXCEPTION 'Subscription vinculada não encontrada ou não pertence à organização'
      USING ERRCODE = '404';
  END IF;

  IF v_subscription_status <> 'pending_payment' THEN
    RAISE EXCEPTION 'Subscription vinculada não está em estado pendente (atual: %)'
      USING ERRCODE = '409', v_subscription_status;
  END IF;

  -- 5. Transação atômica: ativar subscription + confirmar pagamento
  UPDATE public.organization_subscriptions
     SET status = 'active',
         ends_at = now() + interval '30 days',
         updated_at = now(),
         external_reference = p_gateway_transaction_id
   WHERE id = v_subscription_id
     AND organization_id = p_organization_id
     AND status = 'pending_payment';

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

  IF v_rows_updated = 0 THEN
    -- Concorrência: outra transação já alterou a subscription
    RAISE EXCEPTION 'Não foi possível ativar a subscription (conflito de concorrência)'
      USING ERRCODE = '409';
  END IF;

  UPDATE public.payment_intents
     SET status = 'payment_confirmed',
         gateway_transaction_id = p_gateway_transaction_id,
         gateway_payload = p_gateway_payload,
         webhook_received_at = now(),
         reconciled_at = now(),
         updated_at = now()
   WHERE id = p_payment_intent_id
     AND organization_id = p_organization_id;

  -- 6. Registrar evento de gateway para auditoria
  INSERT INTO public.payment_gateway_events (
    organization_id, subscription_id, provider, event_type, status, payload
  ) VALUES (
    p_organization_id, v_subscription_id, 'venopag',
    'payment_confirmed', 'confirmed', p_gateway_payload
  );

  -- 7. Retornar resultado
  v_result := jsonb_build_object(
    'status', 'confirmed',
    'message', 'Pagamento confirmado e subscription ativada',
    'payment_intent_id', p_payment_intent_id::text,
    'subscription_id', v_subscription_id::text,
    'gateway_transaction_id', p_gateway_transaction_id,
    'confirmed_at', now()
  );

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    -- Qualquer erro desfaz a transação inteira (atomicidade via PL/pgSQL)
    RAISE;
END;
$$;

ALTER FUNCTION public.confirm_payment_and_activate_subscription(
  uuid, uuid, text, jsonb
) OWNER TO postgres;

COMMENT ON FUNCTION public.confirm_payment_and_activate_subscription(
  uuid, uuid, text, jsonb
) IS 'Confirma pagamento e ativa subscription vinculada em uma única transação PostgreSQL. Chamada via RPC pelo webhook VenoPag.';

-- Função transacional para falha de pagamento.
-- Cancela a subscription vinculada e marca o payment_intent como falha,
-- tudo em uma única transação.
CREATE OR REPLACE FUNCTION public.handle_payment_failure(
  p_payment_intent_id uuid,
  p_organization_id uuid,
  p_failure_reason text
) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO 'public'
AS $$
DECLARE
  v_intent_status text;
  v_subscription_id uuid;
  v_subscription_status text;
  v_rows_updated integer;
BEGIN
  -- 1. Validar intenção de pagamento
  SELECT status, subscription_id
    INTO v_intent_status, v_subscription_id
    FROM public.payment_intents
   WHERE id = p_payment_intent_id
     AND organization_id = p_organization_id;

  IF v_intent_status IS NULL THEN
    RAISE EXCEPTION 'Intenção de pagamento não encontrada para esta organização'
      USING ERRCODE = '404';
  END IF;

  -- 2. Idempotência: já processada
  IF v_intent_status IN ('payment_confirmed', 'payment_failed') THEN
    RETURN jsonb_build_object(
      'status', 'already_processed',
      'message', 'Pagamento já foi processado anteriormente',
      'payment_intent_id', p_payment_intent_id::text
    );
  END IF;

  -- 3. Cancelar subscription vinculada (se existir e estiver pendente)
  IF v_subscription_id IS NOT NULL THEN
    UPDATE public.organization_subscriptions
       SET status = 'cancelled',
           ends_at = now(),
           updated_at = now()
     WHERE id = v_subscription_id
       AND organization_id = p_organization_id
       AND status = 'pending_payment';

    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

    IF v_rows_updated = 0 THEN
      -- Verifica estado atual da subscription
      SELECT status
        INTO v_subscription_status
        FROM public.organization_subscriptions
       WHERE id = v_subscription_id
         AND organization_id = p_organization_id;

      IF v_subscription_status IS NOT NULL AND v_subscription_status <> 'pending_payment' THEN
        -- Já está em outro estado (ativa, cancelada, etc.) — não é erro, apenas não há o que cancelar
        NULL;
      ELSE
        RAISE EXCEPTION 'Não foi possível cancelar a subscription vinculada'
          USING ERRCODE = '409';
      END IF;
    END IF;
  END IF;

  -- 4. Marcar payment_intent como falha
  UPDATE public.payment_intents
     SET status = 'payment_failed',
         gateway_payload = jsonb_build_object('failureReason', p_failure_reason),
         webhook_received_at = now(),
         updated_at = now()
   WHERE id = p_payment_intent_id
     AND organization_id = p_organization_id;

  -- 5. Registrar evento de gateway para auditoria
  INSERT INTO public.payment_gateway_events (
    organization_id, subscription_id, provider, event_type, status, payload
  ) VALUES (
    p_organization_id, v_subscription_id, 'venopag',
    'payment_failed', 'failed', jsonb_build_object('failureReason', p_failure_reason)
  );

  RETURN jsonb_build_object(
    'status', 'failed',
    'message', 'Pagamento falhou e subscription vinculada cancelada',
    'payment_intent_id', p_payment_intent_id::text,
    'subscription_id', coalesce(v_subscription_id::text, 'null'),
    'failure_reason', p_failure_reason,
    'failed_at', now()
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

ALTER FUNCTION public.handle_payment_failure(uuid, uuid, text) OWNER TO postgres;

COMMENT ON FUNCTION public.handle_payment_failure(uuid, uuid, text) IS
  'Marca pagamento como falhado e cancela subscription vinculada em uma única transação PostgreSQL.';
