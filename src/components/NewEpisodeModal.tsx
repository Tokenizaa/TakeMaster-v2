import React, { useState } from 'react';
import { Sparkles, X, Clapperboard, Clock, User, Target, Info, Loader2 } from 'lucide-react';
import { Show, ShowFormat, Episode } from '../types';

interface NewEpisodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeShow: Show | null;
  shows: Show[];
  onCreateWithAi: (formData: {
    showId: string;
    idea: string;
    guestName: string;
    company?: string;
    format: ShowFormat;
    durationMin: number;
    objective?: string;
    additionalInfo?: string;
  }) => Promise<void>;
}

export const NewEpisodeModal: React.FC<NewEpisodeModalProps> = ({
  isOpen,
  onClose,
  activeShow,
  shows,
  onCreateWithAi,
}) => {
  const [selectedShowId, setSelectedShowId] = useState(activeShow?.id || shows[0]?.id || '');
  const [idea, setIdea] = useState('');
  const [guestName, setGuestName] = useState('');
  const [company, setCompany] = useState('');
  const [format, setFormat] = useState<ShowFormat>(activeShow?.format || 'Entrevista');
  const [durationMin, setDurationMin] = useState<number>(activeShow?.defaultDurationMin || 45);
  const [objective, setObjective] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idea.trim()) {
      setError('Por favor, descreva a ideia do episódio.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await onCreateWithAi({
        showId: selectedShowId || shows[0]?.id,
        idea,
        guestName,
        company,
        format,
        durationMin: Number(durationMin) || 45,
        objective,
        additionalInfo,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Falha ao iniciar produção do episódio.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-700/80 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Clapperboard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100">Novo Episódio Audiovisual</h2>
              <p className="text-xs text-zinc-400">Estruture com IA: da ideia bruta ao estúdio pronto</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-950/50 border border-red-800/80 rounded-lg text-xs text-red-300">
              {error}
            </div>
          )}

          {/* Program Selector */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase font-mono tracking-wider">
              Programa / Formato Base
            </label>
            <select
              value={selectedShowId}
              onChange={(e) => {
                setSelectedShowId(e.target.value);
                const s = shows.find((sh) => sh.id === e.target.value);
                if (s) {
                  setFormat(s.format);
                  setDurationMin(s.defaultDurationMin);
                }
              }}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-amber-500"
            >
              {shows.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} ({s.format} · {s.defaultDurationMin} min)
                </option>
              ))}
            </select>
          </div>

          {/* Central Idea Field (Large) */}
          <div>
            <label className="block text-xs font-semibold text-zinc-200 mb-1.5 uppercase font-mono tracking-wider">
              Qual é a ideia? <span className="text-amber-400">*</span>
            </label>
            <p className="text-xs text-zinc-400 mb-2">
              Descreva sua ideia mesmo que ainda esteja incompleta. O motor de IA vai analisar conflito, transformação e narrativa.
            </p>
            <textarea
              required
              rows={4}
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="Ex: Quero entrevistar um empresário que começou vendendo ferramentas numa Kombi e hoje tem uma fábrica com 400 pessoas. Quero descobrir como começou, os erros no início, a grande crise da enchente e como conseguiu crescer..."
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 leading-relaxed"
            />
          </div>

          {/* Guest and Company */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300 mb-1.5">
                <User className="w-3.5 h-3.5 text-zinc-400" />
                <span>Nome do Convidado / Protagonista</span>
              </label>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Ex: João Silva"
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Empresa / Cargo / Contexto
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Ex: Ferramentas Brasil S/A"
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Format and Target Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Tipo de Produção
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as ShowFormat)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-amber-500"
              >
                <option value="Entrevista">Entrevista</option>
                <option value="Podcast/Videocast">Podcast/Videocast</option>
                <option value="Programa Solo">Programa Solo</option>
                <option value="Mesa Redonda">Mesa Redonda</option>
                <option value="Debate">Debate</option>
                <option value="Reportagem">Reportagem</option>
                <option value="Especial">Especial</option>
                <option value="Outro">Outro</option>
              </select>
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300 mb-1.5">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                <span>Duração Estimada (minutos)</span>
              </label>
              <input
                type="number"
                min={5}
                max={240}
                value={durationMin}
                onChange={(e) => setDurationMin(Number(e.target.value))}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Objective */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300 mb-1.5">
              <Target className="w-3.5 h-3.5 text-zinc-400" />
              <span>Objetivo Editorial (Opcional)</span>
            </label>
            <input
              type="text"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="Ex: Revelar como superar crises financeiras extremas com calo nas mãos."
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Additional Info */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300 mb-1.5">
              <Info className="w-3.5 h-3.5 text-zinc-400" />
              <span>Informações Adicionais / Fatos Sensíveis</span>
            </label>
            <textarea
              rows={2}
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              placeholder="Ex: O convidado trouxe uma foto antiga da Kombi; evitar termo em inglês; confirmar se houve empréstimo bancário em 2014."
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500"
            />
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-950/60 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 rounded-lg transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            onClick={handleSubmit}
            disabled={loading || !idea.trim()}
            className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs rounded-lg flex items-center gap-2 shadow-lg shadow-amber-950/40 transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                <span>IA Analisando Conceito & História...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 fill-zinc-950" />
                <span>Criar Produção com IA</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
