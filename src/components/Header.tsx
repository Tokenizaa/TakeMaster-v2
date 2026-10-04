import React from 'react';
import { Plus, Check, Clock, Radio, Tv } from 'lucide-react';
import { Show, Episode } from '../types';

interface HeaderProps {
  currentView: string;
  activeEpisode: Episode | null;
  activeShow: Show | null;
  savingStatus: 'saved' | 'saving' | 'idle';
  onNewEpisodeClick: () => void;
  onNewShowClick: () => void;
  onBackToEpisodes: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  activeEpisode,
  activeShow,
  savingStatus,
  onNewEpisodeClick,
  onNewShowClick,
  onBackToEpisodes,
}) => {
  return (
    <header className="h-14 border-b border-zinc-800 bg-zinc-900/60 backdrop-blur-md px-6 flex items-center justify-between shrink-0 z-10">
      {/* Left Breadcrumb & Context */}
      <div className="flex items-center gap-3">
        {currentView === 'episode-detail' && activeEpisode ? (
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={onBackToEpisodes}
              className="text-zinc-400 hover:text-zinc-200 transition-colors font-medium flex items-center gap-1 cursor-pointer"
            >
              <span>← Episódios</span>
            </button>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-400 font-mono">EP {String(activeEpisode.episodeNumber).padStart(3, '0')}</span>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-100 font-semibold truncate max-w-sm">{activeEpisode.title}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <Tv className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-zinc-200 font-semibold">{activeShow?.title || 'TakeMaster Studio'}</span>
              <span className="text-zinc-600">·</span>
              <span className="text-zinc-400">{activeShow?.format || 'Produção Audiovisual'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Autosave Indicator */}
        <div className="flex items-center gap-1.5 text-[11px] font-mono">
          {savingStatus === 'saving' ? (
            <>
              <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              <span className="text-amber-400">Salvando...</span>
            </>
          ) : (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-zinc-400">Salvo no banco</span>
            </>
          )}
        </div>

        {/* Studio Status Live dot */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-zinc-950 border border-zinc-800 rounded-full text-[11px]">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-zinc-300 font-medium font-mono">Estúdio Conectado</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onNewShowClick}
            className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 rounded-md text-xs font-medium transition-colors cursor-pointer"
          >
            + Programa
          </button>
          <button
            onClick={onNewEpisodeClick}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Novo Episódio</span>
          </button>
        </div>
      </div>
    </header>
  );
};
