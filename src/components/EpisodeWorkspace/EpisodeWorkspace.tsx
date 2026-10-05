import React, { useState } from 'react';
import {
  FileText,
  Sliders,
  Play,
  Share2,
  Download,
  Sparkles,
  ArrowLeft,
  Tv,
  CheckCircle2,
  Clock,
  Users,
  Video,
  Eye,
  Scissors
} from 'lucide-react';
import { Episode, Program, CameraConfig } from '../../types';
import { EpisodeOverviewWorkspace } from './EpisodeOverviewWorkspace';
import { EpisodeScriptWorkspace } from './EpisodeScriptWorkspace';
import { EpisodeProductionWorkspace } from './EpisodeProductionWorkspace';
import { EpisodeRecordingWorkspace } from './EpisodeRecordingWorkspace';

interface EpisodeWorkspaceProps {
  episode: Episode;
  program?: Program;
  onUpdateEpisode: (updated: Episode) => void;
  onBackToDashboard: () => void;
  onLaunchStudio: () => void;
  onOpenExportModal: () => void;
  onOpenAiAssistant: () => void;
}

export type EpisodeWorkspaceTab = 'overview' | 'script' | 'production' | 'recording';

export const EpisodeWorkspace: React.FC<EpisodeWorkspaceProps> = ({
  episode,
  program,
  onUpdateEpisode,
  onBackToDashboard,
  onLaunchStudio,
  onOpenExportModal,
  onOpenAiAssistant,
}) => {
  const [activeTab, setActiveTab] = useState<EpisodeWorkspaceTab>('overview');

  const availableCameras: CameraConfig[] = (episode.cameras && episode.cameras.length > 0)
    ? episode.cameras
    : (program?.defaultCameras && program.defaultCameras.length > 0)
    ? program.defaultCameras
    : [
        { id: 'cam-1', name: 'CAM 1 (Apresentador)', type: 'close', target: 'Apresentador (Close)', shotType: 'close' },
        { id: 'cam-2', name: 'CAM 2 (Convidado)', type: 'close', target: 'Convidado Principal', shotType: 'close' },
        { id: 'cam-3', name: 'CAM 3 (Plano Conjunto)', type: 'wide', target: 'Mesa / Cenário Geral', shotType: 'wide' }
      ];

  const handleUpdateEpisodeFields = (fields: Partial<Episode>) => {
    onUpdateEpisode({ ...episode, ...fields });
  };

  const tabs = [
    {
      id: 'overview' as const,
      label: '1. Visão Geral & Pesquisa',
      icon: Tv,
      desc: 'Conceito, Participantes, Dossiê e Quadros'
    },
    {
      id: 'script' as const,
      label: '2. Roteiro & Direção',
      icon: FileText,
      desc: 'Falas, Teleprompter, Perguntas & Repiques'
    },
    {
      id: 'production' as const,
      label: '3. Produção & Câmeras',
      icon: Video,
      desc: 'Mapa do Estúdio, Shorts e Checklist'
    },
    {
      id: 'recording' as const,
      label: '4. Gravação & Estúdio',
      icon: Play,
      desc: 'Modo Estúdio REC e Handoff para Edição'
    }
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Workspace Top Header Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <button
              onClick={onBackToDashboard}
              className="mt-1 p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
              title="Voltar"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                {program && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-800">
                    {program.name}
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300">
                  {episode.format}
                </span>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {episode.targetDurationMinutes} min
                </span>
                <span className="text-xs text-slate-500">•</span>
                <span className="text-xs text-slate-400">
                  Status: <strong className="text-emerald-400 uppercase">{episode.status}</strong>
                </span>
              </div>

              <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
                {episode.title}
              </h1>
              <p className="text-xs text-slate-400 line-clamp-1 max-w-2xl mt-0.5">
                {episode.topic || episode.synopsis}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onOpenAiAssistant}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 hover:text-purple-200 text-xs font-semibold border border-purple-900/40 transition"
              title="Assistente de Direção IA"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              Copiloto IA
            </button>

            <button
              onClick={onOpenExportModal}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition"
              title="Exportar roteiro e fichas"
            >
              <Download className="w-3.5 h-3.5" />
              Exportar
            </button>

            <button
              onClick={onLaunchStudio}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold shadow-md shadow-red-950/40 transition animate-pulse"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              Modo Estúdio (REC)
            </button>
          </div>
        </div>

        {/* 4 Main Workspace Navigation Tabs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-5 pt-4 border-t border-slate-800/80">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`p-3 rounded-xl text-left border transition ${
                  isActive
                    ? 'bg-purple-950/60 border-purple-500 shadow-md text-white'
                    : 'bg-slate-950/40 border-slate-800/80 text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-purple-400' : 'text-slate-500'}`} />
                  <span className={`text-xs font-bold ${isActive ? 'text-white' : 'text-slate-300'}`}>
                    {tab.label}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 truncate">{tab.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content Display */}
      {activeTab === 'overview' && (
        <EpisodeOverviewWorkspace
          episode={episode}
          program={program}
          onUpdateEpisode={handleUpdateEpisodeFields}
          onAdvanceToScript={() => setActiveTab('script')}
        />
      )}

      {activeTab === 'script' && (
        <EpisodeScriptWorkspace
          episode={episode}
          availableCameras={availableCameras}
          onUpdateEpisode={onUpdateEpisode}
          onLaunchStudio={onLaunchStudio}
        />
      )}

      {activeTab === 'production' && (
        <EpisodeProductionWorkspace
          episode={episode}
          availableCameras={availableCameras}
          onUpdateEpisode={onUpdateEpisode}
        />
      )}

      {activeTab === 'recording' && (
        <EpisodeRecordingWorkspace
          episode={episode}
          availableCameras={availableCameras}
          onUpdateEpisode={onUpdateEpisode}
          onLaunchStudio={onLaunchStudio}
        />
      )}
    </div>
  );
};
