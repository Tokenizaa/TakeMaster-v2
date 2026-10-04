import React, { useState } from 'react';
import {
  ListOrdered,
  Sparkles,
  Plus,
  Clock,
  ArrowUp,
  ArrowDown,
  Trash2,
  Edit2,
  Check,
  AlertCircle,
  Loader2,
  HelpCircle,
  GitBranch
} from 'lucide-react';
import { Episode, OutlineBlock, QuestionItem } from '../../types';
import { api } from '../../services/api';

interface OutlineTabProps {
  episode: Episode;
  onUpdateEpisode: (updated: Partial<Episode>) => void;
  onAdvanceToNextTab: () => void;
}

export const OutlineTab: React.FC<OutlineTabProps> = ({
  episode,
  onUpdateEpisode,
  onAdvanceToNextTab,
}) => {
  const [loading, setLoading] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDuration, setEditDuration] = useState(5);
  const [editObjective, setEditObjective] = useState('');
  const [editTransition, setEditTransition] = useState('');

  const outline = episode.outline || [];
  const questions = episode.questions || [];

  const plannedTotalMinutes = outline.reduce(
    (acc, b) => acc + (Number(b.estimatedDurationMin) || 0),
    0
  );
  const targetMinutes = episode.targetDurationMin || 45;
  const diffMinutes = plannedTotalMinutes - targetMinutes;

  const handleGenerateOutlineWithAi = async () => {
    setLoading(true);
    try {
      const result = await api.aiOutline({
        idea: episode.idea,
        guestName: episode.guestName || 'Convidado',
        targetDurationMin: episode.targetDurationMin,
        diagnosis: episode.diagnosis,
        research: episode.research,
      });

      onUpdateEpisode({
        outline: result.outline,
        questions: result.questions?.length ? result.questions : episode.questions,
      });
    } catch (err) {
      console.error('Failed to generate outline with AI:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustDurationProportionally = () => {
    if (outline.length === 0 || plannedTotalMinutes === 0) return;
    const factor = targetMinutes / plannedTotalMinutes;
    let distributed = 0;

    const updated = outline.map((b, idx) => {
      if (idx === outline.length - 1) {
        // Last block absorbs remainder so sum is exact!
        const lastDuration = Math.max(2, targetMinutes - distributed);
        return { ...b, estimatedDurationMin: lastDuration };
      }
      const newDur = Math.max(2, Math.round(b.estimatedDurationMin * factor));
      distributed += newDur;
      return { ...b, estimatedDurationMin: newDur };
    });

    onUpdateEpisode({ outline: updated });
  };

  const handleMoveBlock = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= outline.length) return;

    const newOutline = [...outline];
    const temp = newOutline[index];
    newOutline[index] = newOutline[targetIdx];
    newOutline[targetIdx] = temp;

    // Recalculate block numbers
    const renumbered = newOutline.map((b, i) => ({
      ...b,
      blockNumber: i + 1,
    }));

    onUpdateEpisode({ outline: renumbered });
  };

  const handleDeleteBlock = (id: string) => {
    const filtered = outline.filter((b) => b.id !== id);
    const renumbered = filtered.map((b, i) => ({
      ...b,
      blockNumber: i + 1,
    }));
    onUpdateEpisode({ outline: renumbered });
  };

  const handleAddBlock = () => {
    const newBlock: OutlineBlock = {
      id: `block-${Date.now()}`,
      blockNumber: outline.length + 1,
      title: 'Novo Bloco da Pauta',
      estimatedDurationMin: 5,
      objective: 'Objetivo principal deste momento da conversa.',
      keyThemes: [],
      transitionText: 'Ponte narrativa para conectar com o próximo assunto.',
    };

    onUpdateEpisode({ outline: [...outline, newBlock] });
    startEditing(newBlock);
  };

  const startEditing = (block: OutlineBlock) => {
    setEditingBlockId(block.id);
    setEditTitle(block.title);
    setEditDuration(block.estimatedDurationMin);
    setEditObjective(block.objective);
    setEditTransition(block.transitionText || '');
  };

  const saveEditing = () => {
    if (!editingBlockId) return;
    const updated = outline.map((b) =>
      b.id === editingBlockId
        ? {
            ...b,
            title: editTitle,
            estimatedDurationMin: Number(editDuration) || 5,
            objective: editObjective,
            transitionText: editTransition,
          }
        : b
    );
    onUpdateEpisode({ outline: updated });
    setEditingBlockId(null);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner and Duration Controller */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <ListOrdered className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-100">Editor Visual de Pauta & Blocos</h2>
            <p className="text-xs text-zinc-400">
              Estruture a narrativa em blocos reorganizáveis com controle estrito do tempo de gravação.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleGenerateOutlineWithAi}
            disabled={loading}
            className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>✨ Gerar Pauta com IA</span>
          </button>

          <button
            onClick={handleAddBlock}
            className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo Bloco</span>
          </button>

          <button
            onClick={onAdvanceToNextTab}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Avançar para Roteiro →
          </button>
        </div>
      </div>

      {/* Time Tracking Widget */}
      <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-zinc-400" />
            <span className="text-zinc-400">Duração Planejada:</span>
            <span className="text-base font-bold text-zinc-100">{plannedTotalMinutes} minutos</span>
          </div>
          <span className="text-zinc-600">|</span>
          <div>
            <span className="text-zinc-400">Meta do Programa:</span>{' '}
            <strong className="text-zinc-200">{targetMinutes} minutos</strong>
          </div>
          {diffMinutes !== 0 && (
            <span
              className={`px-2 py-0.5 rounded font-bold ${
                diffMinutes > 0
                  ? 'bg-amber-950/60 border border-amber-800 text-amber-400'
                  : 'bg-sky-950/60 border border-sky-800 text-sky-400'
              }`}
            >
              {diffMinutes > 0 ? `+${diffMinutes} min (excesso)` : `${diffMinutes} min (abaixo)`}
            </span>
          )}
        </div>

        {diffMinutes !== 0 && (
          <button
            onClick={handleAdjustDurationProportionally}
            className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>✨ Ajustar exatamente para {targetMinutes} min</span>
          </button>
        )}
      </div>

      {/* Blocks List */}
      <div className="space-y-4">
        {outline.map((block, index) => {
          const isEditingThis = editingBlockId === block.id;
          const blockQuestions = questions.filter((q) => q.blockId === block.id);
          const totalFollowups = blockQuestions.reduce(
            (acc, q) => acc + (q.followUps?.length || 0),
            0
          );

          return (
            <div
              key={block.id}
              className={`bg-zinc-900 border rounded-xl p-5 transition-all shadow-sm ${
                isEditingThis
                  ? 'border-amber-500/80 ring-1 ring-amber-500/30'
                  : 'border-zinc-800 hover:border-zinc-700'
              }`}
            >
              {isEditingThis ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
                        Título do Bloco
                      </label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm font-bold text-zinc-100 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div className="w-32">
                      <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
                        Duração (min)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={120}
                        value={editDuration}
                        onChange={(e) => setEditDuration(Number(e.target.value))}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm font-bold text-zinc-100 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
                      Objetivo Narrativo do Bloco
                    </label>
                    <textarea
                      rows={2}
                      value={editObjective}
                      onChange={(e) => setEditObjective(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
                      Texto de Transição / Ponte
                    </label>
                    <textarea
                      rows={2}
                      value={editTransition}
                      onChange={(e) => setEditTransition(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                    <button
                      onClick={() => setEditingBlockId(null)}
                      className="px-3 py-1.5 bg-zinc-800 text-zinc-300 text-xs rounded-lg cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={saveEditing}
                      className="px-4 py-1.5 bg-amber-500 text-zinc-950 font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Salvar Bloco</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    {/* Header line */}
                    <div className="flex items-center gap-2.5">
                      <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono text-[11px] font-bold rounded">
                        BLOCO {String(block.blockNumber).padStart(2, '0')}
                      </span>
                      <h3 className="text-base font-bold text-zinc-100">{block.title}</h3>
                      <span className="text-xs font-mono font-bold text-zinc-400 flex items-center gap-1 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                        <Clock className="w-3 h-3 text-amber-400" />
                        {block.estimatedDurationMin} min
                      </span>
                    </div>

                    {/* Objective */}
                    <p className="text-xs text-zinc-300 leading-relaxed font-medium">
                      <strong className="text-zinc-400 font-mono font-normal">Objetivo: </strong>
                      {block.objective}
                    </p>

                    {/* Transition Bridge */}
                    {block.transitionText && (
                      <p className="text-xs text-amber-300/80 bg-zinc-950/60 p-2.5 rounded-lg border border-amber-900/20 italic">
                        "{block.transitionText}"
                      </p>
                    )}

                    {/* Questions & Repiques counters */}
                    <div className="flex items-center gap-4 text-xs font-mono text-zinc-400 pt-1">
                      <span className="flex items-center gap-1">
                        <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
                        {blockQuestions.length} perguntas
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <GitBranch className="w-3.5 h-3.5 text-indigo-400" />
                        {totalFollowups} repiques inteligentes
                      </span>
                    </div>
                  </div>

                  {/* Actions and Reorder */}
                  <div className="flex items-center gap-1 shrink-0 pt-1">
                    <button
                      onClick={() => handleMoveBlock(index, 'up')}
                      disabled={index === 0}
                      className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors disabled:opacity-30 cursor-pointer"
                      title="Mover para cima"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleMoveBlock(index, 'down')}
                      disabled={index === outline.length - 1}
                      className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors disabled:opacity-30 cursor-pointer"
                      title="Mover para baixo"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => startEditing(block)}
                      className="p-1.5 text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 rounded transition-colors cursor-pointer"
                      title="Editar bloco"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDeleteBlock(block.id)}
                      className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded transition-colors cursor-pointer"
                      title="Excluir bloco"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
