import React, { useEffect, useState } from 'react';
import {
  CreditCard,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Receipt,
  Webhook,
  Sparkles,
  Calendar,
  Building2,
  Tv,
  ArrowUpRight,
  Loader2,
} from 'lucide-react';
import {
  AuthSession,
  BillingInvoice,
  PaymentGatewayEvent,
  PaymentMethodType,
  SaaSPlanDefinition,
  SaaSSubscription,
  Show,
  SubscriptionPlanId,
} from '../types';
import { api } from '../services/api';

interface BillingViewProps {
  session: AuthSession | null;
  shows: Show[];
  onSubscriptionUpdated: () => Promise<void>;
}

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function formatDateBR(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return iso.slice(0, 10);
  }
}

export const BillingView: React.FC<BillingViewProps> = ({
  shows,
  onSubscriptionUpdated,
}) => {
  const [plans, setPlans] = useState<SaaSPlanDefinition[]>([]);
  const [subscriptions, setSubscriptions] = useState<SaaSSubscription[]>([]);
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [gatewayEvents, setGatewayEvents] = useState<PaymentGatewayEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  // Checkout Modal State
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] =
    useState<SaaSPlanDefinition | null>(null);
  const [checkoutMethod, setCheckoutMethod] = useState<PaymentMethodType>('credit_card');
  const [checkoutCardLast4, setCheckoutCardLast4] = useState('4829');
  const [checkoutCardBrand, setCheckoutCardBrand] = useState('Mastercard Black Corporativo');
  const [checkoutShowId, setCheckoutShowId] = useState<string>('');
  const [checkoutAutoRenew, setCheckoutAutoRenew] = useState(true);

  const loadBilling = async () => {
    setLoading(true);
    try {
      const data = await api.getBillingOverview();
      setPlans(data.plans);
      setSubscriptions(data.subscriptions);
      setInvoices(data.invoices);
      setGatewayEvents(data.gatewayEvents);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Erro ao carregar dados de assinatura e gateway.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBilling();
  }, []);

  const primarySubscription = subscriptions[0] || null;

  const handleToggleAutoRenew = async (sub: SaaSSubscription) => {
    setActionLoading(`autorenew-${sub.id}`);
    setFeedback(null);
    try {
      await api.toggleAutoRenew(sub.id, !sub.autoRenew);
      await loadBilling();
      await onSubscriptionUpdated();
      setFeedback({
        type: 'success',
        text: !sub.autoRenew
          ? 'Renovação automática mensal ativada no gateway RSPlay Pay / Stripe.'
          : 'Renovação automática mensal pausada para o próximo ciclo.',
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Falha ao atualizar renovação automática.',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleProcessRenewalNow = async (sub: SaaSSubscription, simulateFailure = false) => {
    setActionLoading(simulateFailure ? `fail-${sub.id}` : `renew-${sub.id}`);
    setFeedback(null);
    try {
      const res = await api.renewSubscriptionNow(sub.id, simulateFailure);
      await loadBilling();
      await onSubscriptionUpdated();
      setFeedback({
        type: simulateFailure ? 'error' : 'success',
        text: simulateFailure
          ? `Webhook de falha processado (${res.invoice.invoiceNumber}): assinatura marcada como Pendente (past_due) e retentativa automática agendada.`
          : `Renovação automática processada com sucesso via Gateway (${res.invoice.invoiceNumber})! Novo ciclo vigente até ${formatDateBR(res.subscription.currentPeriodEnd)}.`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Erro ao processar ciclo de renovação no gateway.',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanForCheckout) return;
    setActionLoading('checkout');
    setFeedback(null);
    try {
      const res = await api.subscribePlan({
        planId: selectedPlanForCheckout.id as SubscriptionPlanId,
        showId: checkoutShowId || undefined,
        paymentMethodType: checkoutMethod,
        paymentMethodLast4:
          checkoutMethod === 'pix_automatico'
            ? 'PIX'
            : checkoutMethod === 'boleto_corporativo'
            ? 'BOL'
            : checkoutCardLast4 || '4829',
        paymentMethodBrand:
          checkoutMethod === 'pix_automatico'
            ? 'PIX Automático Banco Central'
            : checkoutMethod === 'boleto_corporativo'
            ? 'Boleto Corporativo Registrado'
            : checkoutCardBrand || 'Mastercard Corporativo',
        autoRenew: checkoutAutoRenew,
      });
      setSelectedPlanForCheckout(null);
      await loadBilling();
      await onSubscriptionUpdated();
      setFeedback({
        type: 'success',
        text: `Plano "${res.subscription.planName}" contratado com sucesso! Fatura ${res.invoice.invoiceNumber} liquidada no gateway.`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Falha ao contratar plano mensal no gateway.',
      });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center gap-3 text-zinc-400">
        <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
        <span className="text-sm">Sincronizando planos e gateway RSPlay Pay...</span>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <div className="text-xs text-amber-400 font-medium mb-1">
            RSPlay TV SaaS · Faturamento Recorrente & Gateway de Pagamentos
          </div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">
            Assinatura Mensal, Planos & Renovação Automática
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Gerencie o plano mensal de cada programa ou grade, método de pagamento, faturas e webhooks de renovação automática.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-right">
            <div className="text-[11px] text-zinc-400">Gateway Conectado</div>
            <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>RSPlay Pay / Stripe Billing Ativo</span>
            </div>
          </div>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-sm ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
              : 'bg-red-500/10 border-red-500/30 text-red-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Active Subscription & Gateway Auto-Renewal Control Card */}
      {primarySubscription && (
        <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-6 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 text-xs text-zinc-400">
                <span>Assinatura Vigente</span>
                <span>·</span>
                <span className="font-mono">{primarySubscription.gatewaySubscriptionId}</span>
                <span>·</span>
                <span
                  className={
                    primarySubscription.status === 'active'
                      ? 'text-emerald-400 font-semibold'
                      : 'text-amber-400 font-semibold'
                  }
                >
                  {primarySubscription.status === 'active'
                    ? 'Ativa & Em Dia'
                    : 'Atenção: Pagamento Pendente (past_due)'}
                </span>
              </div>
              <h2 className="text-xl font-bold text-zinc-100">
                {primarySubscription.planName}
              </h2>
              <div className="text-xs text-zinc-400 flex flex-wrap items-center gap-2 pt-0.5">
                <Building2 className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  Escopo:{' '}
                  {primarySubscription.showTitle
                    ? `Programa Individual (${primarySubscription.showTitle})`
                    : 'Grade Completa da Organização RSPlay TV'}
                </span>
                <span>·</span>
                <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                <span className="font-mono tabular-nums">
                  Ciclo atual: {formatDateBR(primarySubscription.currentPeriodStart)} até{' '}
                  {formatDateBR(primarySubscription.currentPeriodEnd)}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="text-right">
                <div className="text-xs text-zinc-400">Valor Mensal Recorrente</div>
                <div className="text-2xl font-bold text-zinc-100 font-mono tabular-nums">
                  {formatBRL(primarySubscription.amountCents)}
                  <span className="text-xs font-normal text-zinc-400">/mês</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Payment Method */}
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/90 space-y-1.5">
              <div className="text-xs text-zinc-400 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                <span>Método Integrado no Gateway</span>
              </div>
              <div className="text-sm font-semibold text-zinc-100">
                {primarySubscription.paymentMethodBrand}
              </div>
              <div className="text-xs text-zinc-400 font-mono">
                {primarySubscription.paymentMethodType === 'credit_card'
                  ? `Final •••• ${primarySubscription.paymentMethodLast4}`
                  : primarySubscription.paymentMethodType === 'pix_automatico'
                  ? 'Débito Automático via PIX Recorrente'
                  : 'Faturamento Boleto Corporativo'}
              </div>
            </div>

            {/* Automatic Renewal Toggle */}
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/90 flex flex-col justify-between gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">Renovação Automática Mensal</span>
                <span
                  className={`text-xs font-semibold ${
                    primarySubscription.autoRenew ? 'text-emerald-400' : 'text-zinc-500'
                  }`}
                >
                  {primarySubscription.autoRenew ? 'Habilitada' : 'Desativada'}
                </span>
              </div>
              <p className="text-xs text-zinc-500">
                Cobrança recorrente automática no vencimento sem interrupção do estúdio.
              </p>
              <button
                type="button"
                disabled={actionLoading === `autorenew-${primarySubscription.id}`}
                onClick={() => handleToggleAutoRenew(primarySubscription)}
                className="mt-1 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-medium text-zinc-200 transition-colors cursor-pointer whitespace-nowrap self-start"
              >
                {primarySubscription.autoRenew
                  ? 'Pausar Renovação Automática'
                  : 'Ativar Renovação Automática'}
              </button>
            </div>

            {/* Gateway Webhook Actions */}
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/90 flex flex-col justify-between gap-2">
              <div className="text-xs text-zinc-400 flex items-center gap-1.5">
                <Webhook className="w-3.5 h-3.5 text-amber-400" />
                <span>Motor de Renovação do Gateway</span>
              </div>
              <p className="text-xs text-zinc-500">
                Dispare o ciclo mensal automático para gerar fatura e estender a vigência em +30 dias.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={Boolean(actionLoading)}
                  onClick={() => handleProcessRenewalNow(primarySubscription, false)}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${
                      actionLoading === `renew-${primarySubscription.id}` ? 'animate-spin' : ''
                    }`}
                  />
                  <span>Renovar Ciclo (+30d)</span>
                </button>
                <button
                  type="button"
                  disabled={Boolean(actionLoading)}
                  onClick={() => handleProcessRenewalNow(primarySubscription, true)}
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-400 hover:text-red-300 transition-colors cursor-pointer whitespace-nowrap"
                  title="Simular falha de cartão no gateway (past_due)"
                >
                  Simular Falha
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Subscription Plans Grid */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">
            Planos Mensais de Assinatura RSPlay TV
          </h2>
          <p className="text-xs text-zinc-400">
            Escolha o plano ideal para um programa individual com login próprio ou para toda a grade multiprograma da emissora.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isCurrentPlan = primarySubscription?.planId === plan.id;
            return (
              <div
                key={plan.id}
                className={`rounded-2xl p-6 flex flex-col justify-between border transition-all ${
                  plan.highlighted
                    ? 'bg-zinc-900/90 border-amber-500/50'
                    : 'bg-zinc-900/40 border-zinc-800'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-base font-bold text-zinc-100">{plan.name}</h3>
                    {plan.highlighted && (
                      <span className="text-xs font-semibold text-amber-400">
                        Mais Contratado
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-zinc-400 leading-relaxed">{plan.tagline}</p>

                  <div className="pt-2 border-t border-zinc-800/80">
                    <div className="text-3xl font-bold text-zinc-100 font-mono tabular-nums">
                      {formatBRL(plan.monthlyPriceCents)}
                      <span className="text-xs font-normal text-zinc-400"> / mês</span>
                    </div>
                    <div className="text-xs text-zinc-400 mt-1 font-mono tabular-nums">
                      Limite: até {plan.maxShows === 999 ? 'Ilimitados' : plan.maxShows} programa(s) ·{' '}
                      {plan.maxUsers === 999 ? 'Ilimitados' : plan.maxUsers} logins individuais
                    </div>
                  </div>

                  <ul className="space-y-2.5 pt-2">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-zinc-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-6 mt-6 border-t border-zinc-800/80">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPlanForCheckout(plan);
                      setCheckoutShowId(shows[0]?.id || '');
                    }}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                      isCurrentPlan
                        ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                        : 'bg-amber-500 hover:bg-amber-400 text-zinc-950'
                    }`}
                  >
                    <span>
                      {isCurrentPlan
                        ? 'Atualizar Pagamento / Renovar Plano'
                        : 'Contratar Plano Mensal'}
                    </span>
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Invoices & Gateway Webhook Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Billing Invoices */}
        <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-zinc-100">
                Histórico de Faturas & Renovações ({invoices.length})
              </h3>
            </div>
            <span className="text-xs text-zinc-500 font-mono">BRL · Nota Fiscal SaaS</span>
          </div>

          <div className="divide-y divide-zinc-800/80">
            {invoices.map((inv) => (
              <div key={inv.id} className="py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs font-medium text-zinc-200">
                    <span className="font-mono text-amber-300">{inv.invoiceNumber}</span>
                    <span>·</span>
                    <span className="truncate">{inv.description}</span>
                  </div>
                  <div className="text-[11px] text-zinc-500 font-mono tabular-nums mt-0.5">
                    {formatDateBR(inv.createdAt)} · Gateway TX: {inv.gatewayTransactionId} ·{' '}
                    {inv.autoRenewalCycle ? 'Renovação Automática' : 'Contratação Direta'}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-bold text-zinc-100 font-mono tabular-nums">
                    {formatBRL(inv.amountCents)}
                  </div>
                  <div
                    className={`text-[11px] font-medium ${
                      inv.status === 'paid' ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {inv.status === 'paid' ? 'Liquidada' : 'Falha no Cartão'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Gateway Webhooks Log */}
        <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Webhook className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-zinc-100">
                Eventos do Gateway de Pagamentos (Webhooks)
              </h3>
            </div>
            <span className="text-xs text-zinc-500 font-mono">RSPlay Pay / Stripe</span>
          </div>

          <div className="divide-y divide-zinc-800/80">
            {gatewayEvents.map((ev) => (
              <div key={ev.id} className="py-3 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-semibold text-zinc-200">{ev.eventType}</span>
                  <span className="font-mono text-[11px] text-zinc-500 tabular-nums">
                    {formatDateBR(ev.createdAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span className="font-mono truncate max-w-md">
                    {JSON.stringify(ev.payload)}
                  </span>
                  <span
                    className={
                      ev.status === 'processed' ? 'text-emerald-400' : 'text-amber-400'
                    }
                  >
                    {ev.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Checkout Modal for Subscribing / Changing Monthly Plan */}
      {selectedPlanForCheckout && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <div className="text-xs text-amber-400 font-medium">
                  Checkout Gateway RSPlay Pay
                </div>
                <h3 className="text-lg font-bold text-zinc-100">
                  Contratar {selectedPlanForCheckout.name}
                </h3>
              </div>
              <div className="text-right font-mono tabular-nums">
                <div className="text-lg font-bold text-zinc-100">
                  {formatBRL(selectedPlanForCheckout.monthlyPriceCents)}
                </div>
                <div className="text-[11px] text-zinc-400">Cobrança Mensal</div>
              </div>
            </div>

            <form onSubmit={handleConfirmSubscribe} className="space-y-4">
              {selectedPlanForCheckout.id === 'rsplay_programa_individual' && shows.length > 0 && (
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    Vincular Assinatura a qual Programa da Grade?
                  </label>
                  <select
                    value={checkoutShowId}
                    onChange={(e) => setCheckoutShowId(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100"
                  >
                    {shows.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title} ({s.host})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  Método de Pagamento Recorrente
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'credit_card', label: 'Cartão de Crédito' },
                    { id: 'pix_automatico', label: 'PIX Automático' },
                    { id: 'boleto_corporativo', label: 'Boleto Corp.' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setCheckoutMethod(m.id as PaymentMethodType)}
                      className={`py-2 px-3 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                        checkoutMethod === m.id
                          ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {checkoutMethod === 'credit_card' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">
                      Bandeira / Cartão Corporativo
                    </label>
                    <input
                      type="text"
                      value={checkoutCardBrand}
                      onChange={(e) => setCheckoutCardBrand(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">
                      Últimos 4 Dígitos
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      value={checkoutCardLast4}
                      onChange={(e) => setCheckoutCardLast4(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 font-mono"
                    />
                  </div>
                </div>
              )}

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-zinc-900/70 border border-zinc-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checkoutAutoRenew}
                  onChange={(e) => setCheckoutAutoRenew(e.target.checked)}
                  className="rounded border-zinc-700 text-amber-500 focus:ring-amber-500"
                />
                <span className="text-xs text-zinc-300">
                  Habilitar renovação automática mensal via gateway de pagamentos
                </span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedPlanForCheckout(null)}
                  className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-xs text-zinc-300 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === 'checkout'}
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs cursor-pointer"
                >
                  {actionLoading === 'checkout'
                    ? 'Processando no Gateway...'
                    : 'Confirmar Assinatura Mensal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
