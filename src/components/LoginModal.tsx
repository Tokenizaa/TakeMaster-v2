import React, { useState } from 'react';
import {
  X,
  Lock,
  ShieldCheck,
  Tv,
  LogIn,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  UserCheck,
} from 'lucide-react';
import { AuthSession, Show, User } from '../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: AuthSession | null;
  availableUsers: User[];
  allShows?: Show[];
  onLogin: (emailOrUserId: string, loginCode?: string) => Promise<void>;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  session,
  availableUsers,
  onLogin,
}) => {
  const [emailInput, setEmailInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await onLogin(emailInput.trim(), codeInput.trim() || undefined);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Falha ao autenticar login do programa.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickProfileLogin = async (user: User) => {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await onLogin(user.email, user.loginCode || undefined);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao alternar perfil de acesso.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">
                Portal de Login Individual por Programa — RSPlay TV SaaS
              </h2>
              <p className="text-xs text-zinc-400">
                Cada login possui isolamento estrito de perfil e visualiza apenas os programas e episódios liberados.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-2.5 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Quick Switch / Individual Program Logins */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-200">
                Perfis Configurados na Emissora (Acesso Rápido 1-Clique)
              </h3>
              <span className="text-xs text-zinc-500">
                Clique em qualquer conta para testar o isolamento de conteúdo
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {availableUsers.map((u) => {
                const isCurrent = session?.user.id === u.id;
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
                        : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                            <span>{u.name}</span>
                            {isCurrent && (
                              <span className="text-xs font-medium text-emerald-400">
                                · Sessão Ativa
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-zinc-400 font-mono">{u.email}</div>
                        </div>
                        <span className="text-xs font-mono text-zinc-400">
                          {isAdmin ? 'Admin Geral' : `Perfil ${u.role || 'Programa'}`}
                        </span>
                      </div>

                      <div className="text-xs text-zinc-400">
                        {u.jobTitle || 'Equipe de Produção RSPlay TV'}
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
        </div>
      </div>
    </div>
  );
};
