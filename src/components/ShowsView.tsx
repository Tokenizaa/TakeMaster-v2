import React, { useState, useEffect } from 'react';
import {
  Tv,
  Plus,
  Clock,
  User,
  Video,
  Trash2,
  Edit3,
  Check,
  X,
  Layers,
  Globe,
  Target,
  FolderPlus,
  BookOpen,
} from 'lucide-react';
import {
  CatalogStatus,
  Episode,
  Production,
  ProductionStatus,
  ProgramPitchSuggestion,
  Show,
  ShowFormat,
} from '../types';
import { ProgramIdentityCard } from './ProgramIdentityCard';
import { api } from '../services/api';

interface ShowsViewProps {
  shows: Show[];
  productions?: Production[];
  episodes: Episode[];
  onCreateShow: (show: Partial<Show>) => Promise<void>;
  onUpdateShow: (id: string, show: Partial<Show>) => Promise<void>;
  onDeleteShow: (id: string) => Promise<void>;
  onCreateProduction?: (prod: Partial<Production>) => Promise<void>;
  onUpdateProduction?: (id: string, prod: Partial<Production>) => Promise<void>;
  onDeleteProduction?: (id: string) => Promise<void>;
  onSelectShowFilter: (showId: string) => void;
  onUsePitchInProduction?: (show: Show, pitch: ProgramPitchSuggestion) => Promise<void> | void;
  canEditShow?: (showId: string) => boolean;
}

const FORMATS: ShowFormat[] = [
  'Entrevista',
  'Programa Solo',
  'Mesa Redonda',
  'Podcast/Videocast',
  'Debate',
  'Reportagem',
  'Especial',
  'Outro',
];

const CATALOG_STATUS_LABELS: Record<CatalogStatus, { label: string; badge: string }> = {
  active: {
    label: 'Em Exibição / Ativo',
    badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  development: {
    label: 'Em Desenvolvimento',
    badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
  hiatus: {
    label: 'Hiato Entre Temporadas',
    badge: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  },
  archived: {
    label: 'Acervo / Arquivado',
    badge: 'bg-zinc-800 text-zinc-400 border-zinc-700',
  },
};

const PROD_STATUS_LABELS: Record<ProductionStatus, string> = {
  planning: 'Planejamento',
  pre_production: 'Pré-Produção',
  in_production: 'Em Gravação',
  post_production: 'Pós-Produção',
  completed: 'Concluída',
};

export const ShowsView: React.FC<ShowsViewProps> = ({
  shows,
  productions = [],
  episodes,
  onCreateShow,
  onUpdateShow,
  onDeleteShow,
  onCreateProduction,
  onDeleteProduction,
  onSelectShowFilter,
  onUsePitchInProduction,
  canEditShow,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creatingProductionForShowId, setCreatingProductionForShowId] = useState<string | null>(
    null
  );
  const [kbPrograms, setKbPrograms] = useState<
    {
      slug: string;
      nome: string;
      apresentador: string;
      descricao: string;
      hasMediaKitHtml: boolean;
      secoesCount: number;
    }[]
  >([]);

  useEffect(() => {
    api
      .listKnowledgeBasePrograms()
      .then((list) => setKbPrograms(list))
      .catch(() => {});
  }, []);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    host: '',
    format: 'Entrevista' as ShowFormat,
    defaultDurationMin: 45,
    editorialStyle: '',
    scenario: '',
    catalogStatus: 'active' as CatalogStatus,
    category: 'Negócios & Documentário',
    targetAudience: 'Lideranças, criadores e executivos',
    distributionChannels: 'YouTube 4K, Spotify Video, Reels/Shorts',
    defaultOpening: '',
    defaultClosing: '',
  });

  const [prodForm, setProdForm] = useState({
    title: '',
    seasonNumber: 1,
    status: 'in_production' as ProductionStatus,
    targetEpisodesCount: 10,
    executiveProducer: '',
    notes: '',
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      host: '',
      format: 'Entrevista',
      defaultDurationMin: 45,
      editorialStyle: '',
      scenario: '',
      catalogStatus: 'active',
      category: 'Negócios & Documentário',
      targetAudience: '',
      distributionChannels: 'YouTube 4K, Spotify Video',
      defaultOpening: '',
      defaultClosing: '',
    });
    setIsCreating(false);
    setEditingId(null);
  };

  const handleEdit = (show: Show) => {
    setFormData({
      title: show.title,
      description: show.description,
      host: show.host,
      format: show.format,
      defaultDurationMin: show.defaultDurationMin,
      editorialStyle: show.editorialStyle,
      scenario: show.scenario,
      catalogStatus: show.catalogStatus || 'active',
      category: show.category || 'Geral',
      targetAudience: show.targetAudience || '',
      distributionChannels: (show.distributionChannels || ['YouTube', 'Spotify']).join(', '),
      defaultOpening: show.defaultOpening,
      defaultClosing: show.defaultClosing,
    });
    setEditingId(show.id);
    setIsCreating(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    const payload: Partial<Show> = {
      ...formData,
      distributionChannels: formData.distributionChannels
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean),
    };

    if (editingId) {
      await onUpdateShow(editingId, payload);
    } else {
      await onCreateShow({
        ...payload,
        cameras: [
          {
            id: 'cam-1',
            name: 'CAM 1',
            label: 'Geral / Master',
            purpose: 'Plano aberto',
            framing: 'Plano Geral (Wide)',
            active: true,
          },
          {
            id: 'cam-2',
            name: 'CAM 2',
            label: 'Close Convidado',
            purpose: 'Emoção e respostas densas',
            framing: 'Close-up Intimista',
            active: true,
          },
          {
            id: 'cam-3',
            name: 'CAM 3',
            label: 'Close Apresentador',
            purpose: 'Perguntas e teleprompter',
            framing: 'Plano Médio (Medium)',
            active: true,
          },
        ],
        standardStructure: [
          'Cold Open (Teaser)',
          'Abertura & Apresentação',
          'Bloco 1: Origem & Contexto',
          'Bloco 2: O Conflito Central',
          'Bloco 3: Virada & Aprendizados',
          'Encerramento',
        ],
      });
    }
    resetForm();
  };

  const handleCreateProductionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creatingProductionForShowId || !prodForm.title.trim() || !onCreateProduction) return;
    await onCreateProduction({
      showId: creatingProductionForShowId,
      title: prodForm.title.trim(),
      seasonNumber: Number(prodForm.seasonNumber) || 1,
      status: prodForm.status,
      targetEpisodesCount: Number(prodForm.targetEpisodesCount) || 10,
      executiveProducer: prodForm.executiveProducer.trim(),
      notes: prodForm.notes.trim(),
    });
    setCreatingProductionForShowId(null);
    setProdForm({
      title: '',
      seasonNumber: 1,
      status: 'in_production',
      targetEpisodesCount: 10,
      executiveProducer: '',
      notes: '',
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-amber-400 mb-1">
            <Tv className="w-3.5 h-3.5" />
            <span>Catálogo & Temporadas • Fase 3</span>
          </div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">
            Catálogo de Programas & Produções
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Configure a identidade editorial, temporadas ativas (produções), câmeras padrão e canais de distribuição.
          </p>
        </div>
        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-sm flex items-center gap-2 shadow-lg shadow-amber-500/15 transition-all cursor-pointer self-start"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Novo Programa no Catálogo</span>
          </button>
        )}
      </div>

      {/* Create / Edit Show Form */}
      {isCreating && (
        <form
          onSubmit={handleSubmit}
          className="bg-zinc-900 border border-amber-500/30 rounded-2xl p-6 space-y-5 shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <h2 className="text-lg font-bold text-zinc-100">
              {editingId ? 'Editar Programa do Catálogo' : 'Cadastrar Novo Programa'}
            </h2>
            <button
              type="button"
              onClick={resetForm}
              className="text-zinc-400 hover:text-zinc-200 p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {!editingId && kbPrograms.length > 0 && (
            <div className="bg-zinc-950/90 border border-amber-500/20 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-zinc-300">
                <BookOpen className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  Preencher a partir da <strong>Base de Conhecimento RS Play</strong> (Mídia Kits):
                </span>
              </div>
              <select
                defaultValue=""
                onChange={(e) => {
                  const selected = kbPrograms.find((p) => p.slug === e.target.value);
                  if (selected) {
                    setFormData((prev) => ({
                      ...prev,
                      title: selected.nome,
                      host:
                        selected.apresentador && selected.apresentador !== 'não informado na fonte'
                          ? selected.apresentador
                          : prev.host,
                      description:
                        selected.descricao && selected.descricao !== 'não informado na fonte'
                          ? selected.descricao
                          : prev.description,
                    }));
                  }
                }}
                className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-100"
              >
                <option value="">Selecionar programa da base RS Play...</option>
                {kbPrograms.map((kb) => (
                  <option key={kb.slug} value={kb.slug}>
                    {kb.nome}{' '}
                    {kb.hasMediaKitHtml ? `(Mídia Kit • ${kb.secoesCount} seções)` : '(Catálogo)'}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                Nome do Programa *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Bastidores do Poder"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                Status no Catálogo
              </label>
              <select
                value={formData.catalogStatus}
                onChange={(e) =>
                  setFormData({ ...formData, catalogStatus: e.target.value as CatalogStatus })
                }
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100"
              >
                {Object.entries(CATALOG_STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                Apresentador(a) Principal
              </label>
              <input
                type="text"
                value={formData.host}
                onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                placeholder="Ex: Rafael Mendes"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                Formato do Programa
              </label>
              <select
                value={formData.format}
                onChange={(e) =>
                  setFormData({ ...formData, format: e.target.value as ShowFormat })
                }
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100"
              >
                {FORMATS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                Duração Padrão (minutos)
              </label>
              <input
                type="number"
                min={5}
                max={300}
                value={formData.defaultDurationMin}
                onChange={(e) =>
                  setFormData({ ...formData, defaultDurationMin: Number(e.target.value) })
                }
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                Editoria / Categoria
              </label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="Ex: Negócios & Documentário"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                Público-Alvo
              </label>
              <input
                type="text"
                value={formData.targetAudience}
                onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                placeholder="Ex: Fundadores, executivos e criadores"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                Canais de Distribuição (vírgula)
              </label>
              <input
                type="text"
                value={formData.distributionChannels}
                onChange={(e) =>
                  setFormData({ ...formData, distributionChannels: e.target.value })
                }
                placeholder="YouTube 4K, Spotify Video, Shorts"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                Descrição & Conceito do Programa
              </label>
              <textarea
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                Estilo Editorial / Tom da Condução
              </label>
              <input
                type="text"
                value={formData.editorialStyle}
                onChange={(e) => setFormData({ ...formData, editorialStyle: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                Cenário / Set de Estúdio
              </label>
              <input
                type="text"
                value={formData.scenario}
                onChange={(e) => setFormData({ ...formData, scenario: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-sm flex items-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{editingId ? 'Salvar Alterações' : 'Criar Programa'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Shows Catalog Cards */}
      <div className="space-y-6">
        {shows.map((show) => {
          const showEpisodes = episodes.filter((e) => e.showId === show.id);
          const showProductions = productions.filter((p) => p.showId === show.id);
          const catalogMeta =
            CATALOG_STATUS_LABELS[show.catalogStatus || 'active'] ||
            CATALOG_STATUS_LABELS.active;

          return (
            <div
              key={show.id}
              className="bg-zinc-900/90 border border-zinc-800/90 rounded-2xl p-6 flex flex-col justify-between gap-5 hover:border-zinc-700 transition-all"
            >
              <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                      <Tv className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-800 text-amber-400">
                          {show.format}
                        </span>
                        <span
                          className={`text-xs font-medium px-2.5 py-0.5 rounded border ${catalogMeta.badge}`}
                        >
                          {catalogMeta.label}
                        </span>
                        {show.category && (
                          <span className="text-xs text-zinc-400 bg-zinc-950 border border-zinc-800 px-2 py-0.5 rounded">
                            {show.category}
                          </span>
                        )}
                      </div>
                      <h3 className="text-xl font-bold text-zinc-100 mt-1">{show.title}</h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(show)}
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Editar Programa
                    </button>
                    {shows.length > 1 && (
                      <button
                        onClick={() => onDeleteShow(show.id)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 cursor-pointer"
                        title="Excluir programa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-sm text-zinc-300 leading-relaxed">{show.description}</p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/70">
                    <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                      <User className="w-3 h-3" /> Apresentador(a)
                    </span>
                    <p className="text-xs font-semibold text-zinc-200 mt-0.5">
                      {show.host || 'Não definido'}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/70">
                    <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Duração Alvo
                    </span>
                    <p className="text-xs font-semibold text-zinc-200 mt-0.5 font-mono">
                      {show.defaultDurationMin} minutos
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/70">
                    <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                      <Target className="w-3 h-3" /> Público-Alvo
                    </span>
                    <p className="text-xs font-semibold text-zinc-200 mt-0.5 truncate">
                      {show.targetAudience || 'Audiência Geral'}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/70">
                    <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                      <Globe className="w-3 h-3" /> Distribuição
                    </span>
                    <p className="text-xs font-semibold text-zinc-200 mt-0.5 truncate">
                      {(show.distributionChannels || ['YouTube']).join(', ')}
                    </p>
                  </div>
                </div>

                {/* FASE 1 a 5: Identidade Editorial do Programa + Curadoria de Pautas */}
                <ProgramIdentityCard
                  show={show}
                  canEditEditorial={canEditShow ? canEditShow(show.id) : true}
                  onUsePitchInProduction={onUsePitchInProduction}
                />

                {/* Productions / Seasons Hierarchy Section */}
                <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-amber-400" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                        Temporadas & Frentes de Produção ({showProductions.length})
                      </h4>
                    </div>
                    {onCreateProduction && (
                      <button
                        onClick={() => {
                          setCreatingProductionForShowId(show.id);
                          setProdForm({
                            title: `Temporada ${showProductions.length + 1}`,
                            seasonNumber: showProductions.length + 1,
                            status: 'in_production',
                            targetEpisodesCount: 10,
                            executiveProducer: show.host || 'Produção Executiva',
                            notes: '',
                          });
                        }}
                        className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-medium cursor-pointer"
                      >
                        <FolderPlus className="w-3.5 h-3.5" />
                        Nova Temporada / Produção
                      </button>
                    )}
                  </div>

                  {showProductions.length === 0 ? (
                    <p className="text-xs text-zinc-500">
                      Nenhuma temporada formalizada ainda para este programa.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {showProductions.map((prod) => {
                        const prodEpisodes = showEpisodes.filter(
                          (e) => e.productionId === prod.id
                        );
                        return (
                          <div
                            key={prod.id}
                            className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
                                  T{prod.seasonNumber}
                                </span>
                                <span className="text-xs font-semibold text-zinc-100 truncate">
                                  {prod.title}
                                </span>
                              </div>
                              <div className="text-[11px] text-zinc-400 mt-1 flex items-center gap-3">
                                <span>{PROD_STATUS_LABELS[prod.status] || prod.status}</span>
                                <span>•</span>
                                <span className="font-mono text-zinc-300">
                                  {prodEpisodes.length}/{prod.targetEpisodesCount} episódios
                                </span>
                              </div>
                            </div>

                            {onDeleteProduction && showProductions.length > 1 && (
                              <button
                                onClick={() => onDeleteProduction(prod.id)}
                                className="p-1.5 text-zinc-500 hover:text-red-400 cursor-pointer"
                                title="Remover temporada"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5 text-amber-400" />
                    {show.cameras.length} Câmeras Padrão
                  </span>
                  <span>•</span>
                  <span className="font-semibold text-zinc-200">
                    {showEpisodes.length} Episódio(s) no Banco
                  </span>
                </div>

                <button
                  onClick={() => onSelectShowFilter(show.id)}
                  className="text-xs font-semibold text-amber-400 hover:text-amber-300 cursor-pointer"
                >
                  Filtrar Episódios deste Programa →
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Production Modal */}
      {creatingProductionForShowId && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-100">
                Nova Temporada / Frente de Produção
              </h3>
              <button
                onClick={() => setCreatingProductionForShowId(null)}
                className="text-zinc-400 hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProductionSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Título da Temporada / Produção *
                </label>
                <input
                  type="text"
                  required
                  value={prodForm.title}
                  onChange={(e) => setProdForm({ ...prodForm, title: e.target.value })}
                  placeholder="Ex: Temporada 2 — Liderança sob Pressão"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Nº da Temporada
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={prodForm.seasonNumber}
                    onChange={(e) =>
                      setProdForm({ ...prodForm, seasonNumber: Number(e.target.value) })
                    }
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Meta de Episódios
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={prodForm.targetEpisodesCount}
                    onChange={(e) =>
                      setProdForm({ ...prodForm, targetEpisodesCount: Number(e.target.value) })
                    }
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Status da Produção
                </label>
                <select
                  value={prodForm.status}
                  onChange={(e) =>
                    setProdForm({ ...prodForm, status: e.target.value as ProductionStatus })
                  }
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100"
                >
                  {Object.entries(PROD_STATUS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Produção Executiva Responsável
                </label>
                <input
                  type="text"
                  value={prodForm.executiveProducer}
                  onChange={(e) =>
                    setProdForm({ ...prodForm, executiveProducer: e.target.value })
                  }
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setCreatingProductionForShowId(null)}
                  className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-xs font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-amber-500 text-zinc-950 text-xs font-semibold cursor-pointer"
                >
                  Criar Temporada
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
