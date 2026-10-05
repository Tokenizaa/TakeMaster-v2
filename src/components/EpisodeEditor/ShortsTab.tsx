import React, { useState } from 'react';
import {
  Scissors,
  Sparkles,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Play,
  Flame,
  HelpCircle,
  Loader2
} from 'lucide-react';
import { Episode, PlannedShort } from '../../types';
import { api } from '../../services/api';

interface ShortsTabProps {
  episode: Episode;
  onUpdateEpisode: (updated: Partial<Episode>) => void;
  onAdvanceToNextTab: () => void;
}

export const ShortsTab: React.FC<ShortsTabProps> = ({
  episode,
  onUpdateEpisode,
  onAdvanceToNextTab,
}) => {
  const shorts = episode.shorts || [];
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newHook, setNewHook] = useState('');
  const [newQuestion, setNewQuestion] = useState('');
  const [newDuration, setNewDuration] = useState('45-60s');
  const [newNotes, setNewNotes] = useState('');

  const handleGenerateShortsWithAi = async () => {
    setLoading(true);
    try {
      const res = await api.aiShorts({ episode });
      if (res.shorts && res.shorts.length > 0) {
        onUpdateEpisode({ shorts: res.shorts });
      }
    } catch (err) {
      console.error('Failed to generate shorts with AI:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = (id: string) => {
    const cycle: PlannedShort['status'][] = ['Planejado', 'Capturado', 'Excelente', 'Não aconteceu'];
    const updated = shorts.map((s) => {
      if (s.id !== id) return s;
      const nextIdx = (cycle.indexOf(s.status) + 1) % cycle.length;
      return { ...s, status: cycle[nextIdx] };
    });
    onUpdateEpisode({ shorts: updated });
  };

  const handleDeleteShort = (id: string) => {
    onUpdateEpisode({ shorts: shorts.filter((s) => s.id !== id) });
  };

  const handleAddShort = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const short: PlannedShort = {
      id: `sh-${Date.now()}`,
      title: newTitle,
      hook: newHook,
      generatingQuestion: newQuestion,
      estimatedDuration: newDuration,
      status: 'Planejado',
      notes: newNotes,
    };

    onUpdateEpisode({ shorts: [...shorts, short] });
    setShowAddModal(false);
    setNewTitle('');
    setNewHook('');
    setNewQuestion('');
    setNewNotes('');
  };

  const getStatusBadge = (status: PlannedShort['status']) => {
    switch (status) {
      case 'Excelente':
        return 'bg-purple-950/70 border-purple-700/60 text-purple-400';
      case 'Capturado':
        return 'bg-emerald-950/70 border-emerald-700/60 text-emerald-400';
      case 'Planejado':
        return 'bg-sky-950/70 border-sky-700/60 text-sky-400';
      case 'Não aconteceu':
        return 'bg-zinc-800 border-zinc-700 text-zinc-500 line-through';
      default:
        return 'bg-zinc-800 border-zinc-700 text-zinc-400';
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Scissors className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-100">Planejamento Estratégico de Shorts & Reels</h2>
            <p className="text-xs text-zinc-400">
              Cortes e micro-narrativas verticais pré-planejados com ganchos fortes nos primeiros 3 segundos.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerateShortsWithAi}
            disabled={loading}
            className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>✨ Gerar Cortes com IA</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar Corte</span>
          </button>

          <button
            onClick={onAdvanceToNextTab}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Avançar para Checklist →
          </button>
        </div>
      </div>

      {/* Shorts Grid */}
      {shorts.length === 0 ? (
        <div className="text-center py-12 px-4 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/40">
          <Scissors className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
          <p className="text-xs text-zinc-400">
            Nenhum corte planejado ainda. Clique em "Gerar Cortes com IA" para prever os melhores ganchos virais.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {shorts.map((short, idx) => (
            <div
              key={short.id}
              className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl p-5 flex flex-col justify-between space-y-3 transition-all"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-mono text-xs font-bold text-amber-400">
                    SHORT #{String(idx + 1).padStart(2, '0')}
                  </span>

                  <button
                    onClick={() => handleToggleStatus(short.id)}
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border transition-colors cursor-pointer ${getStatusBadge(
                      short.status
                    )}`}
                    title="Alternar status: Planejado -> Capturado -> Excelente -> Não aconteceu"
                  >
                    {(short.status || 'Planejado').toUpperCase()}
                  </button>
                </div>

                <h3 className="text-sm font-bold text-zinc-100">{short.title}</h3>

                {/* Viral Hook */}
                <div className="mt-2 p-2.5 rounded-lg bg-zinc-950/80 border border-purple-900/30">
                  <span className="text-[10px] font-mono uppercase text-purple-400 font-bold block mb-1">
                    Gancho Inicial (0-3s)
                  </span>
                  <p className="text-xs text-zinc-200 font-medium italic">
                    "{short.hook}"
                  </p>
                </div>

                {/* Trigger Question */}
                <div className="mt-2 text-xs text-zinc-400 space-y-0.5">
                  <span className="text-[10px] font-mono uppercase text-zinc-500 font-bold block">
                    Pergunta Geradora:
                  </span>
                  <p className="text-xs text-zinc-300">"{short.generatingQuestion}"</p>
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500">
                <span className="font-mono text-[11px] text-zinc-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-zinc-500" />
                  {short.estimatedDuration}
                </span>

                <button
                  onClick={() => handleDeleteShort(short.id)}
                  className="text-zinc-600 hover:text-red-400 p-1 rounded transition-colors cursor-pointer"
                  title="Excluir corte"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Add Short */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-sm font-bold text-zinc-100">Adicionar Corte Planejado</h3>
            <form onSubmit={handleAddShort} className="space-y-3">
              <div>
                <label className="block text-xs text-zinc-300 mb-1">Título do Corte</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: O dia em que ele quase perdeu tudo"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-300 mb-1">Gancho (Hook nos 3 primeiros segundos)</label>
                <textarea
                  rows={2}
                  required
                  value={newHook}
                  onChange={(e) => setNewHook(e.target.value)}
                  placeholder="Ex: 'Eu tinha R$ 12 na conta e uma folha inteira para pagar...'"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-300 mb-1">Pergunta do Apresentador que Gera o Corte</label>
                <input
                  type="text"
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  placeholder="Ex: Qual foi seu pior momento?"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-300 mb-1">Duração Estimada</label>
                <input
                  type="text"
                  value={newDuration}
                  onChange={(e) => setNewDuration(e.target.value)}
                  placeholder="45-60s"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 bg-zinc-800 text-zinc-300 text-xs rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-500 text-zinc-950 font-bold text-xs rounded-lg cursor-pointer"
                >
                  Adicionar Corte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
