import React from 'react';
import {
  Clapperboard,
  LayoutDashboard,
  Tv,
  Film,
  Users,
  Video,
  Plus,
  Calendar,
  FolderKanban,
  CreditCard,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { AuthSession } from '../types';

export type NavSection =
  | 'dashboard'
  | 'shows'
  | 'episodes'
  | 'guests'
  | 'schedule'
  | 'library'
  | 'studio'
  | 'billing'
  | 'admin';

interface SidebarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  onNewEpisode: () => void;
  episodesCount: number;
  showsCount: number;
  guestsCount: number;
  scheduleCount?: number;
  libraryCount?: number;
  organizationName?: string;
  session?: AuthSession | null;
  onOpenLoginModal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  onNewEpisode,
  episodesCount,
  showsCount,
  guestsCount,
  scheduleCount = 0,
  libraryCount = 0,
  organizationName = 'RSPlay TV — Rede Broadcast',
  session,
  onOpenLoginModal,
}) => {
  const editorialItems: {
    id: NavSection;
    label: string;
    icon: React.FC<{ className?: string }>;
    badge?: number;
  }[] = [
    { id: 'dashboard', label: 'Painel do Programa', icon: LayoutDashboard },
    { id: 'episodes', label: 'Episódios & Roteiros', icon: Film, badge: episodesCount },
    { id: 'guests', label: 'Participantes & Convidados', icon: Users, badge: guestsCount },
  ];

  const operationalItems: {
    id: NavSection;
    label: string;
    icon: React.FC<{ className?: string }>;
    badge?: number;
  }[] = [
    { id: 'shows', label: 'Catálogo & Temporadas', icon: Tv, badge: showsCount },
    { id: 'schedule', label: 'Agenda de Produção', icon: Calendar, badge: scheduleCount },
    { id: 'library', label: 'Biblioteca de Assets', icon: FolderKanban, badge: libraryCount },
    { id: 'studio', label: 'Estúdio & Câmeras', icon: Video },
  ];

  const saasAdminItems: {
    id: NavSection;
    label: string;
    icon: React.FC<{ className?: string }>;
  }[] = [
    { id: 'billing', label: 'Assinatura & Gateway', icon: CreditCard },
    { id: 'admin', label: 'Painel Administrativo', icon: ShieldCheck },
  ];

  const renderNavItem = (item: {
    id: NavSection;
    label: string;
    icon: React.FC<{ className?: string }>;
    badge?: number;
  }) => {
    const Icon = item.icon;
    const isActive = activeSection === item.id;
    return (
      <button
        key={item.id}
        onClick={() => onSelectSection(item.id)}
        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
          isActive
            ? 'bg-zinc-900 text-amber-400 border border-zinc-800 shadow-sm'
            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 border border-transparent'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-amber-400' : 'text-zinc-500'}`} />
          <span className="truncate">{item.label}</span>
        </div>
        {item.badge !== undefined && (
          <span
            className={`text-xs px-2 py-0.5 rounded-md font-mono tabular-nums ${
              isActive ? 'bg-amber-500/20 text-amber-300' : 'bg-zinc-900 text-zinc-500'
            }`}
          >
            {item.badge}
          </span>
        )}
      </button>
    );
  };

  const isRestrictedProfile = session && !session.isFullAccessAdmin;

  return (
    <aside className="w-64 bg-zinc-950 border-r border-zinc-800/80 flex flex-col h-screen shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-zinc-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
            <Clapperboard className="w-5 h-5 text-zinc-950" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-base tracking-tight text-zinc-100 truncate">
              RSPlay TV SaaS
            </div>
            <p className="text-[11px] text-zinc-500 truncate">{organizationName}</p>
          </div>
        </div>
      </div>

      {/* Primary CTA */}
      <div className="p-4">
        <button
          onClick={onNewEpisode}
          className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/15 transition-all cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Novo Episódio</span>
        </button>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 px-3 space-y-5 overflow-y-auto">
        <div className="space-y-1">
          <div className="px-3 py-1 text-xs font-medium text-zinc-500">
            Núcleo Editorial
          </div>
          {editorialItems.map(renderNavItem)}
        </div>

        <div className="space-y-1">
          <div className="px-3 py-1 text-xs font-medium text-zinc-500">
            Operação & Estúdio
          </div>
          {operationalItems.map(renderNavItem)}
        </div>

        <div className="space-y-1">
          <div className="px-3 py-1 text-xs font-medium text-zinc-500">
            SaaS, Planos & Admin
          </div>
          {saasAdminItems.map(renderNavItem)}
        </div>
      </nav>

      {/* Active Profile & Program Isolation Footer */}
      <div className="p-4 border-t border-zinc-800/80">
        <div className="p-3 rounded-xl bg-zinc-900/70 border border-zinc-800/80 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold truncate">
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                {isRestrictedProfile ? 'Login Isolado por Programa' : 'Acesso Master Admin'}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            {isRestrictedProfile
              ? `Visualizando apenas ${showsCount} programa(s) liberado(s) para ${session?.user.name.split(' ')[0]}.`
              : `Todos os ${showsCount} programas e relatórios liberados.`}
          </p>
          {onOpenLoginModal && (
            <button
              type="button"
              onClick={onOpenLoginModal}
              className="w-full py-1.5 px-2.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-[11px] font-medium text-zinc-200 transition-colors cursor-pointer"
            >
              Alternar Login de Programa
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
