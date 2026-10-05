import React from 'react';
import {
  Film,
  Tv,
  Users,
  Radio,
  Plus,
  ArrowRight,
  Clock,
  Sparkles,
  CheckCircle2,
  Calendar,
  FolderKanban,
  Layers,
  MapPin,
} from 'lucide-react';
import {
  Episode,
  Guest,
  LibraryAsset,
  Production,
  ScheduleEvent,
  Show,
} from '../types';
import { getStatusColorClass, getStatusLabel } from '../utils/format';
import { NavSection } from './Sidebar';

interface DashboardViewProps {
  shows: Show[];
  productions?: Production[];
  episodes: Episode[];
  guests: Guest[];
  scheduleEvents?: ScheduleEvent[];
  libraryAssets?: LibraryAsset[];
  onOpenEpisode: (id: string) => void;
  onNewEpisode: () => void;
  onOpenStudioMode: (episode: Episode) => void;
  onNavigateSection?: (section: NavSection) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  shows,
  productions = [],
  episodes,
  guests,
  scheduleEvents = [],
  libraryAssets = [],
  onOpenEpisode,
  onNewEpisode,
  onOpenStudioMode,
  onNavigateSection,
}) => {
  const readyForStudio = episodes.filter(
    (e) => e.status === 'ready' || e.status === 'scripting' || e.status === 'recording'
  );

  const upcomingSchedule = scheduleEvents
    .filter((ev) => ev.status !== 'cancelled')
    .slice(0, 4);

  const approvedAssetsCount = libraryAssets.filter((a) => a.status === 'aprovado').length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-900 to-amber-950/40 border border-zinc-800 p-6 sm:p-8">
        <div className="max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>TakeMaster V2 • Operação & Direção Editorial</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100 tracking-tight">
            Central de Produção & Comando de Estúdio
          </h1>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Fluxo completo da ideia ao estúdio com persistência relacional: gerencie o catálogo de programas, temporadas, agenda de gravações, biblioteca de assets e direção multicâmera.
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <button
              onClick={onNewEpisode}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Criar Novo Episódio</span>
            </button>
            {readyForStudio.length > 0 && (
              <button
                onClick={() => onOpenStudioMode(readyForStudio[0])}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-medium text-sm flex items-center gap-2 border border-zinc-700 transition-all cursor-pointer"
              >
                <Radio className="w-4 h-4 text-red-400" />
                <span>Iniciar Modo Estúdio ({readyForStudio[0].title.slice(0, 26)}...)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Operational & Editorial KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div
          onClick={() => onNavigateSection && onNavigateSection('shows')}
          className="bg-zinc-900/80 border border-zinc-800/80 hover:border-zinc-700 rounded-xl p-4 flex items-center gap-3.5 cursor-pointer transition"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
            <Tv className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <p className="text-[11px] text-zinc-400 uppercase tracking-wider font-medium">
              Catálogo / Temporadas
            </p>
            <p className="text-xl font-bold text-zinc-100 font-mono">
              {shows.length} <span className="text-xs text-zinc-500 font-normal">prog</span> /{' '}
              {productions.length} <span className="text-xs text-zinc-500 font-normal">temp</span>
            </p>
          </div>
        </div>

        <div
          onClick={() => onNavigateSection && onNavigateSection('episodes')}
          className="bg-zinc-900/80 border border-zinc-800/80 hover:border-zinc-700 rounded-xl p-4 flex items-center gap-3.5 cursor-pointer transition"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
            <Film className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <p className="text-[11px] text-zinc-400 uppercase tracking-wider font-medium">
              Episódios Ativos
            </p>
            <p className="text-xl font-bold text-zinc-100 font-mono">{episodes.length}</p>
          </div>
        </div>

        <div
          onClick={() => onNavigateSection && onNavigateSection('schedule')}
          className="bg-zinc-900/80 border border-zinc-800/80 hover:border-zinc-700 rounded-xl p-4 flex items-center gap-3.5 cursor-pointer transition"
        >
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <p className="text-[11px] text-zinc-400 uppercase tracking-wider font-medium">
              Agenda de Estúdio
            </p>
            <p className="text-xl font-bold text-zinc-100 font-mono">{scheduleEvents.length}</p>
          </div>
        </div>

        <div
          onClick={() => onNavigateSection && onNavigateSection('library')}
          className="bg-zinc-900/80 border border-zinc-800/80 hover:border-zinc-700 rounded-xl p-4 flex items-center gap-3.5 cursor-pointer transition"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <FolderKanban className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-[11px] text-zinc-400 uppercase tracking-wider font-medium">
              Assets Aprovados
            </p>
            <p className="text-xl font-bold text-zinc-100 font-mono">
              {approvedAssetsCount}/{libraryAssets.length}
            </p>
          </div>
        </div>

        <div
          onClick={() => onNavigateSection && onNavigateSection('guests')}
          className="bg-zinc-900/80 border border-zinc-800/80 hover:border-zinc-700 rounded-xl p-4 flex items-center gap-3.5 cursor-pointer transition"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <p className="text-[11px] text-zinc-400 uppercase tracking-wider font-medium">
              Participantes
            </p>
            <p className="text-xl font-bold text-zinc-100 font-mono">{guests.length}</p>
          </div>
        </div>
      </div>

      {/* Operational Grid: Upcoming Schedule + Active Productions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Studio Schedule */}
        <div className="lg:col-span-2 bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-200">
                Próximas Sessões na Agenda de Produção
              </h2>
            </div>
            {onNavigateSection && (
              <button
                onClick={() => onNavigateSection('schedule')}
                className="text-xs text-amber-400 hover:text-amber-300 font-medium cursor-pointer"
              >
                Ver Agenda Completa →
              </button>
            )}
          </div>

          {upcomingSchedule.length === 0 ? (
            <p className="text-xs text-zinc-500 py-4">
              Nenhum compromisso agendado para os próximos dias.
            </p>
          ) : (
            <div className="space-y-2.5">
              {upcomingSchedule.map((ev) => {
                const show = shows.find((s) => s.id === ev.showId);
                return (
                  <div
                    key={ev.id}
                    className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          {ev.type}
                        </span>
                        <span className="text-xs text-zinc-400">{show?.title}</span>
                      </div>
                      <p className="text-sm font-semibold text-zinc-100">{ev.title}</p>
                      <div className="flex items-center gap-3 text-[11px] text-zinc-400 font-mono">
                        <span>{ev.scheduledStart.slice(0, 10)}</span>
                        <span>•</span>
                        <span>
                          {ev.scheduledStart.slice(11, 16)} - {ev.scheduledEnd.slice(11, 16)}
                        </span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1 font-sans">
                          <MapPin className="w-3 h-3 text-zinc-500" />
                          {ev.studioLocation}
                        </span>
                      </div>
                    </div>

                    {ev.episodeId && (
                      <button
                        onClick={() => onOpenEpisode(ev.episodeId!)}
                        className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-amber-400 border border-zinc-800 text-xs font-medium shrink-0 cursor-pointer"
                      >
                        Abrir Pauta
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Active Productions / Seasons Context */}
        <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-200">
                Temporadas em Curso
              </h2>
            </div>
            {onNavigateSection && (
              <button
                onClick={() => onNavigateSection('shows')}
                className="text-xs text-amber-400 hover:text-amber-300 font-medium cursor-pointer"
              >
                Catálogo →
              </button>
            )}
          </div>

          <div className="space-y-3">
            {productions.map((prod) => {
              const show = shows.find((s) => s.id === prod.showId);
              const prodEps = episodes.filter((e) => e.productionId === prod.id);
              const pct = Math.min(
                100,
                Math.round((prodEps.length / Math.max(1, prod.targetEpisodesCount)) * 100)
              );
              return (
                <div
                  key={prod.id}
                  className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-3.5 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-amber-400 font-mono font-semibold">
                      T{prod.seasonNumber} • {show?.title}
                    </span>
                    <span className="font-mono text-zinc-400">
                      {prodEps.length}/{prod.targetEpisodesCount} eps
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-zinc-100">{prod.title}</p>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all"
                      style={{ width: `${Math.max(12, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Episodes Pipeline */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-zinc-100">
              Pipeline Editorial de Episódios
            </h2>
            <p className="text-xs text-zinc-400">
              Clique em um episódio para abrir a central de produção (Diagnóstico, Pesquisa, Pauta, Roteiro, Câmeras e Gravação).
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {episodes.map((ep) => {
            const show = shows.find((s) => s.id === ep.showId);
            const prod = productions.find((p) => p.id === ep.productionId);
            const checklistValues = [
              ep.technicalChecklist.cam1Recording,
              ep.technicalChecklist.cam2Recording,
              ep.technicalChecklist.cam3Recording,
              ep.technicalChecklist.micHost,
              ep.technicalChecklist.micGuest,
              ep.technicalChecklist.audioMonitored,
            ];
            const checklistDone = checklistValues.filter(Boolean).length;

            return (
              <div
                key={ep.id}
                onClick={() => onOpenEpisode(ep.id)}
                className="group bg-zinc-900/90 hover:bg-zinc-900 border border-zinc-800/90 hover:border-amber-500/40 rounded-2xl p-5 transition-all cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-5"
              >
                <div className="space-y-2.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-md bg-zinc-800 text-amber-400 border border-zinc-700">
                      EP #{String(ep.episodeNumber).padStart(2, '0')}
                    </span>
                    {show && (
                      <span className="text-xs font-medium text-zinc-400 bg-zinc-950 px-2.5 py-0.5 rounded-md border border-zinc-800">
                        {show.title}
                      </span>
                    )}
                    {prod && (
                      <span className="text-xs font-mono text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                        T{prod.seasonNumber}
                      </span>
                    )}
                    <span
                      className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${getStatusColorClass(
                        ep.status
                      )}`}
                    >
                      {getStatusLabel(ep.status)}
                    </span>
                    <span className="text-xs text-zinc-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {ep.targetDurationMin} min
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-zinc-100 group-hover:text-amber-400 transition-colors">
                    {ep.title}
                  </h3>

                  <p className="text-sm text-zinc-400 line-clamp-2">{ep.idea}</p>

                  <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-zinc-400">
                    <div>
                      <span className="text-zinc-500">Convidado:</span>{' '}
                      <span className="font-medium text-zinc-200">
                        {ep.guestName || 'Programa Solo'}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Apresentador:</span>{' '}
                      <span className="font-medium text-zinc-200">{ep.host}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Estrutura:</span>{' '}
                      <span className="font-medium text-zinc-200">
                        {ep.outline.length} blocos • {ep.questions.length} perguntas •{' '}
                        {ep.script.length} itens de roteiro
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-3 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-zinc-800">
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Checklist Base: {checklistDone}/6</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenStudioMode(ep);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Radio className="w-3.5 h-3.5" />
                      <span>Modo Estúdio</span>
                    </button>

                    <div className="px-3.5 py-1.5 rounded-xl bg-zinc-800 group-hover:bg-amber-500 group-hover:text-zinc-950 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-all">
                      <span>Abrir Central</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
