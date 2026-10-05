import React, { useState } from 'react';
import {
  Play,
  CheckCircle,
  AlertTriangle,
  Clock,
  Film,
  Send,
  FileCheck2,
  Tv,
  Users,
  Video,
  Scissors,
  CheckCircle2,
  Bookmark,
  Share2,
  MessageSquare
} from 'lucide-react';
import { Episode, CameraConfig } from '../../types';

interface EpisodeRecordingWorkspaceProps {
  episode: Episode;
  availableCameras: CameraConfig[];
  onUpdateEpisode: (updated: Episode) => void;
  onLaunchStudio: () => void;
}

export const EpisodeRecordingWorkspace: React.FC<EpisodeRecordingWorkspaceProps> = ({
  episode,
  availableCameras,
  onUpdateEpisode,
  onLaunchStudio,
}) => {
  const [editorNotes, setEditorNotes] = useState(episode.editorialNotesForPost || '');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Compute readiness score
  const hasScript = (episode.script || []).length >= 2;
  const hasParticipants = (episode.participants || []).length >= 1;
  const hasDiagnosis = !!episode.diagnosis?.centralTheme;
  const totalChecks = (episode.checklist || []).length;
  const completedChecks = (episode.checklist || []).filter(c => c.completed).length;
  const checklistOk = totalChecks === 0 || completedChecks / totalChecks >= 0.7;

  let readinessScore = 0;
  if (hasScript) readinessScore += 35;
  if (hasParticipants) readinessScore += 25;
  if (hasDiagnosis) readinessScore += 20;
  if (checklistOk) readinessScore += 20;

  const handleSaveEditorNotes = () => {
    onUpdateEpisode({
      ...episode,
      editorialNotesForPost: editorNotes,
      updatedAt: new Date().toISOString()
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleStatusChange = (newStatus: Episode['status']) => {
    onUpdateEpisode({
      ...episode,
      status: newStatus,
      updatedAt: new Date().toISOString()
    });
  };

  return (
    <div className="space-y-6">
      {/* Studio Readiness Hero */}
      <div className="bg-gradient-to-r from-purple-950/80 via-slate-900 to-slate-900 border border-purple-800/40 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-red-600/10 to-transparent pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                readinessScore >= 80
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                  : 'bg-amber-950 text-amber-300 border-amber-700'
              }`}>
                Prontidão de Estúdio: {readinessScore}%
              </span>
              <span className="text-xs text-slate-400">
                Status Atual: <strong className="text-purple-300 uppercase">{episode.status}</strong>
              </span>
            </div>

            <h2 className="text-2xl font-black text-white tracking-tight">
              Central de Gravação & Execução
            </h2>
            <p className="text-sm text-slate-300 max-w-xl">
              Abra a central com teleprompter em tela cheia, switcher virtual, marcação de câmeras e temporizador com repiques em tempo real.
            </p>
          </div>

          <div className="flex flex-col items-center sm:flex-row gap-3">
            <button
              onClick={onLaunchStudio}
              className="w-full sm:w-auto px-6 py-3.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-sm shadow-xl shadow-red-950/50 flex items-center justify-center gap-2.5 transition transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <Play className="w-5 h-5 fill-white" />
              Lançar Modo Estúdio (REC)
            </button>
          </div>
        </div>

        {/* Readiness Checklist Micro-cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${hasDiagnosis ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'}`}>
              <FileCheck2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold">Conceito Editorial</p>
              <p className="text-xs font-semibold text-white">
                {hasDiagnosis ? 'Validado & Definido' : 'Pendente'}
              </p>
            </div>
          </div>

          <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${hasParticipants ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'}`}>
              <Users className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold">Participantes</p>
              <p className="text-xs font-semibold text-white">
                {(episode.participants || []).length} Confirmado(s)
              </p>
            </div>
          </div>

          <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${hasScript ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'}`}>
              <Tv className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold">Roteiro Técnico</p>
              <p className="text-xs font-semibold text-white">
                {(episode.script || []).length} Falas / Cenas
              </p>
            </div>
          </div>

          <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${checklistOk ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'}`}>
              <Video className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold">Checklist Técnico</p>
              <p className="text-xs font-semibold text-white">
                {completedChecks}/{totalChecks} Verificados
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Lifecycle status & Post-Production handoff */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Workflow Status changer */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-400" />
              Etapa Atual do Episódio
            </h3>

            <div className="space-y-2">
              {[
                { key: 'ready', label: 'Pronto para Gravar', desc: 'Roteiro e estúdio prontos' },
                { key: 'recording', label: 'Em Gravação (Ao Vivo)', desc: 'Sessão de estúdio em andamento' },
                { key: 'recorded', label: 'Gravado (Bruto Salvo)', desc: 'Cartões descarregados' },
                { key: 'editing', label: 'Em Pós-Produção / Edição', desc: 'Corte, correção de cor e mix' },
                { key: 'published', label: 'Publicado', desc: 'Distribuído no YouTube / Redes' },
              ].map(st => {
                const isCurrent = episode.status === st.key;
                return (
                  <button
                    key={st.key}
                    onClick={() => handleStatusChange(st.key as Episode['status'])}
                    className={`w-full text-left p-3 rounded-lg border transition text-xs flex items-center justify-between ${
                      isCurrent
                        ? 'bg-purple-950/50 border-purple-500 text-white font-bold'
                        : 'bg-slate-950/50 border-slate-800 text-slate-300 hover:bg-slate-800/40'
                    }`}
                  >
                    <div>
                      <p className={isCurrent ? 'text-purple-300' : 'text-slate-200'}>{st.label}</p>
                      <p className="text-[10px] text-slate-400 font-normal">{st.desc}</p>
                    </div>
                    {isCurrent && <CheckCircle className="w-4 h-4 text-purple-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Post-Production & Editor Handoff Dossier */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-pink-400" />
                  Roteiro de Pós-Produção & Instruções para Edição
                </h3>
                <p className="text-xs text-slate-400">
                  Transmita ao editor os melhores takes, marcações de tempo e diretrizes de corte.
                </p>
              </div>

              <button
                onClick={handleSaveEditorNotes}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold transition"
              >
                <Send className="w-3.5 h-3.5" />
                Salvar Notas
              </button>
            </div>

            {saveSuccess && (
              <div className="p-2.5 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-lg text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Notas de edição salvas com sucesso!
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Orientações do Diretor para o Editor de Vídeo:
              </label>
              <textarea
                value={editorNotes}
                onChange={e => setEditorNotes(e.target.value)}
                placeholder="Exemplo: No Bloco 2, manter o corte na reação silenciosa do convidado. Usar trilha de tensão no momento em que ele cita o ano de 2020. Cortar os 3 primeiros shorts com ritmo acelerado conforme a aba de Cortes..."
                rows={8}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 leading-relaxed font-sans"
              />
            </div>

            {/* Shorts Summary for Editor */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2">
              <span className="text-xs font-bold text-pink-400 uppercase tracking-wider flex items-center gap-2">
                <Scissors className="w-3.5 h-3.5" />
                Cortes Planejados para Entrega:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {(episode.plannedShorts || []).map((sh, idx) => (
                  <div key={sh.id || idx} className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-xs">
                    <p className="font-semibold text-white">{sh.title}</p>
                    <p className="text-[10px] text-amber-300 italic mt-0.5">Gancho: "{sh.suggestedHook}"</p>
                    <span className="text-[10px] text-slate-400 mt-1 block">Foco de Câmera: {sh.cameraFocus}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
