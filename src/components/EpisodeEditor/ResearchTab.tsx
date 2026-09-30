import React, { useState } from 'react';
import {
  BookOpen,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Plus,
  Trash2,
  ExternalLink,
  Loader2,
  Building,
  Calendar,
  History,
  MessageSquare,
  ShieldAlert,
  Award
} from 'lucide-react';
import { Episode, ResearchData, ResearchSource } from '../../types';
import { api } from '../../services/api';

interface ResearchTabProps {
  episode: Episode;
  onUpdateEpisode: (updated: Partial<Episode>) => void;
  onAdvanceToNextTab: () => void;
}

export const ResearchTab: React.FC<ResearchTabProps> = ({
  episode,
  onUpdateEpisode,
  onAdvanceToNextTab,
}) => {
  const [loading, setLoading] = useState(false);
  const [research, setResearch] = useState<ResearchData>(
    episode.research || {
      aboutGuest: '',
      trajectory: '',
      company: '',
      keyDatesAndNumbers: '',
      previousInterviews: '',
      recurringThemes: '',
      contradictionsAndClarifications: '',
      compellingStories: '',
      sources: [],
    }
  );

  const [showAddSourceModal, setShowAddSourceModal] = useState(false);
  const [newSourceTitle, setNewSourceTitle] = useState('');
  const [newSourceDetail, setNewSourceDetail] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [newSourceStatus, setNewSourceStatus] = useState<
    'CONFIRMADO' | 'NÃO CONFIRMADO' | 'PERGUNTAR AO CONVIDADO'
  >('CONFIRMADO');

  const handleRunAiResearch = async () => {
    setLoading(true);
    try {
      const generated = await api.aiResearch({
        guestName: episode.guestName || 'Convidado',
        company: episode.additionalInfo,
        idea: episode.idea,
        diagnosis: episode.diagnosis,
      });
      setResearch(generated);
      onUpdateEpisode({ research: generated });
    } catch (err) {
      console.error('Failed to run AI research:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceTitle.trim()) return;

    const source: ResearchSource = {
      id: `src-${Date.now()}`,
      title: newSourceTitle,
      detail: newSourceDetail,
      url: newSourceUrl || undefined,
      status: newSourceStatus,
      category: 'guest',
    };

    const updated = {
      ...research,
      sources: [...(research.sources || []), source],
    };
    setResearch(updated);
    onUpdateEpisode({ research: updated });
    setNewSourceTitle('');
    setNewSourceDetail('');
    setNewSourceUrl('');
    setShowAddSourceModal(false);
  };

  const handleDeleteSource = (id: string) => {
    const updated = {
      ...research,
      sources: (research.sources || []).filter((s) => s.id !== id),
    };
    setResearch(updated);
    onUpdateEpisode({ research: updated });
  };

  const handleUpdateField = (field: keyof ResearchData, val: string) => {
    const updated = { ...research, [field]: val };
    setResearch(updated);
    onUpdateEpisode({ research: updated });
  };

  const getSourceBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMADO':
        return 'bg-emerald-950/70 border-emerald-700/60 text-emerald-400';
      case 'NÃO CONFIRMADO':
        return 'bg-amber-950/70 border-amber-700/60 text-amber-400';
      case 'PERGUNTAR AO CONVIDADO':
        return 'bg-purple-950/70 border-purple-700/60 text-purple-400';
      default:
        return 'bg-zinc-800 border-zinc-700 text-zinc-300';
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-100">Dossiê de Pesquisa e Checagem Factual</h2>
            <p className="text-xs text-zinc-400">
              Informações com distinção de fontes verificadas, não confirmadas e pontos para checar na entrevista.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRunAiResearch}
            disabled={loading}
            className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>✨ Pesquisar com IA</span>
          </button>

          <button
            onClick={() => setShowAddSourceModal(true)}
            className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar Fonte</span>
          </button>

          <button
            onClick={onAdvanceToNextTab}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Avançar para Pauta →
          </button>
        </div>
      </div>

      {/* Guest Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* About Guest */}
        <div className="md:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-semibold block">
            Sobre o Convidado
          </span>
          <textarea
            rows={3}
            value={research.aboutGuest}
            onChange={(e) => handleUpdateField('aboutGuest', e.target.value)}
            placeholder="Biografia resumida, dados pessoais, formação e postura..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 leading-relaxed"
          />
        </div>

        {/* Company / Institution */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-300 font-mono uppercase">
            <Building className="w-4 h-4 text-sky-400" />
            <span>Empresa / Entidade</span>
          </div>
          <textarea
            rows={3}
            value={research.company}
            onChange={(e) => handleUpdateField('company', e.target.value)}
            placeholder="Nome, área de atuação, porte, faturamento estimado..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 leading-relaxed"
          />
        </div>
      </div>

      {/* Trajectory and Key Dates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-300 font-mono uppercase">
            <History className="w-4 h-4 text-indigo-400" />
            <span>Trajetória Cronológica</span>
          </div>
          <textarea
            rows={4}
            value={research.trajectory}
            onChange={(e) => handleUpdateField('trajectory', e.target.value)}
            placeholder="Marcos principais: início, primeiras vendas, viradas e estado atual..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 leading-relaxed"
          />
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-300 font-mono uppercase">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <span>Datas Importantes & Números Reais</span>
          </div>
          <textarea
            rows={4}
            value={research.keyDatesAndNumbers}
            onChange={(e) => handleUpdateField('keyDatesAndNumbers', e.target.value)}
            placeholder="Ano de fundação, faturamento, funcionários, dívidas superadas..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 leading-relaxed"
          />
        </div>
      </div>

      {/* Interviews, Recurring Themes & Contradictions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-300 font-mono uppercase">
            <MessageSquare className="w-4 h-4 text-purple-400" />
            <span>Entrevistas Anteriores & Assuntos Recorrentes</span>
          </div>
          <textarea
            rows={4}
            value={research.previousInterviews}
            onChange={(e) => handleUpdateField('previousInterviews', e.target.value)}
            placeholder="O que ele costuma repetir? Onde já falou antes? O que nunca foi perguntado?"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 leading-relaxed"
          />
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 font-mono uppercase">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>Contradições & Pontos a Esclarecer</span>
          </div>
          <textarea
            rows={4}
            value={research.contradictionsAndClarifications}
            onChange={(e) => handleUpdateField('contradictionsAndClarifications', e.target.value)}
            placeholder="Declarações divergentes, detalhes que precisam de apuração com respeito..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 leading-relaxed"
          />
        </div>
      </div>

      {/* Verified Sources List */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-200 font-mono uppercase">
            <Award className="w-4 h-4 text-amber-400" />
            <span>Fontes & Verificações ({(research.sources || []).length})</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-mono">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> CONFIRMADO
            </span>
            <span className="flex items-center gap-1 text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> NÃO CONFIRMADO
            </span>
            <span className="flex items-center gap-1 text-purple-400">
              <span className="w-2 h-2 rounded-full bg-purple-500" /> PERGUNTAR AO CONVIDADO
            </span>
          </div>
        </div>

        {(research.sources || []).length === 0 ? (
          <p className="text-xs text-zinc-500 italic py-3 text-center">
            Nenhuma fonte cadastrada ainda. Clique em "Pesquisar com IA" para gerar dados com referências factuais.
          </p>
        ) : (
          <div className="space-y-2.5">
            {research.sources.map((src) => (
              <div
                key={src.id}
                className="bg-zinc-950/70 border border-zinc-800/80 rounded-lg p-3 flex items-start justify-between gap-4"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${getSourceBadge(
                        src.status
                      )}`}
                    >
                      {src.status}
                    </span>
                    <h4 className="text-xs font-bold text-zinc-200">{src.title}</h4>
                    {src.url && (
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-zinc-500 hover:text-amber-400 transition-colors inline-flex items-center gap-0.5 text-[11px]"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">{src.detail}</p>
                </div>

                <button
                  onClick={() => handleDeleteSource(src.id)}
                  className="text-zinc-600 hover:text-red-400 p-1 rounded transition-colors cursor-pointer shrink-0"
                  title="Excluir fonte"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Add Source */}
      {showAddSourceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-sm font-bold text-zinc-100">Adicionar Fonte ou Checagem</h3>
            <form onSubmit={handleAddSource} className="space-y-3">
              <div>
                <label className="block text-xs text-zinc-300 mb-1">Título da Fonte / Fato</label>
                <input
                  type="text"
                  required
                  value={newSourceTitle}
                  onChange={(e) => setNewSourceTitle(e.target.value)}
                  placeholder="Ex: Registro JUCESP ou Entrevista Jornal 2021"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-300 mb-1">Status de Verificação</label>
                <select
                  value={newSourceStatus}
                  onChange={(e: any) => setNewSourceStatus(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="CONFIRMADO">CONFIRMADO</option>
                  <option value="NÃO CONFIRMADO">NÃO CONFIRMADO</option>
                  <option value="PERGUNTAR AO CONVIDADO">PERGUNTAR AO CONVIDADO</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-zinc-300 mb-1">Detalhes / Dados</label>
                <textarea
                  rows={3}
                  value={newSourceDetail}
                  onChange={(e) => setNewSourceDetail(e.target.value)}
                  placeholder="Ex: Dados checados na certidão confirmam início em 2010..."
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-300 mb-1">Link / URL (Opcional)</label>
                <input
                  type="url"
                  value={newSourceUrl}
                  onChange={(e) => setNewSourceUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddSourceModal(false)}
                  className="px-3 py-1.5 bg-zinc-800 text-zinc-300 text-xs rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-500 text-zinc-950 font-bold text-xs rounded-lg cursor-pointer"
                >
                  Adicionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
