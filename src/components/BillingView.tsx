import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Copy, Loader2, RefreshCw, ShieldCheck, TriangleAlert, Wallet } from 'lucide-react';
import { AuthSession, SaaSPlanDefinition, Show, SubscriptionPlanId } from '../types';
import { api, VenoPagPixIntent } from '../services/api';

interface BillingViewProps {
  session: AuthSession | null;
  shows: Show[];
  onSubscriptionUpdated: () => Promise<void>;
}

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('pt-BR');
}

function statusLabel(status: VenoPagPixIntent['status']): string {
  const labels: Record<VenoPagPixIntent['status'], string> = {
    creating: 'Criando cobrança',
    pending: 'Aguardando pagamento',
    confirmed: 'Pagamento confirmado',
    expired: 'Cobrança expirada',
    canceled: 'Cobrança cancelada',
    contested: 'Pagamento contestado',
    chargedback: 'Pagamento contestado pelo banco',
    refunded: 'Pagamento estornado',
    failed: 'Falha na cobrança',
    reconciliation_required: 'Conciliação necessária',
  };
  return labels[status] || status;
}

function qrImageSource(value?: string | null): string | null {
  if (!value) return null;
  if (value.startsWith('data:') || /^https?:\/\//i.test(value)) return value;
  return `data:image/png;base64,${value}`;
}

export const BillingView: React.FC<BillingViewProps> = ({ session, shows, onSubscriptionUpdated }) => {
  const [plans, setPlans] = useState<SaaSPlanDefinition[]>([]);
  const [billablePrograms, setBillablePrograms] = useState<Array<{ id: string; title: string }>>([]);
  const [intents, setIntents] = useState<VenoPagPixIntent[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<SaaSPlanDefinition | null>(null);
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [activeIntent, setActiveIntent] = useState<VenoPagPixIntent | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [overview, history, eligible] = await Promise.all([
        api.getBillingOverview(),
        api.listVenoPagPixCheckouts(),
        api.getBillablePrograms(),
      ]);
      setPlans(overview.plans);
      setBillablePrograms(eligible.programs);
      setIntents(history.intents);
    } catch (error: any) {
      setFeedback({ type: 'error', text: error?.message || 'Não foi possível carregar os dados de contratação.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);
  useEffect(() => {
    if (!selectedProgramId && billablePrograms[0]?.id) setSelectedProgramId(billablePrograms[0].id);
  }, [billablePrograms, selectedProgramId]);

  const startCheckout = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedPlan || !selectedProgramId) {
      setFeedback({ type: 'error', text: 'Selecione o programa e o plano antes de continuar.' });
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      const result = await api.createVenoPagPixCheckout({
        programId: selectedProgramId,
        planCode: selectedPlan.id as SubscriptionPlanId,
        idempotencyKey: globalThis.crypto.randomUUID(),
        customerName: session?.user?.name,
      });
      setActiveIntent(result.intent);
      setSelectedPlan(null);
      await loadData();
      setFeedback({
        type: result.intent.status === 'pending' ? 'info' : 'success',
        text: result.intent.status === 'pending'
          ? 'Cobrança PIX criada. A contratação só será ativada após a confirmação do pagamento.'
          : statusLabel(result.intent.status),
      });
    } catch (error: any) {
      setFeedback({ type: 'error', text: error?.message || 'Não foi possível criar a cobrança PIX.' });
    } finally {
      setBusy(false);
    }
  };

  const verifyPayment = async (intent: VenoPagPixIntent) => {
    setBusy(true);
    setFeedback(null);
    try {
      const result = await api.verifyVenoPagPixCheckout(intent.id);
      setActiveIntent(result.intent);
      await loadData();
      if (result.intent.status === 'confirmed') {
        await onSubscriptionUpdated();
        setFeedback({ type: 'success', text: 'Pagamento confirmado pelo VenoPag e assinatura vinculada ao programa.' });
      } else {
        setFeedback({ type: 'info', text: statusLabel(result.intent.status) });
      }
    } catch (error: any) {
      setFeedback({ type: 'error', text: error?.message || 'Não foi possível conciliar o pagamento.' });
    } finally {
      setBusy(false);
    }
  };

  const copyPix = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setFeedback({ type: 'success', text: 'Código PIX copiado.' });
    } catch {
      setFeedback({ type: 'error', text: 'Não foi possível copiar automaticamente. Selecione e copie o código PIX.' });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center gap-3 p-12 text-zinc-400"><Loader2 className="h-5 w-5 animate-spin" />Carregando contratação e pagamentos...</div>;
  }

  const activeProgramTitle = billablePrograms.find((program) => program.id === (activeIntent?.programId || selectedProgramId))?.title
    || shows.find((show) => show.id === (activeIntent?.programId || selectedProgramId))?.title;
  const qrSrc = qrImageSource(activeIntent?.qrImage);

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6 lg:p-8">
      <header className="flex flex-col justify-between gap-4 border-b border-zinc-800 pb-6 md:flex-row md:items-center">
        <div>
          <p className="mb-1 text-xs font-medium text-emerald-400">RS Play TV · VenoPag</p>
          <h1 className="text-2xl font-bold text-zinc-100">Contratação de programas</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400">Contrate o plano do programa e pague via PIX. A ativação ocorre somente após confirmação verificável do gateway.</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-300">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span>PIX · Confirmação server-side</span>
        </div>
      </header>

      {feedback && (
        <div className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${feedback.type === 'success' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : feedback.type === 'error' ? 'border-red-500/30 bg-red-500/10 text-red-200' : 'border-sky-500/30 bg-sky-500/10 text-sky-100'}`}>
          {feedback.type === 'error' ? <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
          <span>{feedback.text}</span>
        </div>
      )}

      {billablePrograms.length === 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          Nenhum programa disponível para contratação nesta conta. Conclua primeiro a seleção e configuração do programa.
        </div>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-zinc-100">Planos disponíveis</h2>
          <button onClick={() => void loadData()} className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-900">
            <RefreshCw className="h-3.5 w-3.5" />Atualizar
          </button>
        </div>
        {plans.length === 0 && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
            A contratação está temporariamente indisponível porque não há plano ativo com preço positivo configurado. Defina o preço comercial antes de habilitar cobranças reais.
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => (
            <article key={plan.id} className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
              <div className="flex-1 space-y-3">
                <h3 className="font-semibold text-zinc-100">{plan.name}</h3>
                <p className="text-sm text-zinc-400">{plan.tagline}</p>
                <p className="text-2xl font-bold text-zinc-100">{formatBRL(plan.monthlyPriceCents)}<span className="ml-1 text-xs font-normal text-zinc-400">valor da contratação</span></p>
                <ul className="space-y-2 pt-2">
                  {plan.features.map((feature, index) => <li key={index} className="flex gap-2 text-xs text-zinc-300"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />{feature}</li>)}
                </ul>
              </div>
              <button
                type="button"
                disabled={billablePrograms.length === 0 || busy}
                onClick={() => { setSelectedProgramId(billablePrograms[0]?.id || ''); setSelectedPlan(plan); }}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Wallet className="h-4 w-4" />Contratar via PIX
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-zinc-100">Cobranças recentes</h2>
        {intents.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 p-5 text-sm text-zinc-400">Nenhuma cobrança VenoPag registrada nesta organização.</div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-zinc-800">
            {intents.map((intent) => (
              <div key={intent.id} className="flex flex-col gap-3 border-b border-zinc-800 p-4 last:border-b-0 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="font-medium text-zinc-100">{shows.find((show) => show.id === intent.programId)?.title || 'Programa contratado'}</div>
                  <div className="mt-1 text-xs text-zinc-500">{formatDate(intent.createdAt)} · Referência: {intent.requestNumber || intent.id}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-semibold text-zinc-100">{formatBRL(intent.amountCents)}</div>
                    <div className={`text-xs ${intent.status === 'confirmed' ? 'text-emerald-400' : intent.status === 'reconciliation_required' ? 'text-amber-300' : 'text-zinc-400'}`}>{statusLabel(intent.status)}</div>
                  </div>
                  {intent.status !== 'confirmed' && (
                    <button disabled={busy || !intent.requestNumber} onClick={() => void verifyPayment(intent)} className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-800 disabled:opacity-40">Verificar</button>
                  )}
                  {(intent.pixCopyPaste || intent.qrUrl || intent.qrImage || intent.checkoutUrl) && intent.status === 'pending' && (
                    <button onClick={() => setActiveIntent(intent)} className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-800">Abrir PIX</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <form onSubmit={startCheckout} className="w-full max-w-lg space-y-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
            <div>
              <p className="text-xs font-medium text-emerald-400">Checkout VenoPag · PIX</p>
              <h3 className="mt-1 text-xl font-bold text-zinc-100">{selectedPlan.name}</h3>
              <p className="mt-1 text-sm text-zinc-400">{formatBRL(selectedPlan.monthlyPriceCents)} · pagamento PIX avulso</p>
            </div>
            <label className="block space-y-2 text-sm text-zinc-300">
              <span>Programa</span>
              <select value={selectedProgramId} onChange={(event) => setSelectedProgramId(event.target.value)} required className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-3 text-zinc-100">
                {billablePrograms.map((program) => <option key={program.id} value={program.id}>{program.title}</option>)}
              </select>
            </label>
            <p className="text-xs leading-relaxed text-zinc-500">A cobrança será vinculada ao programa selecionado. A assinatura não será ativada até o VenoPag confirmar o pagamento. O PIX desta primeira integração é uma cobrança avulsa; renovação automática não está habilitada.</p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setSelectedPlan(null)} className="rounded-lg border border-zinc-700 px-4 py-2.5 text-sm text-zinc-300">Cancelar</button>
              <button type="submit" disabled={busy || !selectedProgramId} className="rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 disabled:opacity-50">{busy ? 'Criando cobrança…' : 'Gerar cobrança PIX'}</button>
            </div>
          </form>
        </div>
      )}

      {activeIntent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-lg space-y-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-emerald-400">VenoPag · Cobrança PIX</p>
                <h3 className="mt-1 text-xl font-bold text-zinc-100">{activeProgramTitle || 'Pagamento do programa'}</h3>
                <p className="mt-1 text-sm text-zinc-400">{formatBRL(activeIntent.amountCents)} · {statusLabel(activeIntent.status)}</p>
              </div>
              <button onClick={() => setActiveIntent(null)} className="text-sm text-zinc-400 hover:text-white">Fechar</button>
            </div>
            {qrSrc && <div className="flex justify-center rounded-xl bg-white p-4"><img src={qrSrc} alt="QR Code PIX" className="max-h-64 max-w-full object-contain" /></div>}
            {activeIntent.checkoutUrl && <a href={activeIntent.checkoutUrl} target="_blank" rel="noreferrer" className="block text-center text-sm text-emerald-300 underline">Abrir checkout do VenoPag</a>}
            {activeIntent.pixCopyPaste && (
              <div className="space-y-2">
                <label className="text-xs text-zinc-400">PIX copia e cola</label>
                <textarea readOnly value={activeIntent.pixCopyPaste} rows={4} className="w-full resize-y rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-xs text-zinc-100" />
                <button onClick={() => void copyPix(activeIntent.pixCopyPaste!)} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-700 px-3 py-2.5 text-sm text-zinc-100 hover:bg-zinc-900"><Copy className="h-4 w-4" />Copiar código PIX</button>
              </div>
            )}
            <button disabled={busy || !activeIntent.requestNumber} onClick={() => void verifyPayment(activeIntent)} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold text-zinc-950 disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Verificar pagamento
            </button>
            {activeIntent.status === 'reconciliation_required' && <p className="text-xs text-amber-300">Esta tentativa não será recriada automaticamente para evitar cobrança duplicada. É necessária conciliação administrativa.</p>}
          </div>
        </div>
      )}
    </div>
  );
};
