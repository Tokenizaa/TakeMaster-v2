import React from 'react';
import {
  Film,
  Tv,
  Users,
  Sliders,
  Sparkles,
  BookOpen,
  ListOrdered,
  FileText,
  Camera,
  FolderOpen,
  Scissors,
  CheckCircle2,
  FileCheck,
  PlayCircle,
  Clapperboard,
  LayoutDashboard,
  Database,
} from 'lucide-react';
import { Episode, Program } from '../types';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  activeEpisode: Episode | null;
  activeEpisodeTab: string;
  onSelectEpisodeTab: (tab: string) => void;
  onOpenStudioMode: () => void;
  onNewEpisodeClick: () => void;
  programs: Program[];
  activeProgramId: string;
  onSelectProgramId: (id: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  activeEpisode,
  activeEpisodeTab,
  onSelectEpisodeTab,
  onOpenStudioMode,
  onNewEpisodeClick,
  programs,
  activeProgramId,
  onSelectProgramId,
}) => {
   const currentProgram = programs.find((p) => p.id === activeProgramId) || programs[0];

  const mainNav = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'episodes', label: 'Episódios', icon: Film },
    { id: 'programs', label: 'Programas', icon: Tv },
    { id: 'guests', label: 'Convidados', icon: Users },
    { id: 'catalog', label: 'Catálogo', icon: Database },
    { id: 'studio-setup', label: 'Setup de Câmeras', icon: Sliders },
  ];

  const episodeTabs = [
    { id: 'diagnosis', label: 'Visão Geral & IA', icon: Sparkles },
    { id: 'research', label: 'Pesquisa Factual', icon: BookOpen },
    { id: 'outline', label: 'Pauta & Blocos', icon: ListOrdered },
    { id: 'script', label: 'Roteiro & Câmeras', icon: FileText },
    { id: 'cameras', label: 'Mapa de Câmeras', icon: Camera },
    { id: 'assets', label: 'Materiais & B-Roll', icon: FolderOpen },
    { id: 'shorts', label: 'Cortes & Shorts', icon: Scissors },
    { id: 'prep', label: 'Checklist Técnico', icon: CheckCircle2 },
    { id: 'editor', label: 'Roteiro de Edição', icon: FileCheck },
  ];

  return (
    <aside className="w-64 bg-zinc-900/90 border-r border-zinc-800 flex flex-col h-screen select-none shrink-0 text-sm">
      {/* Brand Header */}
      <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
            <Clapperboard className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-zinc-100 text-base leading-tight tracking-tight">TakeMaster</h1>
            <p className="text-[11px] text-zinc-400 uppercase tracking-wider font-mono">Direção & Roteiro</p>
          </div>
        </div>
      </div>

      {/* Show Selector */}
      <div className="px-3 pt-3 pb-2 border-b border-zinc-800/60">
        <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 block mb-1">
          Programa Ativo
        </label>
        <select
          value={activeProgramId}
          onChange={(e) => onSelectProgramId(e.target.value)}
          aria-label="Selecionar Programa Ativo"
          className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-amber-500/50"
        >
          {programs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title} ({p.format})
            </option>
          ))}
        </select>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-6">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 px-2 block mb-1.5">
            Navegação Geral
          </span>
          <nav className="space-y-0.5">
            {mainNav.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md font-medium text-xs transition-colors ${
                    isActive
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Active Episode Workflow Tabs */}
        {activeEpisode && (
          <div className="pt-2 border-t border-zinc-800/80">
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400/90 font-semibold">
                Produção Atual
              </span>
              <span className="text-[10px] font-mono text-zinc-400">
                EP #{activeEpisode.episode_number}
              </span>
            </div>

            <div className="px-2 mb-2">
              <p className="text-xs font-semibold text-zinc-200 truncate" title={activeEpisode.title}>
                {activeEpisode.title}
              </p>
               <p className="text-[11px] text-zinc-400 truncate">
                 {activeEpisode.target_duration_min} min
               </p>
            </div>

            {/* Quick Button: Start Studio Mode */}
            <button
              onClick={onOpenStudioMode}
              className="w-full mb-3 flex items-center justify-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-500 text-white rounded-md font-semibold text-xs transition-all shadow-md shadow-red-950/40 group active:scale-[0.98]"
            >
              <PlayCircle className="w-4 h-4 fill-white/20 group-hover:scale-110 transition-transform" />
              <span>Modo Estúdio (Gravação)</span>
            </button>

            <nav className="space-y-0.5">
              {episodeTabs.map((tab) => {
                const Icon = tab.icon;
                const isTabActive = currentView === 'episode-detail' && activeEpisodeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      onNavigate('episode-detail');
                      onSelectEpisodeTab(tab.id);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      isTabActive
                        ? 'bg-zinc-800 text-amber-300 font-semibold'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{tab.label}</span>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="p-3 border-t border-zinc-800 bg-zinc-950/40">
        <button
          onClick={onNewEpisodeClick}
          className="w-full py-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 hover:border-zinc-600 rounded-md font-medium text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <span className="text-amber-400 font-bold text-sm">+</span>
          <span>Novo Episódio</span>
        </button>
      </div>
    </aside>
  );
};
