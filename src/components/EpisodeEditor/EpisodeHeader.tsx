import React from 'react';
import {
  PlayCircle,
  Sparkles,
  Download,
  Clock,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { Episode, EpisodeStatus } from '../../types';
import { getStatusColorClass, getStatusLabel, formatTimeMinutes } from '../../utils/format';

interface EpisodeHeaderProps {
  episode: Episode;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onUpdateEpisode: (updated: Partial<Episode>) => void;
  onOpenStudioMode: () => void;
  onOpenExportModal: () => void;
  onToggleAiAssistant: () => void;
  onBack: () => void;
}

export const EpisodeHeader: React.FC<EpisodeHeaderProps> = ({
  episode,
  activeTab,
  onSelectTab,
  onUpdateEpisode,
  onOpenStudioMode,
  onOpenExportModal,
  onToggleAiAssistant,
  onBack,
}) => {
  // Calculate planned duration from blocks
  const plannedMinutes = (episode.outline || []).reduce(
    (acc, b) => acc + (b.estimatedDurationMin || 0),
    0
  );
  const diffMinutes = plannedMinutes - episode.targetDurationMin;

  const tabs = [
    { id: 'diagnosis', label: '1. Visão Geral & Conceito' },
    { id: 'research', label: '2. Pesquisa Factual' },
    { id: 'outline', label: '3. Pauta & Blocos' },
    { id: 'script', label: '4. Roteiro & 3 Câmeras' },
    { id: 'cameras', label: '5. Setup Câmeras' },
    { id: 'assets', label: '6. Materiais / B-Roll' },
    { id: 'shorts', label: '7. Cortes / Shorts' },
    { id: 'prep', label: '8. Checklist Gravação' },
    { id: 'editor', label: '9. Roteiro de Edição' },
  ];

  const statuses: EpisodeStatus[] = [
    'draft',
    'diagnosis',
    'research',
    'outline',
    'scripting',
    'ready',
    'recording',
    'recorded',
    'editing',
    'published',
  ];

  return (
    <div className="bg-zinc-900 border-b border-zinc-800 shrink-0">
      {/* Top Banner Row */}
      <div className="px-6 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Title and Status */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
            title="Voltar para lista de episódios"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono font-bold text-amber-400">
                EP {String(episode.episodeNumber).padStart(3, '0')}
              </span>
              <span className="text-zinc-600">·</span>
              <span className="text-xs text-zinc-400 font-medium">{episode.format}</span>
              <span className="text-zinc-600">·</span>

              {/* Status Selector Dropdown */}
              <select
                value={episode.status}
                onChange={(e) => onUpdateEpisode({ status: e.target.value as EpisodeStatus })}
                aria-label="Status de Produção"
                className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded border focus:outline-none cursor-pointer ${getStatusColorClass(
                  episode.status
                )}`}
              >
                {statuses.map((st) => (
                  <option key={st} value={st} className="bg-zinc-900 text-zinc-100">
                    {getStatusLabel(st)}
                  </option>
                ))}
              </select>
            </div>

            <input
              type="text"
              value={episode.title}
              onChange={(e) => onUpdateEpisode({ title: e.target.value })}
              aria-label="Título do Episódio"
              className="text-lg md:text-xl font-extrabold text-zinc-100 bg-transparent border-b border-transparent hover:border-zinc-700 focus:border-amber-500 focus:outline-none transition-colors w-full max-w-xl"
            />
          </div>
        </div>

        {/* Right Tools & Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Duration Meter */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-950/80 border border-zinc-800 rounded-lg text-xs font-mono">
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-400">Meta:</span>
              <span className="text-zinc-200 font-bold">{episode.targetDurationMin} min</span>
              <span className="text-zinc-600">/</span>
              <span className="text-zinc-400">Pauta:</span>
              <span
                className={`font-bold ${
                  Math.abs(diffMinutes) > 5 ? 'text-amber-400' : 'text-emerald-400'
                }`}
              >
                {plannedMinutes} min
              </span>
            </div>

            {diffMinutes !== 0 && (
              <span
                className={`text-[10px] px-1 rounded ${
                  diffMinutes > 0 ? 'text-amber-400 bg-amber-950/50' : 'text-sky-400 bg-sky-950/50'
                }`}
              >
                {diffMinutes > 0 ? `+${diffMinutes}m` : `${diffMinutes}m`}
              </span>
            )}
          </div>

          {/* AI Co-Producer Assistant Button */}
          <button
            onClick={onToggleAiAssistant}
            className="px-3 py-2 bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-800/80 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 fill-indigo-400/20" />
            <span>Assistente IA</span>
          </button>

          {/* Export / Print */}
          <button
            onClick={onOpenExportModal}
            className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar</span>
          </button>

          {/* Main Studio Mode CTA */}
          <button
            onClick={onOpenStudioMode}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-lg flex items-center gap-2 shadow-lg shadow-red-950/50 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <PlayCircle className="w-4 h-4 fill-white/20" />
            <span>🎬 Modo Estúdio</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="px-6 flex overflow-x-auto gap-1 border-t border-zinc-800/60 no-scrollbar">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`py-2.5 px-3.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? 'border-amber-400 text-amber-300 bg-amber-400/5'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
