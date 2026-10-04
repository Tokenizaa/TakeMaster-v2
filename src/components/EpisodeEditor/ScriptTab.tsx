import React, { useState } from 'react';
import {
  FileText,
  Sparkles,
  Plus,
  Camera,
  Eye,
  Trash2,
  Edit2,
  Check,
  Video,
  GitBranch,
  Volume2,
  Tv,
  Loader2,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Maximize2
} from 'lucide-react';
import { Episode, ScriptItem, QuestionItem, FollowUpItem } from '../../types';
import { getCameraColor } from '../../utils/format';
import { api } from '../../services/api';

interface ScriptTabProps {
  episode: Episode;
  onUpdateEpisode: (updated: Partial<Episode>) => void;
  onAdvanceToNextTab: () => void;
  onOpenTeleprompter: (initialText?: string) => void;
}

export const ScriptTab: React.FC<ScriptTabProps> = ({
  episode,
  onUpdateEpisode,
  onAdvanceToNextTab,
  onOpenTeleprompter,
}) => {
  const [loading, setLoading] = useState(false);
  const [repiquesLoadingId, setRepiquesLoadingId] = useState<string | null>(null);
  const [expandedQuestionIds, setExpandedQuestionIds] = useState<Record<string, boolean>>({});
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [showAddItemModal, setShowAddItemModal] = useState(false);

  // New item modal form state
  const [newTimestamp, setNewTimestamp] = useState('00:00');
  const [newType, setNewType] = useState<ScriptItem['type']>('question');
  const [newCamera, setNewCamera] = useState('CAM 2');
  const [newSpeaker, setNewSpeaker] = useState(episode.host || 'Apresentador');
  const [newEyeDirection, setNewEyeDirection] = useState('Olhar para convidado');
  const [newContent, setNewContent] = useState('');
  const [newMarkers, setNewMarkers] = useState('OLHAR PARA CONVIDADO, CORTE → CAM 3');

  const script = episode.script || [];
  const questions = episode.questions || [];

  const handleWriteScriptWithAi = async () => {
    setLoading(true);
    try {
      const res = await api.aiScript(episode);
      if (res.script && res.script.length > 0) {
        onUpdateEpisode({ script: res.script, status: 'scripting' });
      }
    } catch (err) {
      console.error('Failed to generate full script with AI:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateRepiques = async (q: QuestionItem) => {
    setRepiquesLoadingId(q.id);
    try {
      const res = await api.aiRepiques({
        questionText: q.text,
        context: episode.diagnosis?.primaryConflict,
        guestName: episode.guestName,
      });

      if (res.followUps) {
        const updatedQuestions = questions.map((item) =>
          item.id === q.id
            ? { ...item, followUps: [...(item.followUps || []), ...res.followUps] }
            : item
        );
        onUpdateEpisode({ questions: updatedQuestions });
        setExpandedQuestionIds((prev) => ({ ...prev, [q.id]: true }));
      }
    } catch (err) {
      console.error('Failed to generate repiques:', err);
    } finally {
      setRepiquesLoadingId(null);
    }
  };

  const handleToggleQuestionExpand = (id: string) => {
    setExpandedQuestionIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleDeleteItem = (id: string) => {
    const updated = script.filter((it) => it.id !== id);
    onUpdateEpisode({ script: updated });
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const item: ScriptItem = {
      id: `sc-${Date.now()}`,
      timestamp: newTimestamp,
      type: newType,
      camera: newCamera,
      speaker: newSpeaker,
      eyeDirection: newEyeDirection,
      shotType: 'Plano Médio',
      content: newContent,
      directionalMarkers: newMarkers
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      isTeleprompter: newType === 'opening' || newType === 'closing',
    };

    onUpdateEpisode({ script: [...script, item] });
    setShowAddItemModal(false);
    setNewContent('');
  };

  const handleAddRepiqueManually = (questionId: string) => {
    const newFollowup: FollowUpItem = {
      id: `fu-${Date.now()}`,
      triggerCondition: 'SE FALAR SOBRE...',
      actionOrQuestion: 'Pergunta de aprofundamento...',
      tag: 'APROFUNDAR',
    };

    const updatedQuestions = questions.map((q) =>
      q.id === questionId
        ? { ...q, followUps: [...(q.followUps || []), newFollowup] }
        : q
    );
    onUpdateEpisode({ questions: updatedQuestions });
    setExpandedQuestionIds((prev) => ({ ...prev, [questionId]: true }));
  };

  const handleUpdateRepique = (
    questionId: string,
    repiqueId: string,
    fields: Partial<FollowUpItem>
  ) => {
    const updatedQuestions = questions.map((q) => {
      if (q.id !== questionId) return q;
      return {
        ...q,
        followUps: (q.followUps || []).map((fu) =>
          fu.id === repiqueId ? { ...fu, ...fields } : fu
        ),
      };
    });
    onUpdateEpisode({ questions: updatedQuestions });
  };

  const handleDeleteRepique = (questionId: string, repiqueId: string) => {
    const updatedQuestions = questions.map((q) => {
      if (q.id !== questionId) return q;
      return {
        ...q,
        followUps: (q.followUps || []).filter((fu) => fu.id !== repiqueId),
      };
    });
    onUpdateEpisode({ questions: updatedQuestions });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-100">Roteiro Técnico & Direção de 3 Câmeras</h2>
            <p className="text-xs text-zinc-400">
              Marcação cronológica com instruções de olhar, corte de câmeras e repiques investigativos.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleWriteScriptWithAi}
            disabled={loading}
            className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>✨ Escrever Roteiro com IA</span>
          </button>

          <button
            onClick={() => setShowAddItemModal(true)}
            className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar Fala / Corte</span>
          </button>

          <button
            onClick={onAdvanceToNextTab}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Avançar para Câmeras →
          </button>
        </div>
      </div>

      {/* Script Timeline Items */}
      <div className="space-y-4">
        {script.length === 0 ? (
          <div className="text-center py-12 px-4 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/40">
            <FileText className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
            <p className="text-xs text-zinc-400">
              Nenhum item no roteiro ainda. Clique em "Escrever Roteiro com IA" para gerar a abertura, perguntas nas câmeras corretas e encerramento.
            </p>
          </div>
        ) : (
          script.map((item) => {
            const camStyle = getCameraColor(item.camera);
            const matchingQuestion = questions.find(
              (q) => q.id === item.questionRefId || item.content.includes(q.text.slice(0, 20))
            );
            const isQuestionExpanded = matchingQuestion
              ? !!expandedQuestionIds[matchingQuestion.id]
              : false;

            return (
              <div
                key={item.id}
                className="bg-zinc-900/80 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700/80 rounded-xl p-5 transition-all shadow-sm space-y-3"
              >
                {/* Meta row: Timecode, Camera badge, Eye direction */}
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    {/* Timecode badge */}
                    <span className="font-mono font-bold text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800 text-[11px]">
                      {item.timestamp}
                    </span>

                    {/* Camera Badge */}
                    <span
                      className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] flex items-center gap-1 ${camStyle.badge}`}
                    >
                      <Camera className="w-3 h-3" />
                      {item.camera}
                    </span>

                    {/* Type badge */}
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
                      {item.type}
                    </span>

                    {/* Eye direction */}
                    {item.eyeDirection && (
                      <span className="hidden sm:flex items-center gap-1 text-[11px] text-zinc-400 font-mono">
                        <Eye className="w-3 h-3 text-zinc-500" />
                        {item.eyeDirection}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {item.isTeleprompter && (
                      <button
                        onClick={() => onOpenTeleprompter(item.content)}
                        className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded text-[11px] font-mono flex items-center gap-1 transition-colors cursor-pointer"
                        title="Abrir esta fala no Teleprompter em tela cheia"
                      >
                        <Maximize2 className="w-3 h-3" />
                        <span>Teleprompter</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="text-zinc-600 hover:text-red-400 p-1 rounded transition-colors cursor-pointer"
                      title="Excluir item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Speaker Header */}
                <div className="text-xs font-bold text-zinc-200 uppercase tracking-wide font-mono flex items-center gap-2">
                  <span>{item.speaker}</span>
                  {item.targetPerson && (
                    <span className="text-zinc-500 font-normal">→ {item.targetPerson}</span>
                  )}
                </div>

                {/* Spoken Content */}
                <p className="text-sm text-zinc-100 font-medium leading-relaxed font-sans bg-zinc-950/40 p-3.5 rounded-lg border border-zinc-800/60">
                  {item.content}
                </p>

                {/* Directional Tags (PAUSA, CORTE, NÃO INTERROMPER, etc.) */}
                {item.directionalMarkers && item.directionalMarkers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {item.directionalMarkers.map((marker, idx) => (
                      <span
                        key={idx}
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                          marker.includes('NÃO INTERROMPER') || marker.includes('PAUSA')
                            ? 'bg-red-950/70 border-red-700/60 text-red-400'
                            : marker.includes('CORTE') || marker.includes('CAM')
                            ? 'bg-amber-950/70 border-amber-700/60 text-amber-400'
                            : marker.includes('COLD OPEN') || marker.includes('FRASE FORTE')
                            ? 'bg-purple-950/70 border-purple-700/60 text-purple-400'
                            : 'bg-zinc-800 border-zinc-700 text-zinc-300'
                        }`}
                      >
                        [{marker}]
                      </span>
                    ))}
                  </div>
                )}

                {/* Linked Question & Intelligent Repiques Section */}
                {matchingQuestion && (
                  <div className="mt-3 pt-3 border-t border-zinc-800/80 bg-zinc-950/50 p-3.5 rounded-lg">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => handleToggleQuestionExpand(matchingQuestion.id)}
                        className="flex items-center gap-2 text-xs font-bold text-indigo-400 hover:text-indigo-300 font-mono uppercase cursor-pointer"
                      >
                        <GitBranch className="w-3.5 h-3.5" />
                        <span>
                          Repiques Inteligentes ({(matchingQuestion.followUps || []).length})
                        </span>
                        {isQuestionExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleGenerateRepiques(matchingQuestion)}
                          disabled={repiquesLoadingId === matchingQuestion.id}
                          className="px-2 py-1 bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-800/80 rounded text-[11px] font-mono flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {repiquesLoadingId === matchingQuestion.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Sparkles className="w-3 h-3" />
                          )}
                          <span>✨ Gerar Repiques IA</span>
                        </button>

                        <button
                          onClick={() => handleAddRepiqueManually(matchingQuestion.id)}
                          className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[11px] font-mono flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Adicionar Repique</span>
                        </button>
                      </div>
                    </div>

                    {/* Follow-up branch cards */}
                    {isQuestionExpanded && (
                      <div className="space-y-2 mt-3 pl-2 border-l-2 border-indigo-500/30">
                        {(matchingQuestion.followUps || []).map((fu) => (
                          <div
                            key={fu.id}
                            className="bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 flex items-start justify-between gap-3 text-xs"
                          >
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[10px] font-bold text-amber-400 bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-800/60">
                                  {fu.triggerCondition}
                                </span>
                                <span className="text-[10px] font-mono text-zinc-400 font-semibold">
                                  tag: {fu.tag}
                                </span>
                              </div>
                              <input
                                type="text"
                                value={fu.actionOrQuestion}
                                onChange={(e) =>
                                  handleUpdateRepique(matchingQuestion.id, fu.id, {
                                    actionOrQuestion: e.target.value,
                                  })
                                }
                                className="w-full bg-transparent border-b border-transparent hover:border-zinc-700 focus:border-indigo-500 text-xs text-zinc-200 focus:outline-none"
                              />
                            </div>

                            <button
                              onClick={() => handleDeleteRepique(matchingQuestion.id, fu.id)}
                              className="text-zinc-600 hover:text-red-400 p-1 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal Add Item */}
      {showAddItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-lg p-6 space-y-4">
            <h3 className="text-sm font-bold text-zinc-100">Adicionar Momento / Fala ao Roteiro</h3>
            <form onSubmit={handleAddItem} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-300 mb-1">Timecode (Minutagem)</label>
                  <input
                    type="text"
                    value={newTimestamp}
                    onChange={(e) => setNewTimestamp(e.target.value)}
                    placeholder="00:00"
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-300 mb-1">Câmera Principal</label>
                  <select
                    value={newCamera}
                    onChange={(e) => setNewCamera(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="CAM 1">CAM 1 (Frontal Apresentador)</option>
                    <option value="CAM 2">CAM 2 (45° Apresentador)</option>
                    <option value="CAM 3">CAM 3 (45° Convidado)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-300 mb-1">Quem Fala (Speaker)</label>
                  <input
                    type="text"
                    value={newSpeaker}
                    onChange={(e) => setNewSpeaker(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-300 mb-1">Direção do Olhar</label>
                  <select
                    value={newEyeDirection}
                    onChange={(e) => setNewEyeDirection(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Olhar para a lente">Olhar para a lente (Audiência)</option>
                    <option value="Olhar para convidado">Olhar para convidado</option>
                    <option value="Olhar para bancada">Olhar para bancada / objeto</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-300 mb-1">Conteúdo da Fala / Pergunta</label>
                <textarea
                  rows={3}
                  required
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Ex: João, quando você percebeu que aquilo poderia realmente virar uma empresa?"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-300 mb-1">Marcadores de Direção (separados por vírgula)</label>
                <input
                  type="text"
                  value={newMarkers}
                  onChange={(e) => setNewMarkers(e.target.value)}
                  placeholder="OLHAR PARA LENTE, CORTE SECO, PAUSA, B-ROLL"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddItemModal(false)}
                  className="px-3 py-1.5 bg-zinc-800 text-zinc-300 text-xs rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-500 text-zinc-950 font-bold text-xs rounded-lg cursor-pointer"
                >
                  Adicionar ao Roteiro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
