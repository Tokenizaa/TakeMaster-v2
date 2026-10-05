import React from 'react';
import {
  Search,
  Tv,
  Radio,
  CheckCircle2,
  Loader2,
  Building2,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Lock,
  CreditCard,
} from 'lucide-react';
import { AuthSession, Show } from '../types';

interface HeaderProps {
  shows: Show[];
  selectedShowId: string;
  onSelectShow: (id: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  saveStatus: 'saved' | 'saving' | 'error';
  saveErrorMessage?: string | null;
  activeEpisodeTitle?: string;
  onOpenStudioMode?: () => void;
  session?: AuthSession | null;
  onSwitchOrganization?: (orgId: string) => void;
  onResetWorkspaceSeed?: () => void;
  onOpenLoginModal?: () => void;
  onOpenBilling?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  shows,
  selectedShowId,
  onSelectShow,
  searchQuery,
  onSearchChange,
  saveStatus,
  saveErrorMessage,
  activeEpisodeTitle,
  onOpenStudioMode,
  session,
  onSwitchOrganization,
  onResetWorkspaceSeed,
  onOpenLoginModal,
  onOpenBilling,
}) => {
  const isRestrictedProfile = session && !session.isFullAccessAdmin;

  return (
    <header className="h-16 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 px-6 flex items-center justify-between shrink-0 z-20 gap-4">
      {/* Left: Context Hierarchy (Organization -> Show) & Search */}
      <div className="flex items-center gap-3 flex-1 max-w-3xl min-w-0">
        {/* Multi-Tenant Organization Selector */}
        {session && session.memberships && session.memberships.length > 0 && (
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 shrink-0">
            <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <select
              value={session.activeOrganization.id}
              onChange={(e) => onSwitchOrganization && onSwitchOrganization(e.target.value)}
              className="bg-transparent text-xs font-semibold text-zinc-200 focus:outline-none cursor-pointer pr-1"
              title="Alternar Organização (Isolamento Multi-Tenant)"
            >
              {session.memberships.map((m) => (
                <option
                  key={m.organizationId}
                  value={m.organizationId}
                  className="bg-zinc-900 text-zinc-200"
                >
                  {m.organizationName}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Show Selector (Filtered strictly to allowed programs for this user) */}
        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 shrink-0">
          <Tv className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <select
            value={selectedShowId}
            onChange={(e) => onSelectShow(e.target.value)}
            className="bg-transparent text-xs font-medium text-zinc-200 focus:outline-none cursor-pointer pr-2 max-w-[210px] truncate"
          >
            <option value="ALL" className="bg-zinc-900 text-zinc-200">
              {isRestrictedProfile
                ? `Meus Programas Liberados (${shows.length})`
                : `Todos os Programas (${shows.length})`}
            </option>
            {shows.map((s) => (
              <option key={s.id} value={s.id} className="bg-zinc-900 text-zinc-200">
                {s.title}
              </option>
            ))}
          </select>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 max-w-xs hidden md:block">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar episódio, convidado, pauta..."
            className="w-full bg-zinc-900/70 border border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500/60 transition-all"
          />
        </div>
      </div>

      {/* Right: Subscription Plan Button, User Program Login Switcher & Studio Mode */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Rule 5: Honest Autosave indicator */}
        <div
          className="hidden xl:flex items-center gap-1.5 text-xs text-zinc-400 px-2.5 py-1.5"
          title={
            saveStatus === 'error'
              ? saveErrorMessage || 'Erro ao confirmar gravação no banco de dados'
              : 'Persistência relacional confirmada pelo backend'
          }
        >
          {saveStatus === 'saving' ? (
            <>
              <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              <span className="text-amber-300 font-medium">Salvando...</span>
            </>
          ) : saveStatus === 'saved' ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-zinc-400">Salvo</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              <span className="text-red-400 font-medium">
                {saveErrorMessage ? `Falha: ${saveErrorMessage.slice(0, 22)}` : 'Erro'}
              </span>
            </>
          )}
        </div>

        {/* Active Subscription Quick Button */}
        {session?.activeSubscription && onOpenBilling && !activeEpisodeTitle && (
          <button
            type="button"
            onClick={onOpenBilling}
            className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 transition-colors cursor-pointer whitespace-nowrap"
            title="Gerenciar Plano Mensal e Renovação Automática no Gateway"
          >
            <CreditCard className="w-3.5 h-3.5 text-amber-400" />
            <span>{session.activeSubscription.planName}</span>
          </button>
        )}

        {/* Authenticated User & Program Login Switcher Button */}
        {session && (
          <button
            type="button"
            onClick={onOpenLoginModal}
            className="flex items-center gap-2 text-xs bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-3 py-1.5 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
            title="Clique para trocar o Login Individual de Programa e testar as permissões de acesso"
          >
            {isRestrictedProfile ? (
              <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            )}
            <span className="font-medium text-zinc-200 max-w-[160px] truncate">
              {session.user.name}
            </span>
            <span className="text-[11px] text-amber-400 font-medium">· Trocar Login</span>
          </button>
        )}

        {/* Explicit Seed Reset Button */}
        {onResetWorkspaceSeed && !activeEpisodeTitle && (
          <button
            onClick={onResetWorkspaceSeed}
            className="hidden 2xl:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 text-xs transition cursor-pointer whitespace-nowrap"
            title="Restaurar dados demonstrativos (Seed) desta organização"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar Seed</span>
          </button>
        )}

        {activeEpisodeTitle && onOpenStudioMode && (
          <button
            onClick={onOpenStudioMode}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 font-semibold text-xs transition-all cursor-pointer whitespace-nowrap"
          >
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>Modo Estúdio (Ao Vivo)</span>
          </button>
        )}
      </div>
    </header>
  );
};
