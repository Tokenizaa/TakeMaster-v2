import React, { useState } from 'react';
import {
  Film,
  Plus,
  Search,
  Clock,
  PlayCircle,
  ArrowRight,
  Filter,
  Trash2
} from 'lucide-react';
import { Episode, EpisodeStatus } from '../types';
import { getStatusColorClass, getStatusLabel } from '../utils/format';

interface EpisodesListViewProps {
  episodes: Episode[];
  onSelectEpisode: (ep: Episode, tab?: string) => void;
  onNewEpisodeClick: () => void;
  onOpenStudioMode: (ep: Episode) => void;
  onDeleteEpisode: (id: string) => Promise<void>;
}

export const EpisodesListView: React.FC<EpisodesListViewProps> = ({
  episodes,
  onSelectEpisode,
  onNewEpisodeClick,
  onOpenStudioMode,
  onDeleteEpisode,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredEpisodes = episodes.filter((ep) => {
    const matchesSearch =
      ep.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ep.guestName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ep.idea.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || ep.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Film className="w-5 h-5 text-amber-400" />
            <h1 className="text-xl md:text-2xl font-bold text-zinc-100">Episódios da Produção</h1>
          </div>
          <p className="text-xs text-zinc-400">
            Gerencie o pipeline completo de gravação: rascunhos, pautas, roteiros aprovados e pós-gravação.
          </p>
        </div>

        <button
          onClick={onNewEpisodeClick}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-lg flex items-center gap-2 transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Novo Episódio</span>
        </button>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative max-w-md w-full">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por título, convidado ou tema..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'ready', label: 'Pronto p/ Gravar' },
            { id: 'scripting', label: 'Roteirizando' },
            { id: 'outline', label: 'Em Pauta' },
            { id: 'recorded', label: 'Gravados' },
          ].map((flt) => (
            <button
              key={flt.id}
              onClick={() => setStatusFilter(flt.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                statusFilter === flt.id
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold'
                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
              }`}
            >
              {flt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Episodes Table / Cards */}
      <div className="space-y-3">
        {filteredEpisodes.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/30">
            <Film className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
            <p className="text-xs text-zinc-400">Nenhum episódio encontrado com os filtros selecionados.</p>
          </div>
        ) : (
          filteredEpisodes.map((ep) => (
            <div
              key={ep.id}
              className="bg-zinc-900/70 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl p-5 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group"
            >
              <div
                onClick={() => onSelectEpisode(ep)}
                className="flex-1 cursor-pointer space-y-1.5"
              >
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-xs font-bold text-amber-400">
                    EP {String(ep.episodeNumber).padStart(3, '0')}
                  </span>
                  <span className="text-zinc-600">·</span>
                  <span className="text-xs text-zinc-400 font-mono">{ep.format}</span>
                  <span className="text-zinc-600">·</span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${getStatusColorClass(ep.status)}`}>
                    {getStatusLabel(ep.status)}
                  </span>
                </div>

                <h3 className="text-base font-bold text-zinc-100 group-hover:text-amber-300 transition-colors">
                  {ep.title}
                </h3>

                <p className="text-xs text-zinc-400 line-clamp-1">
                  {ep.guestName ? <strong className="text-zinc-300">{ep.guestName} · </strong> : ''}
                  {ep.idea}
                </p>

                <div className="flex items-center gap-4 text-xs font-mono text-zinc-500 pt-1">
                  <span>⏱ {ep.targetDurationMin} min</span>
                  <span>·</span>
                  <span>{ep.outline?.length || 0} blocos</span>
                  <span>·</span>
                  <span>{ep.questions?.length || 0} perguntas</span>
                  <span>·</span>
                  <span>{ep.shorts?.length || 0} shorts planejados</span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-zinc-800">
                <button
                  onClick={() => onOpenStudioMode(ep)}
                  className="px-3.5 py-2 bg-red-600/90 hover:bg-red-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-red-950/40"
                  title="Abrir diretamente no Modo Estúdio para gravação"
                >
                  <PlayCircle className="w-3.5 h-3.5" />
                  <span>Modo Estúdio</span>
                </button>

                <button
                  onClick={() => onSelectEpisode(ep)}
                  className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span>Abrir Editor</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => onDeleteEpisode(ep.id)}
                  className="p-2 text-zinc-600 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                  title="Excluir episódio"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
