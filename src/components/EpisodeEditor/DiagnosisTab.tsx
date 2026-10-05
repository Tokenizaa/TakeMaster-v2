import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  Edit3,
  Flame,
  Search,
  HelpCircle,
  TrendingUp,
  ShieldAlert,
  Loader2,
  RefreshCw,
  FileCheck2
} from 'lucide-react';
import { Episode, EditorialDiagnosis } from '../../types';
import { api } from '../../services/api';

interface DiagnosisTabProps {
  episode: Episode;
  onUpdateEpisode: (updated: Partial<Episode>) => void;
  onAdvanceToNextTab: () => void;
}

export const DiagnosisTab: React.FC<DiagnosisTabProps> = ({
  episode,
  onUpdateEpisode,
  onAdvanceToNextTab,
}) => {
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [localDiagnosis, setLocalDiagnosis] = useState<EditorialDiagnosis>(
    episode.diagnosis || {
      centralTheme: '',
      potentialStory: '',
      primaryConflict: '',
      primaryTransformation: '',
      whyWatch: '',
      whatToDiscover: '',
      researchPoints: [],
      highImpactMoments: [],
      approved: false,
    }
  );

  const handleRegenerate = async () => {
    setLoading(true);
    try {
      const diagnosis = await api.aiDiagnose({
        idea: episode.idea || episode.topic || '',
        guestName: episode.guestName || (episode.participants?.[0]?.name) || '',
        format: episode.format,
        durationMin: episode.targetDurationMin || episode.targetDurationMinutes || 60,
        objective: episode.objective,
        additionalInfo: episode.additionalInfo,
      });
      setLocalDiagnosis(diagnosis);
      onUpdateEpisode({ diagnosis });
    } catch (err) {
      console.error('Failed to regenerate diagnosis:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = () => {
    const updated = { ...localDiagnosis, approved: true };
    setLocalDiagnosis(updated);
    onUpdateEpisode({ diagnosis: updated, status: 'research' });
    onAdvanceToNextTab();
  };

  const handleSaveEdit = () => {
    onUpdateEpisode({ diagnosis: localDiagnosis });
    setIsEditing(false);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-100">Diagnóstico Editorial do Produtor IA</h2>
            <p className="text-xs text-zinc-400">
              A IA analisou a ideia bruta antes de escrever o roteiro, identificando o conflito, a transformação e os momentos de impacto.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isEditing ? 'Cancelar Edição' : 'Editar Conceito'}</span>
          </button>

          <button
            onClick={handleRegenerate}
            disabled={loading}
            className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>Recalcular com IA</span>
          </button>

          <button
            onClick={handleApprove}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-md shadow-emerald-950/40 transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{localDiagnosis.approved ? 'Conceito Aprovado ✓' : 'Aprovar Conceito & Avançar'}</span>
          </button>
        </div>
      </div>

      {/* Raw Idea Card */}
      <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-5">
        <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block mb-1">
          Ideia Bruta Informada
        </span>
        <p className="text-sm text-zinc-200 leading-relaxed italic">
          "{episode.idea}"
        </p>
        <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-zinc-800/60 text-xs text-zinc-400 font-mono">
          <span>Convidado: <strong className="text-zinc-200">{episode.guestName || 'Solo'}</strong></span>
          <span>·</span>
          <span>Formato: <strong className="text-zinc-200">{episode.format}</strong></span>
          <span>·</span>
          <span>Duração Alvo: <strong className="text-zinc-200">{episode.targetDurationMin} min</strong></span>
        </div>
      </div>

      {/* Editorial Diagnosis Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Central Theme */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 font-mono uppercase">
            <TrendingUp className="w-4 h-4" />
            <span>Tema Central</span>
          </div>
          {isEditing ? (
            <textarea
              rows={3}
              value={localDiagnosis.centralTheme}
              onChange={(e) => setLocalDiagnosis({ ...localDiagnosis, centralTheme: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
            />
          ) : (
            <p className="text-sm text-zinc-200 leading-relaxed font-medium">
              {localDiagnosis.centralTheme || 'Definindo tema central...'}
            </p>
          )}
        </div>

        {/* Potential Story */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 font-mono uppercase">
            <FileCheck2 className="w-4 h-4" />
            <span>História Potencial</span>
          </div>
          {isEditing ? (
            <textarea
              rows={3}
              value={localDiagnosis.potentialStory}
              onChange={(e) => setLocalDiagnosis({ ...localDiagnosis, potentialStory: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
            />
          ) : (
            <p className="text-sm text-zinc-300 leading-relaxed">
              {localDiagnosis.potentialStory || 'Mapeando potencial narrativo...'}
            </p>
          )}
        </div>

        {/* Primary Conflict */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-red-400 font-mono uppercase">
            <ShieldAlert className="w-4 h-4" />
            <span>Principal Conflito (Ruptura / Risco)</span>
          </div>
          {isEditing ? (
            <textarea
              rows={3}
              value={localDiagnosis.primaryConflict}
              onChange={(e) => setLocalDiagnosis({ ...localDiagnosis, primaryConflict: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
            />
          ) : (
            <p className="text-sm text-zinc-300 leading-relaxed">
              {localDiagnosis.primaryConflict || 'Identificando o obstáculo crítico...'}
            </p>
          )}
        </div>

        {/* Primary Transformation */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 font-mono uppercase">
            <TrendingUp className="w-4 h-4" />
            <span>Principal Transformação</span>
          </div>
          {isEditing ? (
            <textarea
              rows={3}
              value={localDiagnosis.primaryTransformation}
              onChange={(e) => setLocalDiagnosis({ ...localDiagnosis, primaryTransformation: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
            />
          ) : (
            <p className="text-sm text-zinc-300 leading-relaxed">
              {localDiagnosis.primaryTransformation || 'Mapeando o ponto de virada...'}
            </p>
          )}
        </div>

        {/* Why Watch? */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-sky-400 font-mono uppercase">
            <HelpCircle className="w-4 h-4" />
            <span>Por que alguém assistiria?</span>
          </div>
          {isEditing ? (
            <textarea
              rows={3}
              value={localDiagnosis.whyWatch}
              onChange={(e) => setLocalDiagnosis({ ...localDiagnosis, whyWatch: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
            />
          ) : (
            <p className="text-sm text-zinc-300 leading-relaxed">
              {localDiagnosis.whyWatch || 'Definindo o gancho para a audiência...'}
            </p>
          )}
        </div>

        {/* What to Discover? */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-purple-400 font-mono uppercase">
            <Search className="w-4 h-4" />
            <span>O que precisamos descobrir?</span>
          </div>
          {isEditing ? (
            <textarea
              rows={3}
              value={localDiagnosis.whatToDiscover}
              onChange={(e) => setLocalDiagnosis({ ...localDiagnosis, whatToDiscover: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
            />
          ) : (
            <p className="text-sm text-zinc-300 leading-relaxed">
              {localDiagnosis.whatToDiscover || 'Perguntas não óbvias...'}
            </p>
          )}
        </div>
      </div>

      {/* Research Points & High-Impact Moments */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Research Points */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-200 font-mono uppercase">
            <Search className="w-4 h-4 text-amber-400" />
            <span>Pontos que precisam ser pesquisados</span>
          </div>
          <ul className="space-y-2">
            {(localDiagnosis.researchPoints || []).map((pt, i) => (
              <li key={i} className="text-xs text-zinc-300 flex items-start gap-2 bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800/60">
                <span className="text-amber-400 font-mono font-bold shrink-0">{i + 1}.</span>
                <span className="leading-relaxed">{pt}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* High-Impact Moments */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-200 font-mono uppercase">
            <Flame className="w-4 h-4 text-red-400" />
            <span>Possíveis Momentos Fortes (Cortes de Ouro)</span>
          </div>
          <ul className="space-y-2">
            {(localDiagnosis.highImpactMoments || []).map((moment, i) => (
              <li key={i} className="text-xs text-zinc-300 flex items-start gap-2 bg-zinc-950/60 p-2.5 rounded-lg border border-red-950/30">
                <span className="text-red-400 shrink-0 font-bold">🔥</span>
                <span className="leading-relaxed">{moment}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {isEditing && (
        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
          <button
            onClick={() => setIsEditing(false)}
            className="px-4 py-2 bg-zinc-800 text-zinc-300 text-xs rounded-lg cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleSaveEdit}
            className="px-5 py-2 bg-amber-500 text-zinc-950 font-bold text-xs rounded-lg cursor-pointer"
          >
            Salvar Alterações
          </button>
        </div>
      )}
    </div>
  );
};
