import React, { useState } from 'react';
import {
  TrendingUp,
  FileCheck2,
  ShieldAlert,
  HelpCircle,
  Search,
  Flame,
  Users,
  Plus,
  Trash2,
  BookOpen,
  Award,
  ExternalLink,
  Edit3,
  CheckCircle2,
  Sparkles,
  Loader2,
  Clock,
  ListOrdered
} from 'lucide-react';
import {
  Episode,
  Program,
  ParticipantType,
  EpisodeParticipant,
  EditorialDiagnosis,
  ResearchData,
  ResearchSource
} from '../../types';
import { api } from '../../services/api';

interface EpisodeOverviewWorkspaceProps {
  episode: Episode;
  program?: Program;
  onUpdateEpisode: (updated: Partial<Episode>) => void;
  onAdvanceToScript: () => void;
}

export const EpisodeOverviewWorkspace: React.FC<EpisodeOverviewWorkspaceProps> = ({
  episode,
  program,
  onUpdateEpisode,
  onAdvanceToScript,
}) => {
  const [loadingAi, setLoadingAi] = useState(false);
  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [newPartName, setNewPartName] = useState('');
  const [newPartType, setNewPartType] = useState<ParticipantType>('Convidado');
  const [newPartRole, setNewPartRole] = useState('Convidado Especial');

  // Diagnosis editing
  const [isEditingDiagnosis, setIsEditingDiagnosis] = useState(false);
  const defaultDiag: EditorialDiagnosis = {
    centralTheme: '',
    potentialStory: '',
    primaryConflict: '',
    primaryTransformation: '',
    whyWatch: '',
    whatToDiscover: '',
    researchPoints: [],
    highImpactMoments: [],
    approved: false,
  };
  const [diag, setDiag] = useState<EditorialDiagnosis>(episode.diagnosis || defaultDiag);

  const participants = episode.participants || [];
  const segments = episode.segments || episode.outline || [];
  const research = episode.research || {
    aboutGuest: '',
    trajectory: '',
    company: '',
    keyDatesAndNumbers: '',
    previousInterviews: '',
    recurringThemes: '',
    contradictionsAndClarifications: '',
    compellingStories: '',
    sources: []
  };

  const handleAddParticipant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartName.trim()) return;

    const newParticipant: EpisodeParticipant = {
      participantId: `part-${Date.now()}`,
      name: newPartName.trim(),
      type: newPartType,
      role: newPartRole.trim() || 'Participante',
      order: participants.length + 1,
      isFeatured: true,
      estimatedTimeMin: 15,
    };

    const updated = [...participants, newParticipant];
    onUpdateEpisode({
      participants: updated,
      guestName: updated.filter(p => p.type !== 'Apresentador').map(p => p.name).join(', ') || 'Participantes'
    });
    setNewPartName('');
    setShowAddParticipant(false);
  };

  const handleRemoveParticipant = (participantId: string) => {
    const updated = participants.filter((p) => p.participantId !== participantId);
    onUpdateEpisode({
      participants: updated,
      guestName: updated.filter(p => p.type !== 'Apresentador').map(p => p.name).join(', ') || 'Participantes'
    });
  };

  const handleSaveDiagnosis = () => {
    onUpdateEpisode({ diagnosis: diag });
    setIsEditingDiagnosis(false);
  };

  const handleRunAiResearch = async () => {
    setLoadingAi(true);
    try {
      const res = await api.aiResearch({
        participants,
        programTitle: episode.title,
        format: episode.format,
        idea: episode.idea || episode.topic || '',
        diagnosis: episode.diagnosis,
      });
      onUpdateEpisode({ research: res });
    } catch (err) {
      console.error('Failed to run AI research:', err);
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Editorial Core Banner */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className="text-xs font-mono font-bold uppercase text-amber-400">
              Visão Geral Editorial
            </span>
            <span className="text-zinc-600">·</span>
            <span className="text-xs font-mono text-zinc-400">{episode.format}</span>
          </div>
          <h2 className="text-xl font-extrabold text-zinc-100">{episode.title}</h2>
          <p className="text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed italic">
            "{episode.idea}"
          </p>
        </div>

        <button
          onClick={onAdvanceToScript}
          className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-amber-950/30 transition-all cursor-pointer shrink-0"
        >
          <span>Ir para Roteiro</span>
          <CheckCircle2 className="w-4 h-4" />
        </button>
      </div>

      {/* Grid: Participants (Multi-participant, bands, etc.) & Segments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Participants Box (Section 6 & 7) */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-zinc-200">
              <Users className="w-4 h-4 text-sky-400" />
              <span>Participantes do Episódio ({participants.length})</span>
            </div>
            <button
              onClick={() => setShowAddParticipant(true)}
              className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar</span>
            </button>
          </div>

          <div className="space-y-2">
            {participants.length === 0 ? (
              <p className="text-xs text-zinc-500 py-3 text-center italic">
                Nenhum participante configurado ainda.
              </p>
            ) : (
              participants.map((pt) => (
                <div
                  key={pt.participantId}
                  className="p-3 bg-zinc-950 border border-zinc-800/80 rounded-xl flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-amber-400 text-xs">
                      {pt.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-200">{pt.name}</span>
                        {pt.isFeatured && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-400 border border-amber-800">
                            DESTAQUE
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400">{pt.role}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-900 border border-zinc-800 text-zinc-300">
                      {pt.type}
                    </span>
                    <button
                      onClick={() => handleRemoveParticipant(pt.participantId || pt.id || '')}
                      className="p-1 text-zinc-600 hover:text-red-400 transition-colors cursor-pointer"
                      title="Remover participante"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Modal add participant */}
          {showAddParticipant && (
            <form onSubmit={handleAddParticipant} className="p-3 bg-zinc-950 border border-zinc-750 rounded-xl space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-mono text-zinc-400 mb-1">Nome / Banda</label>
                  <input
                    type="text"
                    required
                    value={newPartName}
                    onChange={(e) => setNewPartName(e.target.value)}
                    placeholder="Ex: Dra. Camila ou Banda X"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-xs text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-zinc-400 mb-1">Tipo</label>
                  <select
                    value={newPartType}
                    onChange={(e: any) => setNewPartType(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-xs text-zinc-100"
                  >
                    <option value="Apresentador">Apresentador</option>
                    <option value="Convidado">Convidado</option>
                    <option value="Empresário">Empresário</option>
                    <option value="Especialista">Especialista</option>
                    <option value="Banda">Banda / Grupo Musical</option>
                    <option value="Artista">Artista</option>
                    <option value="Painelista">Painelista</option>
                    <option value="Plateia">Plateia / Auditório</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-mono text-zinc-400 mb-1">Papel na Conversa</label>
                <input
                  type="text"
                  value={newPartRole}
                  onChange={(e) => setNewPartRole(e.target.value)}
                  placeholder="Ex: Convidada no sofá / Apresentação musical"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-xs text-zinc-100"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddParticipant(false)}
                  className="px-2.5 py-1 text-xs text-zinc-400"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 bg-amber-500 text-zinc-950 font-bold text-xs rounded-lg"
                >
                  Adicionar
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Segments / Quadros Summary (Section 12) */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-zinc-200">
              <ListOrdered className="w-4 h-4 text-amber-400" />
              <span>Quadros & Estrutura Narrativa ({segments.length})</span>
            </div>
            <span className="text-xs font-mono text-zinc-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-zinc-500" />
              {segments.reduce((acc, s) => acc + (s.estimatedDurationMin || 0), 0)} min total
            </span>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {segments.map((seg, i) => (
              <div
                key={seg.id}
                className="p-3 bg-zinc-950 border border-zinc-800/80 rounded-xl flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="font-mono font-bold text-amber-400 text-[11px] bg-amber-950/50 px-2 py-0.5 rounded border border-amber-800/60">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <p className="font-bold text-zinc-200">{seg.title}</p>
                    <p className="text-[11px] text-zinc-400 line-clamp-1">{seg.objective}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-900 border border-zinc-800 text-zinc-400">
                    {seg.type}
                  </span>
                  <span className="text-[11px] font-mono text-zinc-300 font-semibold">
                    {seg.estimatedDurationMin}m
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Editorial Diagnosis (Conflito, Transformação, Por que assistir) */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-zinc-200">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>Diagnóstico Editorial & Alma da História</span>
          </div>

          <button
            onClick={() => {
              if (isEditingDiagnosis) handleSaveDiagnosis();
              else setIsEditingDiagnosis(true);
            }}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isEditingDiagnosis ? 'Salvar Diagnóstico' : 'Editar'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-4 space-y-1.5">
            <span className="text-[10px] font-mono text-amber-400 uppercase font-bold">Tema Central</span>
            {isEditingDiagnosis ? (
              <textarea
                rows={2}
                value={diag?.centralTheme || ''}
                onChange={(e) => setDiag({ ...diag, centralTheme: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-xs text-zinc-200"
              />
            ) : (
              <p className="text-xs text-zinc-200 font-medium leading-relaxed">
                {diag?.centralTheme || 'Mapeando tema central...'}
              </p>
            )}
          </div>

          <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-4 space-y-1.5">
            <span className="text-[10px] font-mono text-red-400 uppercase font-bold">Principal Conflito</span>
            {isEditingDiagnosis ? (
              <textarea
                rows={2}
                value={diag?.primaryConflict || ''}
                onChange={(e) => setDiag({ ...diag, primaryConflict: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-xs text-zinc-200"
              />
            ) : (
              <p className="text-xs text-zinc-300 leading-relaxed">
                {diag?.primaryConflict || 'Identificando o obstáculo crítico...'}
              </p>
            )}
          </div>

          <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-4 space-y-1.5">
            <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold">Principal Transformação</span>
            {isEditingDiagnosis ? (
              <textarea
                rows={2}
                value={diag?.primaryTransformation || ''}
                onChange={(e) => setDiag({ ...diag, primaryTransformation: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-xs text-zinc-200"
              />
            ) : (
              <p className="text-xs text-zinc-300 leading-relaxed">
                {diag?.primaryTransformation || 'Mapeando o ponto de virada...'}
              </p>
            )}
          </div>

          <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-4 space-y-1.5">
            <span className="text-[10px] font-mono text-sky-400 uppercase font-bold">Por que alguém assistiria?</span>
            {isEditingDiagnosis ? (
              <textarea
                rows={2}
                value={diag?.whyWatch || ''}
                onChange={(e) => setDiag({ ...diag, whyWatch: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-xs text-zinc-200"
              />
            ) : (
              <p className="text-xs text-zinc-300 leading-relaxed">
                {diag?.whyWatch || 'Definindo o gancho para a audiência...'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Research Dossier & Verified Sources */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-zinc-200">
            <BookOpen className="w-4 h-4 text-sky-400" />
            <span>Pesquisa Factual & Fontes de Checagem</span>
          </div>

          <button
            onClick={handleRunAiResearch}
            disabled={loadingAi}
            className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            {loadingAi ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>Pesquisar Fatos com IA</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-4 space-y-2">
            <span className="text-[10px] font-mono text-zinc-400 uppercase font-bold">Trajetória Cronológica</span>
            <p className="text-xs text-zinc-300 leading-relaxed">
              {research.trajectory || 'Sem dados cronológicos inseridos.'}
            </p>
          </div>

          <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-4 space-y-2">
            <span className="text-[10px] font-mono text-zinc-400 uppercase font-bold">Datas Importantes & Números Reais</span>
            <p className="text-xs text-zinc-300 leading-relaxed">
              {research.keyDatesAndNumbers || 'Sem números cadastrados.'}
            </p>
          </div>
        </div>

        {(research.sources || []).length > 0 && (
          <div className="pt-2 space-y-2">
            <span className="text-[10px] font-mono text-zinc-500 uppercase font-bold block">
              Fontes Auditadas ({(research.sources || []).length})
            </span>
            <div className="space-y-1.5">
              {(research.sources || []).map((src) => (
                <div
                  key={src.id}
                  className="p-2.5 bg-zinc-950 border border-zinc-850 rounded-lg flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${
                        src.status === 'CONFIRMADO'
                          ? 'bg-emerald-950/70 border border-emerald-800 text-emerald-400'
                          : src.status === 'NÃO CONFIRMADO'
                          ? 'bg-amber-950/70 border border-amber-800 text-amber-400'
                          : 'bg-purple-950/70 border border-purple-800 text-purple-400'
                      }`}>
                        {src.status}
                      </span>
                      <strong className="text-zinc-200">{src.title}</strong>
                    </div>
                    <p className="text-[11px] text-zinc-400">{src.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
