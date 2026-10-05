import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  Sparkles,
  Camera,
  HelpCircle,
  CornerDownRight,
  MessageSquare,
  Clock,
  Play,
  CheckCircle,
  Tv,
  Users,
  ChevronDown,
  ChevronRight,
  Wand2,
  RefreshCw,
  Loader2,
  Volume2
} from 'lucide-react';
import {
  Episode,
  Segment,
  QuestionItem,
  ScriptItem,
  CameraConfig
} from '../../types';
import { api } from '../../services/api';
import { getCameraColorClass } from '../../utils/format';

interface EpisodeScriptWorkspaceProps {
  episode: Episode;
  availableCameras: CameraConfig[];
  onUpdateEpisode: (updated: Episode) => void;
  onLaunchStudio: () => void;
}

export const EpisodeScriptWorkspace: React.FC<EpisodeScriptWorkspaceProps> = ({
  episode,
  availableCameras,
  onUpdateEpisode,
  onLaunchStudio,
}) => {
  const [selectedSegmentId, setSelectedSegmentId] = useState<string>(
    episode.segments?.[0]?.id || ''
  );
  const [expandedQuestions, setExpandedQuestions] = useState<Record<string, boolean>>({});
  const [aiGenerating, setAiGenerating] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionSpeaker, setNewQuestionSpeaker] = useState(episode.participants?.[0]?.name || 'Apresentador');
  const [newQuestionObjective, setNewQuestionObjective] = useState('');
  const [newQuestionCamera, setNewQuestionCamera] = useState(availableCameras[0]?.name || 'CAM 1 (Apresentador)');

  const segments = episode.segments || [];
  const activeSegment = segments.find(s => s.id === selectedSegmentId) || segments[0];

  const toggleQuestionExpanded = (id: string) => {
    setExpandedQuestions(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddQuestionToSegment = (segId: string) => {
    if (!newQuestionText.trim()) return;

    const newQuestion: QuestionItem = {
      id: `q-${Date.now()}`,
      segmentId: segId,
      speaker: newQuestionSpeaker,
      text: newQuestionText,
      objective: newQuestionObjective || 'Explorar detalhes da história e provocar revelação',
      recommendedCamera: newQuestionCamera,
      status: 'pending',
      followUps: [
        {
          id: `fu-${Date.now()}-1`,
          condition: 'Se a resposta for técnica demais ou prolixa',
          action: 'Intervir pedindo um exemplo prático: "Como isso funcionou no dia mais difícil?"',
          cameraCue: 'Cortar para CAM 1 ou Plano Médio'
        },
        {
          id: `fu-${Date.now()}-2`,
          condition: 'Se houver hesitação ou emoção forte',
          action: 'Silenciar por 3 segundos e aprofundar com: "O que você sentiu exatamente naquele segundo?"',
          cameraCue: 'Fechar para Close-up no Convidado'
        }
      ]
    };

    const updatedSegments = segments.map(s => {
      if (s.id === segId) {
        return {
          ...s,
          questions: [...(s.questions || []), newQuestion]
        };
      }
      return s;
    });

    onUpdateEpisode({
      ...episode,
      segments: updatedSegments,
      updatedAt: new Date().toISOString()
    });

    setNewQuestionText('');
    setNewQuestionObjective('');
  };

  const handleUpdateScriptItem = (index: number, updatedItem: ScriptItem) => {
    const updated = [...(episode.script || [])];
    updated[index] = updatedItem;
    onUpdateEpisode({
      ...episode,
      script: updated,
      updatedAt: new Date().toISOString()
    });
  };

  const handleAddScriptBlock = () => {
    const newBlock: ScriptItem = {
      id: `sc-${Date.now()}`,
      order: (episode.script?.length || 0) + 1,
      speaker: episode.presenterName || 'Apresentador',
      cameraInstruction: availableCameras[0]?.name || 'CAM 1 (Apresentador)',
      teleprompterText: 'Boa noite e sejam muito bem-vindos a mais uma edição!',
      estimatedDurationSeconds: 45,
      notes: 'Olhar fixo na câmera com tom solene e enérgico.'
    };

    onUpdateEpisode({
      ...episode,
      script: [...(episode.script || []), newBlock],
      updatedAt: new Date().toISOString()
    });
  };

  const handleDeleteScriptBlock = (index: number) => {
    const updated = (episode.script || []).filter((_, i) => i !== index);
    onUpdateEpisode({
      ...episode,
      script: updated,
      updatedAt: new Date().toISOString()
    });
  };

  const handleGenerateScriptWithAi = async () => {
    try {
      setAiGenerating(true);
      const res = await api.generateScript({
        topic: episode.topic,
        tone: episode.tone,
        format: episode.format,
        presenterName: episode.presenterName,
        participants: episode.participants,
        segments: episode.segments,
        diagnosis: episode.diagnosis,
        availableCameras
      });

      if (res.script && res.script.length > 0) {
        onUpdateEpisode({
          ...episode,
          script: res.script,
          status: episode.status === 'outline' || episode.status === 'research' ? 'scripting' : episode.status,
          updatedAt: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('Falha ao gerar roteiro via IA:', err);
    } finally {
      setAiGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Script Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
              Roteiro & Direção em Tempo Real
            </span>
            <span className="text-xs text-slate-400">
              {(episode.script || []).length} falas / marcações de estúdio
            </span>
          </div>
          <h2 className="text-lg font-bold text-white mt-1">
            Roteiro Técnico, Falas e Repiques Dinâmicos
          </h2>
          <p className="text-xs text-slate-400">
            Combine teleprompter com perguntas adaptativas, marcação de câmeras e planos de reação para os participantes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerateScriptWithAi}
            disabled={aiGenerating}
            className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50"
          >
            {aiGenerating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            {aiGenerating ? 'Gerando Roteiro com IA...' : 'Refinar Roteiro com IA'}
          </button>

          <button
            onClick={onLaunchStudio}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold shadow-md shadow-red-900/30 transition animate-pulse"
          >
            <Play className="w-4 h-4 fill-white" />
            Abrir Modo Estúdio
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Segments and Narrative Timeline Navigation */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Tv className="w-4 h-4 text-purple-400" />
                Quadros e Blocos do Programa
              </h3>
              <span className="text-xs text-slate-400">{segments.length} blocos</span>
            </div>

            <div className="space-y-2">
              {segments.map((seg, idx) => {
                const isSelected = seg.id === selectedSegmentId;
                const totalQ = seg.questions?.length || 0;

                return (
                  <button
                    key={seg.id}
                    onClick={() => setSelectedSegmentId(seg.id)}
                    className={`w-full text-left p-3 rounded-lg border transition text-xs ${
                      isSelected
                        ? 'bg-purple-950/40 border-purple-500/50 text-white'
                        : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-purple-300">
                        {idx + 1}. {seg.title}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400">
                        {seg.estimatedDurationMinutes} min
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2">
                      {seg.objective || seg.description}
                    </p>
                    <div className="mt-2 flex items-center gap-3 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <HelpCircle className="w-3 h-3 text-emerald-400" />
                        {totalQ} perguntas/repiques
                      </span>
                      {seg.primaryCamera && (
                        <span className="flex items-center gap-1 text-slate-400">
                          <Camera className="w-3 h-3" />
                          {seg.primaryCamera}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Questions & Dynamic Repiques for Active Segment */}
          {activeSegment && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
                  Perguntas de: {activeSegment.title}
                </h4>
              </div>

              {/* Add Question Box */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 space-y-2">
                <p className="text-[11px] font-semibold text-slate-300">Adicionar Pergunta Guiada</p>
                <textarea
                  value={newQuestionText}
                  onChange={e => setNewQuestionText(e.target.value)}
                  placeholder="Ex: Como você reagiu no dia da maior crise quando tudo parecia perdido?"
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400">Dirigido a:</label>
                    <select
                      value={newQuestionSpeaker}
                      onChange={e => setNewQuestionSpeaker(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-200"
                    >
                      <option value="Apresentador">Apresentador (Faz a pergunta)</option>
                      {(episode.participants || []).map(p => (
                        <option key={p.id} value={p.name}>{p.name} ({p.role})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">Câmera Recomendada:</label>
                    <select
                      value={newQuestionCamera}
                      onChange={e => setNewQuestionCamera(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-200"
                    >
                      {availableCameras.map(cam => (
                        <option key={cam.id} value={cam.name}>{cam.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <input
                  type="text"
                  value={newQuestionObjective}
                  onChange={e => setNewQuestionObjective(e.target.value)}
                  placeholder="Objetivo editorial / reação esperada..."
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-200"
                />
                <button
                  onClick={() => handleAddQuestionToSegment(activeSegment.id)}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-xs font-semibold transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Salvar Pergunta com Repiques
                </button>
              </div>

              {/* Questions List */}
              <div className="space-y-2 mt-3 max-h-[480px] overflow-y-auto pr-1">
                {(activeSegment.questions || []).map((q, qIdx) => {
                  const isExp = expandedQuestions[q.id];
                  return (
                    <div
                      key={q.id}
                      className="bg-slate-950/60 border border-slate-800 rounded-lg p-2.5 text-xs space-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-emerald-400">P{qIdx + 1}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                            {q.speaker}
                          </span>
                          <span className="text-[10px] text-purple-400 flex items-center gap-1">
                            <Camera className="w-2.5 h-2.5" />
                            {q.recommendedCamera}
                          </span>
                        </div>
                        <button
                          onClick={() => toggleQuestionExpanded(q.id)}
                          className="text-slate-400 hover:text-white"
                        >
                          {isExp ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      <p className="text-slate-200 font-medium">{q.text}</p>
                      {q.objective && (
                        <p className="text-[10px] text-slate-400 italic">Alvo: {q.objective}</p>
                      )}

                      {/* Repiques / Follow-ups */}
                      {isExp && q.followUps && q.followUps.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-800/80 space-y-1.5 pl-2">
                          <p className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                            <CornerDownRight className="w-3 h-3" />
                            Plano de Repiques & Contra-ataques:
                          </p>
                          {q.followUps.map((fu, fuIdx) => (
                            <div key={fu.id || fuIdx} className="bg-slate-900/80 rounded p-1.5 text-[10px] border border-slate-800">
                              <span className="text-amber-300 font-medium block">
                                Se: {fu.condition}
                              </span>
                              <span className="text-slate-300 block">
                                &rarr; {fu.action}
                              </span>
                              {fu.cameraCue && (
                                <span className="text-purple-300 text-[9px] block mt-0.5">
                                  Câmera: {fu.cameraCue}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right: Technical Teleprompter Script Blocks */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  Roteiro de Falas, Câmeras & Teleprompter
                </h3>
                <p className="text-xs text-slate-400">
                  Edite diretamente o texto corrido que sobe no teleprompter e as instruções de switcher.
                </p>
              </div>

              <button
                onClick={handleAddScriptBlock}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition"
              >
                <Plus className="w-3.5 h-3.5" />
                + Adicionar Bloco
              </button>
            </div>

            {/* Script Blocks List */}
            {(!episode.script || episode.script.length === 0) ? (
              <div className="py-12 text-center border-2 border-dashed border-slate-800 rounded-xl space-y-3">
                <FileText className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-sm text-slate-300 font-medium">Nenhum bloco de roteiro criado ainda.</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Gere o roteiro completo automaticamente com IA usando seus dados de pesquisa e participantes ou adicione os blocos manualmente.
                </p>
                <button
                  onClick={handleGenerateScriptWithAi}
                  disabled={aiGenerating}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Gerar Roteiro Automatizado
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {episode.script.map((item, idx) => {
                  const cameraBadgeClass = getCameraColorClass(item.cameraInstruction);

                  return (
                    <div
                      key={item.id || idx}
                      className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 transition hover:border-slate-700 space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 text-xs font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>

                          {/* Speaker Selector */}
                          <input
                            type="text"
                            value={item.speaker}
                            onChange={e => handleUpdateScriptItem(idx, { ...item, speaker: e.target.value })}
                            className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs font-bold text-purple-300 max-w-[150px]"
                            placeholder="Quem fala?"
                          />

                          {/* Camera Assignment */}
                          <div className="flex items-center gap-1">
                            <Camera className="w-3.5 h-3.5 text-slate-400" />
                            <select
                              value={item.cameraInstruction}
                              onChange={e => handleUpdateScriptItem(idx, { ...item, cameraInstruction: e.target.value })}
                              className={`rounded px-2 py-0.5 text-[11px] font-semibold border ${cameraBadgeClass}`}
                            >
                              {availableCameras.map(cam => (
                                <option key={cam.id} value={cam.name}>{cam.name}</option>
                              ))}
                              <option value="CÂMERA 1 - CLOSE APRESENTADOR">CAM 1 - CLOSE APRESENTADOR</option>
                              <option value="CÂMERA 2 - CONVIDADO">CAM 2 - CONVIDADO</option>
                              <option value="CÂMERA 3 - PLANO CONJUNTO / DOIS">CAM 3 - PLANO CONJUNTO</option>
                              <option value="PLANO GERAL AUDITÓRIO">PLANO GERAL AUDITÓRIO</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 text-[11px] text-slate-400">
                            <Clock className="w-3 h-3" />
                            <input
                              type="number"
                              value={item.estimatedDurationSeconds || 30}
                              onChange={e => handleUpdateScriptItem(idx, { ...item, estimatedDurationSeconds: parseInt(e.target.value) || 0 })}
                              className="w-12 bg-slate-900 border border-slate-700 rounded px-1 text-center text-xs text-white"
                            />
                            <span>seg</span>
                          </div>

                          <button
                            onClick={() => handleDeleteScriptBlock(idx)}
                            className="p-1 hover:bg-red-950 text-slate-500 hover:text-red-400 rounded transition"
                            title="Remover bloco"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Teleprompter text content */}
                      <div>
                        <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-1">
                          Texto Falado / Teleprompter
                        </label>
                        <textarea
                          value={item.teleprompterText}
                          onChange={e => handleUpdateScriptItem(idx, { ...item, teleprompterText: e.target.value })}
                          rows={3}
                          className="w-full bg-slate-900/90 border border-slate-700/80 rounded-lg p-3 text-sm text-slate-100 placeholder-slate-500 font-sans focus:outline-none focus:border-purple-500 leading-relaxed"
                          placeholder="Texto a ser lido no TP ou falado pelo apresentador..."
                        />
                      </div>

                      {/* Technical Direction Notes */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                        <div>
                          <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">
                            Instrução de Direção / Tom
                          </label>
                          <input
                            type="text"
                            value={item.notes || ''}
                            onChange={e => handleUpdateScriptItem(idx, { ...item, notes: e.target.value })}
                            placeholder="Ex: Olhar na câmera, respirar 2 segundos antes de soltar a pergunta"
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-300"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">
                            Corte de Switcher / Transição
                          </label>
                          <input
                            type="text"
                            value={item.transition || ''}
                            onChange={e => handleUpdateScriptItem(idx, { ...item, transition: e.target.value })}
                            placeholder="Ex: Corte seco para convidado quando ele rir"
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-300"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
