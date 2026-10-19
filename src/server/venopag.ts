import { createHmac, timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
let db: ReturnType<typeof createClient> | undefined;
function getDb() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw Object.assign(new Error('Supabase não está configurado no backend.'), { statusCode: 503, code: 'DATABASE_NOT_CONFIGURED' });
  }
  if (!db) db = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  return db;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type VenoPagIntentStatus =
  | 'creating' | 'pending' | 'confirmed' | 'expired' | 'canceled'
  | 'contested' | 'chargedback' | 'refunded' | 'failed' | 'reconciliation_required';

type IntentRow = {
  id: string;
  organization_id: string;
  program_id: string;
  catalog_program_id: string;
  plan_id: string;
  created_by: string;
  idempotency_key: string;
  amount_cents: number;
  currency: string;
  status: VenoPagIntentStatus;
  provider_request_number: string | null;
  provider_transaction_id: string | null;
  provider_status: string | null;
  pix_copy_paste: string | null;
  qr_url: string | null;
  qr_image: string | null;
  checkout_url: string | null;
  expires_at: string | null;
  subscription_id: string | null;
  created_at: string;
};

type ProviderResponse = {
  ok?: boolean;
  error?: string;
  status?: string;
  amount?: number;
  request_number?: string;
  transaction_id?: string;
  copyPaste?: string;
  copy_paste?: string;
  pix_code?: string;
  code?: string;
  qr_url?: string;
  qr_img?: string;
  pix_qr_base64?: string;
  checkout_url?: string;
  expire_minutes?: number;
  updated_at?: string;
};

function getConfig() {
  const clientId = process.env.VENOPAG_CLIENT_ID;
  const clientSecret = process.env.VENOPAG_CLIENT_SECRET;
  const webhookSecret = process.env.VENOPAG_WEBHOOK_SECRET;
  const webhookUrl = process.env.VENOPAG_WEBHOOK_URL;
  if (!clientId || !clientSecret || !webhookSecret || !webhookUrl) {
    throw Object.assign(new Error('VenoPag não está configurado. Defina as credenciais e a URL pública do webhook no ambiente do servidor.'), { statusCode: 503, code: 'VENOPAG_NOT_CONFIGURED' });
  }
  return {
    clientId,
    clientSecret,
    webhookSecret,
    webhookUrl,
    baseUrl: (process.env.VENOPAG_BASE_URL || 'https://venopagments.com').replace(/\/$/, ''),
  };
}

async function providerRequest<T extends ProviderResponse>(path: string, init?: RequestInit): Promise<T> {
  const config = getConfig();
  let response: Response;
  try {
    response = await fetch(`${config.baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Id': config.clientId,
        'X-Client-Secret': config.clientSecret,
        ...(init?.headers || {}),
      },
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw Object.assign(new Error('Não foi possível confirmar a resposta do VenoPag. A tentativa exige conciliação antes de uma nova cobrança.'), { statusCode: 502, code: 'VENOPAG_NETWORK_AMBIGUOUS' });
  }

  let data: T;
  try {
    data = (await response.json()) as T;
  } catch {
    throw Object.assign(new Error('Resposta inválida recebida do VenoPag.'), { statusCode: 502, code: 'VENOPAG_INVALID_RESPONSE' });
  }
  if (!response.ok || data.ok !== true) {
    throw Object.assign(new Error(data.error || 'O VenoPag recusou a operação.'), { statusCode: 502, code: 'VENOPAG_PROVIDER_ERROR' });
  }
  return data;
}

function publicIntent(row: IntentRow) {
  return {
    id: row.id,
    programId: row.program_id,
    planId: row.plan_id,
    amountCents: row.amount_cents,
    currency: row.currency,
    status: row.status,
    requestNumber: row.provider_request_number,
    transactionId: row.provider_transaction_id,
    pixCopyPaste: row.pix_copy_paste,
    qrUrl: row.qr_url,
    qrImage: row.qr_image,
    checkoutUrl: row.checkout_url,
    expiresAt: row.expires_at,
    subscriptionId: row.subscription_id,
    createdAt: row.created_at,
  };
}

async function readIntent(id: string, organizationId: string, createdBy?: string): Promise<IntentRow | null> {
  let query = getDb().from('program_payment_intents')
    .select('*').eq('id', id).eq('organization_id', organizationId);
  if (createdBy) query = query.eq('created_by', createdBy);
  const result = await query.maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return (result.data as IntentRow | null) || null;
}

export async function createVenoPagPixCheckout(input: {
  organizationId: string;
  userId: string;
  userRole: string;
  programId: string;
  planCode: string;
  idempotencyKey: string;
  customerName?: string;
}) {
  if (!input.idempotencyKey || input.idempotencyKey.length < 16 || input.idempotencyKey.length > 200) {
    throw Object.assign(new Error('A chave de idempotência é obrigatória.'), { statusCode: 400, code: 'INVALID_IDEMPOTENCY_KEY' });
  }
  if (!input.programId || !input.planCode) {
    throw Object.assign(new Error('programId e planCode são obrigatórios.'), { statusCode: 400, code: 'VALIDATION_ERROR' });
  }

  const duplicate = await getDb().from('program_payment_intents').select('*')
    .eq('organization_id', input.organizationId).eq('idempotency_key', input.idempotencyKey).maybeSingle();
  if (duplicate.error) throw new Error(duplicate.error.message);
  if (duplicate.data) {
    const row = duplicate.data as IntentRow;
    if (row.status === 'creating' || row.status === 'reconciliation_required') {
      throw Object.assign(new Error('Esta tentativa já existe e precisa ser conciliada antes de criar outra cobrança.'), { statusCode: 409, code: 'PAYMENT_RECONCILIATION_REQUIRED' });
    }
    return publicIntent(row);
  }

  const programQuery = UUID_RE.test(input.programId)
    ? await getDb().from('programs').select('id,organization_id,catalog_program_id,executive_user_id,title,name').eq('id', input.programId).maybeSingle()
    : await getDb().from('programs').select('id,organization_id,catalog_program_id,title,name').eq('legacy_id', input.programId).maybeSingle();
  if (programQuery.error) throw new Error(programQuery.error.message);
  const program = programQuery.data;
  if (!program || program.organization_id !== input.organizationId) {
    throw Object.assign(new Error('Programa não encontrado nesta organização.'), { statusCode: 404, code: 'PROGRAM_NOT_FOUND' });
  }
  if (input.userRole === 'producer' && program.executive_user_id !== input.userId) {
    throw Object.assign(new Error('Somente o diretor executivo responsável pode contratar este programa.'), { statusCode: 403, code: 'PROGRAM_EXECUTIVE_REQUIRED' });
  }

  const planResult = await getDb().from('commercial_plans').select('id,code,name,price_cents,currency,active')
    .eq('code', input.planCode).eq('active', true).single();
  if (planResult.error || !planResult.data) {
    throw Object.assign(new Error('Plano comercial indisponível.'), { statusCode: 400, code: 'PLAN_NOT_AVAILABLE' });
  }
  const plan = planResult.data;
  const amountCents = Number(plan.price_cents);
  if (!Number.isInteger(amountCents) || amountCents <= 0 || plan.currency !== 'BRL') {
    throw Object.assign(new Error('O plano não possui um preço BRL válido para cobrança.'), { statusCode: 409, code: 'PLAN_PRICE_INVALID' });
  }

  if (program.catalog_program_id) {
    const catalogLink = await getDb().from('organization_programs').select('program_id')
      .eq('organization_id', input.organizationId).eq('catalog_program_id', program.catalog_program_id).maybeSingle();
    if (catalogLink.error) throw new Error(catalogLink.error.message);
    if (catalogLink.data?.program_id && catalogLink.data.program_id !== program.id) {
      throw Object.assign(new Error('Este programa do catálogo já está vinculado a outra instância nesta organização.'), { statusCode: 409, code: 'CATALOG_PROGRAM_ALREADY_LINKED' });
    }
  }

  const existingSubscription = await getDb().from('program_subscriptions').select('id')
    .eq('organization_id', input.organizationId).eq('program_id', program.id).eq('status', 'active').maybeSingle();
  if (existingSubscription.error) throw new Error(existingSubscription.error.message);
  if (existingSubscription.data) {
    throw Object.assign(new Error('Este programa já possui uma assinatura ativa. Alterações de plano exigem o fluxo próprio de alteração comercial.'), { statusCode: 409, code: 'PROGRAM_ALREADY_SUBSCRIBED' });
  }

  const config = getConfig();
  const insert = await getDb().from('program_payment_intents').insert({
    organization_id: input.organizationId,
    program_id: program.id,
    catalog_program_id: program.catalog_program_id,
    plan_id: plan.id,
    created_by: input.userId,
    idempotency_key: input.idempotencyKey,
    amount_cents: amountCents,
    status: 'creating',
  }).select('*').single();

  if (insert.error) {
    if (insert.error.code === '23505') {
      throw Object.assign(new Error('Já existe uma tentativa de cobrança em andamento para este programa. Consulte o estado da cobrança existente.'), { statusCode: 409, code: 'PROGRAM_CHECKOUT_EXISTS' });
    }
    throw new Error(insert.error.message);
  }
  const intent = insert.data as IntentRow;

  try {
    const amount = amountCents / 100;
    const charge = await providerRequest<ProviderResponse>('/api/cashin', {
      method: 'POST',
      body: JSON.stringify({
        amount,
        name: input.customerName || 'RS Play TV',
        description: `TakeMaster · ${program.title || program.name} · ${plan.name} · ${intent.id}`,
        webhook_url: config.webhookUrl,
      }),
    });
    if (!charge.request_number) {
      await getDb().from('program_payment_intents').update({
        status: 'reconciliation_required',
        provider_status: charge.status || 'unknown',
        error_code: 'PROVIDER_REQUEST_NUMBER_MISSING',
        updated_at: new Date().toISOString(),
      }).eq('id', intent.id);
      throw Object.assign(new Error('O VenoPag não retornou o identificador da cobrança. A tentativa foi preservada para conciliação; não repita o pagamento.'), { statusCode: 502, code: 'VENOPAG_MISSING_REQUEST_NUMBER' });
    }

    const expiresAt = Number.isFinite(charge.expire_minutes) && Number(charge.expire_minutes) > 0
      ? new Date(Date.now() + Number(charge.expire_minutes) * 60_000).toISOString()
      : null;
    const providerStatus = String(charge.status || 'pending').toLowerCase();
    const initialStatus: VenoPagIntentStatus =
      providerStatus === 'expired' ? 'expired' :
      providerStatus === 'canceled' || providerStatus === 'cancelled' ? 'canceled' :
      providerStatus === 'failed' ? 'failed' : 'pending';
    const updated = await getDb().from('program_payment_intents').update({
      // Even if the create response says confirmed, independently reconcile it before activation.
      status: initialStatus,
      provider_request_number: charge.request_number,
      provider_transaction_id: charge.transaction_id || null,
      provider_status: charge.status || 'pending',
      pix_copy_paste: charge.copyPaste || charge.copy_paste || charge.pix_code || charge.code || null,
      qr_url: charge.qr_url || null,
      qr_image: charge.qr_img || charge.pix_qr_base64 || null,
      checkout_url: charge.checkout_url || null,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    }).eq('id', intent.id).select('*').single();
    if (updated.error || !updated.data) {
      throw Object.assign(new Error('A cobrança foi criada no VenoPag, mas não foi possível persistir a resposta. A tentativa exige conciliação; não crie outra cobrança.'), { statusCode: 502, code: 'PAYMENT_PERSISTENCE_AMBIGUOUS' });
    }
    return publicIntent(updated.data as IntentRow);
  } catch (error: any) {
    const code = String(error?.code || 'VENOPAG_REQUEST_FAILED');
    // A network timeout can happen after the provider creates the charge.
    // Preserve the row and block automatic retries to prevent duplicate charges.
    if (code !== 'VENOPAG_MISSING_REQUEST_NUMBER') {
      await getDb().from('program_payment_intents').update({
        status: 'reconciliation_required',
        error_code: code,
        updated_at: new Date().toISOString(),
      }).eq('id', intent.id);
    }
    throw error;
  }
}

export async function getVenoPagPixCheckout(id: string, organizationId: string, createdBy?: string) {
  if (!UUID_RE.test(id)) {
    throw Object.assign(new Error('Identificador de cobrança inválido.'), { statusCode: 400, code: 'INVALID_PAYMENT_INTENT_ID' });
  }
  const row = await readIntent(id, organizationId, createdBy);
  if (!row) throw Object.assign(new Error('Cobrança não encontrada.'), { statusCode: 404, code: 'PAYMENT_INTENT_NOT_FOUND' });
  return publicIntent(row);
}

export async function listVenoPagPixCheckouts(organizationId: string, createdBy?: string) {
  let query = getDb().from('program_payment_intents').select('*')
    .eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(20);
  if (createdBy) query = query.eq('created_by', createdBy);
  const result = await query;
  if (result.error) throw new Error(result.error.message);
  return ((result.data || []) as IntentRow[]).map(publicIntent);
}

export async function verifyVenoPagPixCheckout(id: string, organizationId: string, createdBy?: string) {
  const row = await readIntent(id, organizationId, createdBy);
  if (!row) throw Object.assign(new Error('Cobrança não encontrada.'), { statusCode: 404, code: 'PAYMENT_INTENT_NOT_FOUND' });
  if (row.status === 'confirmed' && row.subscription_id) return publicIntent(row);
  if (!row.provider_request_number) {
    throw Object.assign(new Error('A cobrança ainda não tem identificador do gateway e exige conciliação manual.'), { statusCode: 409, code: 'PAYMENT_RECONCILIATION_REQUIRED' });
  }

  const remote = await providerRequest<ProviderResponse>(
    `/api/consult-transaction?request_number=${encodeURIComponent(row.provider_request_number)}`
  );
  const remoteStatus = String(remote.status || '').toLowerCase();
  if (remoteStatus === 'confirmed') {
    if (remote.amount === undefined || Math.round(Number(remote.amount) * 100) !== row.amount_cents) {
      throw Object.assign(new Error('Valor da transação não corresponde à cobrança TakeMaster.'), { statusCode: 409, code: 'VENOPAG_AMOUNT_MISMATCH' });
    }
    if (remote.request_number && remote.request_number !== row.provider_request_number) {
      throw Object.assign(new Error('Identificador da transação não corresponde à cobrança original.'), { statusCode: 409, code: 'VENOPAG_TRANSACTION_MISMATCH' });
    }
  }

  const finalized = await getDb().rpc('finalize_venopag_payment', {
    p_intent_id: row.id,
    p_provider_status: remoteStatus,
    p_transaction_id: remote.transaction_id || row.provider_transaction_id,
    p_provider_payload: {
      provider: 'venopag',
      request_number: row.provider_request_number,
      status: remoteStatus,
      transaction_id: remote.transaction_id || row.provider_transaction_id,
      updated_at: remote.updated_at || null,
    },
  });
  if (finalized.error) throw new Error(finalized.error.message);
  const updated = await readIntent(id, organizationId, createdBy);
  if (!updated) throw new Error('Cobrança desapareceu após a conciliação.');
  return publicIntent(updated);
}

export function verifyVenoPagWebhook(signature: string, rawBody: Buffer): boolean {
  let config: ReturnType<typeof getConfig>;
  try { config = getConfig(); } catch { return false; }
  const match = signature.match(/(?:^|,)\s*t=(\d+),v1=([a-f0-9]{64})(?:,|$)/i);
  if (!match) return false;
  const timestamp = Number(match[1]);
  if (!Number.isSafeInteger(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > 300) return false;
  const expected = createHmac('sha256', config.webhookSecret)
    .update(`${match[1]}.`)
    .update(rawBody)
    .digest();
  const received = Buffer.from(match[2], 'hex');
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export async function handleVenoPagWebhook(payload: any) {
  const requestNumber = typeof payload?.request_number === 'string' ? payload.request_number : '';
  const eventStatus = typeof payload?.status === 'string' ? payload.status.toLowerCase() : '';
  const transactionId = typeof payload?.transaction_id === 'string' ? payload.transaction_id : null;
  if (!requestNumber || !eventStatus) {
    throw Object.assign(new Error('Payload do webhook sem request_number/status.'), { statusCode: 400, code: 'INVALID_WEBHOOK_PAYLOAD' });
  }

  const found = await getDb().from('program_payment_intents').select('*')
    .eq('provider_request_number', requestNumber).maybeSingle();
  if (found.error) throw new Error(found.error.message);
  if (!found.data) {
    throw Object.assign(new Error('Cobrança não reconhecida.'), { statusCode: 404, code: 'UNKNOWN_PROVIDER_TRANSACTION' });
  }
  const intent = found.data as IntentRow;

  let authoritativeStatus = eventStatus;
  let authoritativeTransactionId = transactionId || intent.provider_transaction_id;
  if (eventStatus === 'confirmed') {
    const remote = await providerRequest<ProviderResponse>(
      `/api/consult-transaction?request_number=${encodeURIComponent(requestNumber)}`
    );
    if (String(remote.status || '').toLowerCase() !== 'confirmed') {
      throw Object.assign(new Error('O estado consultado no VenoPag ainda não confirma o pagamento.'), { statusCode: 503, code: 'VENOPAG_STATUS_NOT_CONFIRMED' });
    }
    if (remote.amount === undefined || Math.round(Number(remote.amount) * 100) !== intent.amount_cents) {
      throw Object.assign(new Error('Valor da transação não corresponde à cobrança TakeMaster.'), { statusCode: 409, code: 'VENOPAG_AMOUNT_MISMATCH' });
    }
    if (remote.request_number && remote.request_number !== requestNumber) {
      throw Object.assign(new Error('Identificador da transação não corresponde à cobrança original.'), { statusCode: 409, code: 'VENOPAG_TRANSACTION_MISMATCH' });
    }
    authoritativeStatus = String(remote.status).toLowerCase();
    authoritativeTransactionId = remote.transaction_id || authoritativeTransactionId;
  }

  const finalized = await getDb().rpc('finalize_venopag_payment', {
    p_intent_id: intent.id,
    p_provider_status: authoritativeStatus,
    p_transaction_id: authoritativeTransactionId,
    p_provider_payload: {
      provider: 'venopag',
      request_number: requestNumber,
      status: authoritativeStatus,
      transaction_id: authoritativeTransactionId,
      updated_at: payload?.updated_at || null,
    },
  });
  if (finalized.error) throw new Error(finalized.error.message);
  return finalized.data;
}
