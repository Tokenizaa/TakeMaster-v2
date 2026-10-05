import React, { useState } from 'react';
import {
  Film,
  Plus,
  Search,
  Filter,
  Clock,
  Users,
  FileText,
  Video,
  ArrowRight,
  Tv,
  CheckCircle,
  Play
} from 'lucide-react';
import { Episode, Program, EpisodeStatus } from '../types';

interface EpisodesListViewProps {
  episodes: Episode[];
  programs: Program[];
  onSelectEpisode: (episode: Episode) => void;
  onOpenNewEpisodeModal: (programId?: string) => void;
}

export const EpisodesListView: React.FC<EpisodesListViewProps> = ({
  episodes,
  programs,
  onSelectEpisode,
  onOpenNewEpisodeModal,
}) => {
  const [selectedProgram, setSelectedProgram] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEpisodes = episodes.filter(ep => {
    const matchesProgram = selectedProgram === 'all' || ep.programId === selectedProgram;
    const matchesStatus = selectedStatus === 'all' || ep.status === selectedStatus;
    const matchesSearch =
      !searchQuery ||
      ep.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ep.topic || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ep.presenterName || '').toLowerCase().includes(searchQuery.toLowerCase());

    return matchesProgram && matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Film className="w-5 h-5 text-purple-400" />
            Todos os Episódios
          </h1>
          <p className="text-xs text-slate-400">
            Gerencie toda a grade de episódios, status de roteirização e prontidão de gravação.
          </p>
        </div>

        <button
          onClick={() => onOpenNewEpisodeModal()}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold shadow-md transition"
        >
          <Plus className="w-4 h-4" />
          + Novo Episódio
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl p-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar por título, tema, apresentador..."
            className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Program select */}
          <select
            value={selectedProgram}
            onChange={e => setSelectedProgram(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
          >
            <option value="all">Todos os Programas</option>
            {programs.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {/* Status select */}
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
          >
            <option value="all">Todos os Status</option>
            <option value="draft">Rascunho</option>
            <option value="diagnosis">Diagnóstico</option>
            <option value="research">Pesquisa</option>
            <option value="outline">Pauta</option>
            <option value="scripting">Roteiro</option>
            <option value="ready">Pronto p/ Gravar</option>
            <option value="recording">Gravando</option>
            <option value="recorded">Gravado</option>
            <option value="editing">Edição</option>
            <option value="published">Publicado</option>
          </select>
        </div>
      </div>

      {/* Episode Cards Grid */}
      {filteredEpisodes.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
          <Film className="w-12 h-12 text-slate-600 mx-auto" />
          <p className="text-base text-slate-300 font-semibold">Nenhum episódio encontrado</p>
          <p className="text-xs text-slate-400">Tente ajustar seus filtros de busca ou crie um novo episódio.</p>
          <button
            onClick={() => onOpenNewEpisodeModal()}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-xs font-semibold"
          >
            Criar Episódio
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEpisodes.map(ep => {
            const prog = programs.find(p => p.id === ep.programId);

            return (
              <div
                key={ep.id}
                onClick={() => onSelectEpisode(ep)}
                className="bg-slate-900 border border-slate-800 hover:border-purple-500/60 rounded-xl p-4 cursor-pointer transition flex flex-col justify-between group shadow-sm hover:shadow-purple-950/20 space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    {prog ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-800">
                        {prog.name}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500">Sem Programa</span>
                    )}

                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      ep.status === 'ready'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : ep.status === 'recording'
                        ? 'bg-red-950 text-red-300 border border-red-800 animate-pulse'
                        : 'bg-slate-800 text-slate-300'
                    }`}>
                      {ep.status}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white group-hover:text-purple-300 transition line-clamp-2">
                    {ep.title}
                  </h3>

                  <p className="text-xs text-slate-400 line-clamp-2">
                    {ep.topic || ep.synopsis}
                  </p>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {ep.targetDurationMinutes} min
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-slate-500" />
                      {(ep.participants || []).length} pessoas
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3 text-slate-500" />
                      {(ep.script || []).length} falas
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-purple-400 font-semibold group-hover:translate-x-1 inline-flex items-center gap-1 transition-transform">
                      Abrir Workspace &rarr;
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
