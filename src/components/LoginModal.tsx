import React, { useState, useEffect } from 'react';
import {
  AuthSession,
  Organization,
  PaymentMethodType,
  SaaSRegistrationPayload,
  ShowFormat,
  SubscriptionPlanId,
  User,
} from '../types';
import { api } from '../services/api';
import {
  X,
  ShieldCheck,
  UserCheck,
  Building2,
  LogIn,
  CheckCircle2,
  Tv,
  KeyRound,
  Lock,
  UserPlus,
  CreditCard,
  Sparkles,
} from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  session?: AuthSession | null;
  currentSession?: AuthSession | null;
  availableUsers: User[];
  allShows?: any[];
  availableOrganizations?: Organization[];
  onLogin: (emailOrUserId: string, loginCode?: string, maybeCode?: string) => Promise<void>;
  onRegister?: (payload: SaaSRegistrationPayload) => Promise<void>;
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Direção Geral (Admin Master)',
  admin: 'Admin Executivo',
  producer: 'Produção Executiva',
  editor: 'Editoria de Roteiro',
  director: 'Direção de Estúdio',
  host: 'Apresentação / Host',
  viewer: 'Visualizador Convidado',
};

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  session,
  currentSession: currentSessionProp,
  availableUsers,
  onLogin,
  onRegister,
}) => {
  const currentSession = session ?? currentSessionProp ?? null;
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [emailInput, setEmailInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [selectedOrgId] = useState(
    currentSession?.activeOrganization.id || 'org-takemaster-studio'
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Registration + Payer Onboarding State
  const [kbPrograms, setKbPrograms] = useState<
    {
      slug: string;
      nome: string;
      apresentador: string;
      descricao: string;
      hasMediaKitHtml: boolean;
      secoesCount: number;
    }[]
  >([]);
  const [regForm, setRegForm] = useState<SaaSRegistrationPayload>({
    name: '',
    email: '',
    loginCode: 'rsplay123',
    jobTitle: 'Produtor Executivo',
    role: 'producer',
    showMode: 'knowledge_base',
    knowledgeBaseSlug: 'advogada-do-leque',
    newShowTitle: '',
    newShowHost: '',
    newShowFormat: 'Entrevista',
    planId: 'rsplay_studio_pro',
    paymentMethodType: 'credit_card',
    paymentMethodBrand: 'Visa Corporate',
    paymentMethodLast4: '4829',
    autoRenew: true,
  });

  useEffect(() => {
    if (isOpen) {
      api
        .listKnowledgeBasePrograms()
        .then((list) => setKbPrograms(list))
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleQuickProfileLogin = async (user: User) => {
    setError(null);
    setSubmitting(true);
    try {
      await onLogin(user.email, selectedOrgId, user.loginCode || 'rsplay123');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Falha ao autenticar perfil do programa.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setError(null);
    setSubmitting(true);
    try {
      await onLogin(emailInput.trim(), selectedOrgId, codeInput.trim() || undefined);
      setEmailInput('');
      setCodeInput('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Credencial inválida ou sem permissão de programa.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regForm.name.trim() || !regForm.email.trim()) {
      setError('Informe seu nome completo e e-mail corporativo.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      if (onRegister) {
        await onRegister(regForm);
      } else {
        const res = await api.registerAccount({
          ...regForm,
          organizationId: selectedOrgId,
        });
        await onLogin(res.user.email, selectedOrgId, regForm.loginCode);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Falha ao concluir o primeiro cadastro e conexão com o gateway.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-100">
                Acesso por Programa & Onboarding Pagante — RSPlay TV SaaS
              </h2>
              <p className="text-xs text-zinc-400">
                Cada login possui escopo isolado de programas ou você pode realizar seu primeiro cadastro conectado ao gateway
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  setError(null);
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'login'
                    ? 'bg-amber-500 text-zinc-950'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                Entrar
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('register');
                  setError(null);
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'register'
                    ? 'bg-amber-500 text-zinc-950'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                Primeiro Cadastro + Pagante
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6 max-h-[82vh] overflow-y-auto">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-medium">
              {error}
            </div>
          )}

          {activeTab === 'login' ? (
            <>
              {/* Program-Scoped Logins Grid */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Credenciais por Programa Cadastradas na Emissora
                  </label>
                  <span className="text-[11px] text-amber-400 font-medium flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Isolamento de Conteúdo por Programa Ativo
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {availableUsers.map((u) => {
                    const isCurrent = currentSession?.user.id === u.id;
                    const isAdmin = u.role === 'owner' || u.role === 'admin';
                    const allowedTitles =
                      u.showPermissions
                        ?.filter((p) => p.canView)
                        .map((p) => p.showTitle || p.showId) || [];

                    return (
                      <div
                        key={u.id}
                        className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                          isCurrent
                            ? 'bg-amber-500/10 border-amber-500/40'
                            : 'bg-zinc-900/70 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm text-zinc-100 truncate">
                                  {u.name}
                                </span>
                                {isCurrent && (
                                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                    Sessão Ativa
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-zinc-400 truncate">{u.email}</div>
                            </div>

                            <span
                              className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border shrink-0 ${
                                isAdmin
                                  ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                                  : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                              }`}
                            >
                              {ROLE_LABELS[u.role || 'producer'] || u.role}
                            </span>
                          </div>

                          {/* Allowed Programs List */}
                          <div className="pt-1 border-t border-zinc-800/80 space-y-1">
                            <div className="text-[11px] text-zinc-500 flex items-center gap-1.5">
                              <Tv className="w-3.5 h-3.5 text-amber-400" />
                              <span>Conteúdos Liberados para este Login:</span>
                            </div>
                            {isAdmin ? (
                              <div className="text-xs text-emerald-300 font-medium">
                                Acesso Total Master (Todos os Programas + Painel Admin & Faturamento)
                              </div>
                            ) : allowedTitles.length > 0 ? (
                              <div className="text-xs text-amber-300 font-medium">
                                Somente: {allowedTitles.join(' · ')}
                              </div>
                            ) : (
                              <div className="text-xs text-zinc-500">
                                Nenhum programa vinculado no momento
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60">
                          <span className="text-[11px] text-zinc-500 font-mono">
                            Código: {u.loginCode || 'rsplay123'}
                          </span>
                          <button
                            type="button"
                            disabled={submitting || isCurrent}
                            onClick={() => handleQuickProfileLogin(u)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                              isCurrent
                                ? 'bg-emerald-500/20 text-emerald-300 cursor-default'
                                : 'bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold'
                            }`}
                          >
                            {isCurrent ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Conectado</span>
                              </>
                            ) : (
                              <>
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Entrar neste Login</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Manual Credentials Form */}
              <form
                onSubmit={handleManualSubmit}
                className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-4"
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <span>Autenticação Manual por Credencial de Programa</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-xs text-zinc-400 mb-1">
                      E-mail Corporativo ou ID do Login
                    </label>
                    <input
                      type="text"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="ex: rafael.mendes@rsplaytv.com.br"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">
                      Senha / Código de Acesso
                    </label>
                    <input
                      type="password"
                      value={codeInput}
                      onChange={(e) => setCodeInput(e.target.value)}
                      placeholder="ex: poder123"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Validação de sessão HMAC-SHA256 e filtro relacional no backend</span>
                  </div>
                  <button
                    type="submit"
                    disabled={submitting || !emailInput.trim()}
                    className="px-4 py-2 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Autenticar Credencial</span>
                  </button>
                </div>
              </form>
            </>
          ) : (
            /* ================= PRIMEIRO CADASTRO + CONEXÃO DO PAGANTE ================= */
            <form onSubmit={handleRegisterSubmit} className="space-y-5">
              {/* Step 1: Dados do Produtor / Usuário */}
              <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
                  <UserPlus className="w-4 h-4" />
                  <span>1. Dados do Titular / Produtor do Programa</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Nome Completo *</label>
                    <input
                      type="text"
                      required
                      value={regForm.name}
                      onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                      placeholder="Ex: Taise Vielmo Côrtes"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">E-mail Corporativo *</label>
                    <input
                      type="email"
                      required
                      value={regForm.email}
                      onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                      placeholder="Ex: taise@rsplaytv.com.br"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">
                      Código / Senha de Acesso
                    </label>
                    <input
                      type="text"
                      value={regForm.loginCode}
                      onChange={(e) => setRegForm({ ...regForm, loginCode: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Cargo / Papel</label>
                    <input
                      type="text"
                      value={regForm.jobTitle || ''}
                      onChange={(e) => setRegForm({ ...regForm, jobTitle: e.target.value })}
                      placeholder="Apresentadora & Direção Editorial"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100"
                    />
                  </div>
                </div>
              </div>

              {/* Step 2: Escolha ou Criação do Programa no Primeiro Cadastro */}
              <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
                    <Tv className="w-4 h-4" />
                    <span>2. Programa Vinculado no Primeiro Cadastro</span>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setRegForm({ ...regForm, showMode: 'knowledge_base' })}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                        regForm.showMode === 'knowledge_base'
                          ? 'bg-amber-500 text-zinc-950'
                          : 'bg-zinc-950 text-zinc-400 border border-zinc-800'
                      }`}
                    >
                      Base Oficial RS Play
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegForm({ ...regForm, showMode: 'new' })}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                        regForm.showMode === 'new'
                          ? 'bg-amber-500 text-zinc-950'
                          : 'bg-zinc-950 text-zinc-400 border border-zinc-800'
                      }`}
                    >
                      Novo Programa Autoral
                    </button>
                  </div>
                </div>

                {regForm.showMode === 'knowledge_base' ? (
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">
                      Selecione seu programa na Base de Conhecimento RS Play (Mídia Kit sincronizado)
                    </label>
                    <select
                      value={regForm.knowledgeBaseSlug || 'advogada-do-leque'}
                      onChange={(e) =>
                        setRegForm({ ...regForm, knowledgeBaseSlug: e.target.value })
                      }
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100"
                    >
                      {kbPrograms.map((kb) => (
                        <option key={kb.slug} value={kb.slug}>
                          {kb.nome}{' '}
                          {kb.hasMediaKitHtml
                            ? `— Mídia Kit Completo (${kb.secoesCount} seções)`
                            : '— Catálogo RS Play'}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">
                        Título do Novo Programa *
                      </label>
                      <input
                        type="text"
                        value={regForm.newShowTitle || ''}
                        onChange={(e) => setRegForm({ ...regForm, newShowTitle: e.target.value })}
                        placeholder="Ex: Conexão Jurídica"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Apresentador(a)</label>
                      <input
                        type="text"
                        value={regForm.newShowHost || ''}
                        onChange={(e) => setRegForm({ ...regForm, newShowHost: e.target.value })}
                        placeholder="Nome do Host"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Formato</label>
                      <select
                        value={regForm.newShowFormat || 'Entrevista'}
                        onChange={(e) =>
                          setRegForm({ ...regForm, newShowFormat: e.target.value as ShowFormat })
                        }
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100"
                      >
                        <option value="Entrevista">Entrevista</option>
                        <option value="Podcast/Videocast">Podcast/Videocast</option>
                        <option value="Mesa Redonda">Mesa Redonda</option>
                        <option value="Debate">Debate</option>
                        <option value="Programa Solo">Programa Solo</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 3: Conexão com Pagante & Plano Mensal Recorrente */}
              <div className="p-4 rounded-xl bg-zinc-900/70 border border-amber-500/30 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
                  <CreditCard className="w-4 h-4" />
                  <span>3. Conexão do Pagante & Plano Mensal Recorrente (Gateway RSPlay Pay)</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Plano SaaS Mensal</label>
                    <select
                      value={regForm.planId}
                      onChange={(e) =>
                        setRegForm({
                          ...regForm,
                          planId: e.target.value as SubscriptionPlanId,
                        })
                      }
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100"
                    >
                      <option value="rsplay_programa_individual">
                        Starter Programa Individual (R$ 490/mês)
                      </option>
                      <option value="rsplay_studio_pro">Pro Multi-Programa & IA (R$ 1.290/mês)</option>
                      <option value="rsplay_broadcast_enterprise">
                        Network Emissora Full (R$ 2.890/mês)
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Método do Pagante</label>
                    <select
                      value={regForm.paymentMethodType}
                      onChange={(e) =>
                        setRegForm({
                          ...regForm,
                          paymentMethodType: e.target.value as PaymentMethodType,
                        })
                      }
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100"
                    >
                      <option value="credit_card">Cartão de Crédito Recorrente</option>
                      <option value="pix_automatico">PIX Automático Banco Central</option>
                      <option value="boleto_corporativo">Boleto Faturado Corporativo</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">
                      Final do Cartão / Identificador
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      value={regForm.paymentMethodLast4 || '4829'}
                      onChange={(e) =>
                        setRegForm({ ...regForm, paymentMethodLast4: e.target.value })
                      }
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-zinc-400">
                  Cria a conta, libera o programa escolhido e emite a 1ª fatura paga no gateway.
                </span>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {submitting
                      ? 'Conectando Pagante e Criando Acesso...'
                      : 'Concluir Cadastro & Ativar Assinatura'}
                  </span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
