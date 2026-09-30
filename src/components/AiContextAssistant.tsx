import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Send,
  Loader2,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  GitCommit,
  Wand2
} from 'lucide-react';
import { Episode } from '../types';
import { api } from '../services/api';

interface AiContextAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  episode: Episode;
  currentTab: string;
  onUpdateEpisode: (updated: Partial<Episode>) => void;
}

export const AiContextAssistant: React.FC<AiContextAssistantProps> = ({
  isOpen,
  onClose,
  episode,
  currentTab,
  onUpdateEpisode,
}) => {
  const [promptInput, setPromptInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [proposal, setProposal] = useState<{
    actionType: string;
    summary: string;
    targetField: string;
    updatedData: any;
  } | null>(null);

  if (!isOpen) return null;

  // Quick contextual prompts based on the current tab
  const getQuickPrompts = () => {
    switch (currentTab) {
      case 'outline':
        return [
          'Reduzir todos os blocos para caber em 30 minutos',
          'Criar transições mais suaves entre a origem e a crise',
          'Adicionar um bloco final de conselhos práticos',
        ];
      case 'script':
        return [
          'Deixar a fala de abertura mais forte e intrigante',
          'Transformar perguntas genéricas em gatilhos de histórias',
          'Adicionar instruções de corte seco e pausas dramáticas',
        ];
      case 'research':
        return [
          'Identificar potenciais contradições em entrevistas anteriores',
          'Listar marcos de faturamento e números confirmados',
        ];
      case 'shorts':
        return [
          'Gerar ganchos mais polêmicos nos primeiros 3 segundos',
          'Prever respostas sobre erros de sociedade e gestão',
        ];
      default:
        return [
          'Fortalecer o conflito principal da história',
          'Identificar por que a audiência se importaria com esse episódio',
        ];
    }
  };

  const handleSendPrompt = async (textToSend?: string) => {
    const text = textToSend || promptInput;
    if (!text.trim()) return;

    setLoading(true);
    setProposal(null);
    try {
      const res = await api.aiAssist({
        episode,
        userPrompt: text,
        currentTab,
      });
      setProposal(res);
      setPromptInput('');
    } catch (err) {
      console.error('Failed to run AI assistance:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyProposal = () => {
    if (!proposal || !proposal.updatedData) return;

    // Apply change directly to episode object
    if (proposal.targetField === 'outline') {
      onUpdateEpisode({ outline: proposal.updatedData });
    } else if (proposal.targetField === 'questions') {
      onUpdateEpisode({ questions: proposal.updatedData });
    } else if (proposal.targetField === 'script') {
      onUpdateEpisode({ script: proposal.updatedData });
    } else if (proposal.targetField === 'shorts') {
      onUpdateEpisode({ shorts: proposal.updatedData });
    } else {
      // General feedback or deep field
      onUpdateEpisode({ ...proposal.updatedData });
    }

    setProposal(null);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-zinc-900 border-l border-zinc-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="px-5 py-4 border-b border-zinc-800 bg-zinc-950/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-100">Co-Produtor & Roteirista IA</h3>
            <p className="text-[11px] text-zinc-400 font-mono">Modifica objetos reais do projeto</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Context indicator */}
        <div className="p-3 bg-zinc-950/70 border border-zinc-800 rounded-lg text-xs space-y-1">
          <span className="text-[10px] font-mono uppercase text-zinc-500 font-bold block">
            Contexto Ativo
          </span>
          <p className="text-zinc-300 font-semibold truncate">{episode.title}</p>
          <p className="text-[11px] text-zinc-400">
            Aba ativa: <strong className="text-amber-400 font-mono">{currentTab}</strong>
          </p>
        </div>

        {/* Quick prompt buttons */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-mono uppercase text-zinc-400 font-semibold block">
            Ações Rápidas Sugeridas:
          </span>
          <div className="flex flex-col gap-1.5">
            {getQuickPrompts().map((qp, i) => (
              <button
                key={i}
                onClick={() => handleSendPrompt(qp)}
                className="text-left text-xs bg-zinc-950/60 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-zinc-100 p-2.5 rounded-lg transition-colors flex items-center justify-between group cursor-pointer"
              >
                <span>{qp}</span>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-amber-400 transition-colors shrink-0 ml-2" />
              </button>
            ))}
          </div>
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div className="p-6 bg-zinc-950 border border-indigo-900/30 rounded-xl flex flex-col items-center justify-center space-y-2 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
            <p className="text-xs text-zinc-300 font-medium">
              Analisando contexto e gerando alterações estruturadas...
            </p>
          </div>
        )}

        {/* Proposal / Diff Card */}
        {proposal && (
          <div className="bg-zinc-950 border border-indigo-500/40 rounded-xl p-4 space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <GitCommit className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-mono font-bold text-indigo-300 uppercase">
                Proposta de Alteração Concreta
              </span>
            </div>

            <p className="text-xs text-zinc-200 font-medium leading-relaxed bg-zinc-900 p-2.5 rounded-lg border border-zinc-800">
              {proposal.summary}
            </p>

            {proposal.targetField && (
              <div className="text-[11px] font-mono text-zinc-400">
                Campo afetado: <span className="text-amber-400 font-bold">{proposal.targetField}</span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
              <button
                onClick={() => setProposal(null)}
                className="flex-1 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg transition-colors cursor-pointer"
              >
                Descartar
              </button>

              <button
                onClick={handleApplyProposal}
                className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 shadow-md transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Aplicar ao Episódio</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Input Field */}
      <div className="p-4 border-t border-zinc-800 bg-zinc-950/80">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendPrompt();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            placeholder="Ex: Deixe essa pergunta mais natural..."
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={loading || !promptInput.trim()}
            className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors disabled:opacity-40 cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
