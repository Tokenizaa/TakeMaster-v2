import React from 'react';
import {
  Film,
  Plus,
  PlayCircle,
  Clock,
  Sparkles,
  ArrowRight,
  Tv,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Episode, Show, EpisodeStatus } from '../types';
import { getStatusColorClass, getStatusLabel } from '../utils/format';

interface DashboardViewProps {
  episodes: Episode[];
  shows: Show[];
  activeShow: Show | null;
  onSelectEpisode: (ep: Episode, initialTab?: string) => void;
  onNewEpisodeClick: () => void;
  onNewShowClick: () => void;
  onOpenStudioMode: (ep: Episode) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  episodes,
  shows,
  activeShow,
  onSelectEpisode,
  onNewEpisodeClick,
  onNewShowClick,
  onOpenStudioMode,
}) => {
  // Group episodes by status
  const readyEpisodes = episodes.filter((e) => e.status === 'ready' || e.status === 'recording');
  const scriptingEpisodes = episodes.filter((e) => e.status === 'scripting' || e.status === 'outline');
  const researchEpisodes = episodes.filter((e) => e.status === 'research' || e.status === 'diagnosis' || e.status === 'draft');
  const recordedEpisodes = episodes.filter((e) => e.status === 'recorded' || e.status === 'editing');
  const publishedEpisodes = episodes.filter((e) => e.status === 'published');

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Hero Studio Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-zinc-950 border border-zinc-800/80 p-6 md:p-8">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-xs uppercase font-mono tracking-wider text-amber-400 font-semibold">
                Central de Produção & Direção
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-zinc-100 tracking-tight">
              {activeShow?.title || 'TakeMaster Studio'}
            </h1>
            <p className="text-sm text-zinc-400 mt-1 max-w-2xl leading-relaxed">
              Transforme ideias brutas em roteiros com direção de 3 câmeras, repiques investigativos e condução em estúdio profissional.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onNewEpisodeClick}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-amber-950/30 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Novo Episódio</span>
            </button>
            <button
              onClick={onNewShowClick}
              className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
            >
              + Novo Programa
            </button>
          </div>
        </div>

        {/* Status Pipeline Metric Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-6 border-t border-zinc-800/80">
          <div className="p-3 bg-zinc-950/60 border border-zinc-800/60 rounded-xl">
            <p className="text-[11px] font-mono text-zinc-400 uppercase">Em Pesquisa / Ideia</p>
            <p className="text-xl font-bold text-zinc-200 mt-0.5">{researchEpisodes.length}</p>
          </div>
          <div className="p-3 bg-zinc-950/60 border border-zinc-800/60 rounded-xl">
            <p className="text-[11px] font-mono text-indigo-400 uppercase">Em Roteirização</p>
            <p className="text-xl font-bold text-indigo-300 mt-0.5">{scriptingEpisodes.length}</p>
          </div>
          <div className="p-3 bg-zinc-950/60 border border-emerald-900/40 rounded-xl">
            <p className="text-[11px] font-mono text-emerald-400 uppercase">Pronto p/ Gravar</p>
            <p className="text-xl font-bold text-emerald-300 mt-0.5">{readyEpisodes.length}</p>
          </div>
          <div className="p-3 bg-zinc-950/60 border border-amber-900/40 rounded-xl">
            <p className="text-[11px] font-mono text-amber-400 uppercase">Gravado / Edição</p>
            <p className="text-xl font-bold text-amber-300 mt-0.5">{recordedEpisodes.length}</p>
          </div>
          <div className="p-3 bg-zinc-950/60 border border-zinc-800/60 rounded-xl">
            <p className="text-[11px] font-mono text-sky-400 uppercase">Publicados</p>
            <p className="text-xl font-bold text-sky-300 mt-0.5">{publishedEpisodes.length}</p>
          </div>
        </div>
      </div>

      {/* Section 1: Ready to Record (High Priority Studio Action) */}
      {readyEpisodes.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <h2 className="text-base font-bold text-zinc-100 uppercase tracking-wide font-mono">
                Prontos para o Estúdio de Gravação
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {readyEpisodes.map((ep) => (
              <div
                key={ep.id}
                className="bg-zinc-900/90 border border-red-900/40 hover:border-red-600/60 rounded-xl p-5 shadow-lg transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-amber-400">
                        EP {String(ep.episodeNumber).padStart(3, '0')}
                      </span>
                      <span className="text-zinc-600">·</span>
                      <span className="text-xs text-zinc-400">{ep.format}</span>
                    </div>
                    <span className="px-2 py-0.5 text-[11px] font-mono font-semibold rounded-md text-emerald-300 bg-emerald-950/60 border border-emerald-800/60">
                      Roteiro Pronto
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-zinc-100 group-hover:text-amber-300 transition-colors">
                    {ep.title}
                  </h3>

                  <p className="text-xs text-zinc-400 mt-1.5 line-clamp-2">
                    {ep.guestName ? `Convidado: ${ep.guestName} · ` : ''}{ep.diagnosis?.centralTheme || ep.idea}
                  </p>

                  <div className="flex items-center gap-4 mt-3 text-xs text-zinc-400 font-mono">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {ep.targetDurationMin} min planejados
                    </span>
                    <span>·</span>
                    <span>{ep.outline?.length || 0} blocos</span>
                    <span>·</span>
                    <span>{ep.questions?.length || 0} perguntas</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-5 pt-4 border-t border-zinc-800">
                  <button
                    onClick={() => onOpenStudioMode(ep)}
                    className="flex-1 py-2 px-3 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-red-950/50 cursor-pointer"
                  >
                    <PlayCircle className="w-4 h-4 fill-white/20" />
                    <span>Iniciar Modo Estúdio</span>
                  </button>

                  <button
                    onClick={() => onSelectEpisode(ep, 'script')}
                    className="py-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                  >
                    Revisar Roteiro
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Section 2: All Episodes in Pipeline */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-zinc-100">Todos os Episódios</h2>
          <span className="text-xs text-zinc-400 font-mono">{episodes.length} episódios cadastrados</span>
        </div>

        {episodes.length === 0 ? (
          <div className="text-center py-12 px-4 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/40">
            <Film className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-zinc-300">Nenhum episódio criado ainda</h3>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
              Comece inserindo uma ideia simples para que a IA estruture o briefing, pesquisa, pauta e roteiro de câmeras.
            </p>
            <button
              onClick={onNewEpisodeClick}
              className="mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Criar Primeiro Episódio</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {episodes.map((ep) => (
              <div
                key={ep.id}
                onClick={() => onSelectEpisode(ep)}
                className="bg-zinc-900/70 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl p-5 cursor-pointer transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-mono font-bold text-amber-400">
                      EP {String(ep.episodeNumber).padStart(3, '0')}
                    </span>
                    <span className={`px-2 py-0.5 text-[11px] font-mono rounded-md border ${getStatusColorClass(ep.status)}`}>
                      {getStatusLabel(ep.status)}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-zinc-100 group-hover:text-amber-300 transition-colors line-clamp-1">
                    {ep.title}
                  </h3>

                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                    {ep.idea}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
                  <span className="truncate max-w-[140px] text-zinc-300">
                    {ep.guestName || 'Solo'}
                  </span>
                  <div className="flex items-center gap-1 text-amber-400 font-medium group-hover:translate-x-1 transition-transform">
                    <span>Acessar</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
