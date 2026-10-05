import React, { useState } from 'react';
import {
  FolderKanban,
  Plus,
  Search,
  Image,
  Video,
  FileText,
  Music,
  Sparkles,
  CheckCircle2,
  Trash2,
  Tag,
  Film,
  X,
} from 'lucide-react';
import { AssetStatus, AssetType, Episode, LibraryAsset, Show } from '../types';

interface LibraryViewProps {
  libraryAssets: LibraryAsset[];
  shows: Show[];
  episodes: Episode[];
  selectedShowId: string;
  onCreateAsset: (payload: Partial<LibraryAsset>) => Promise<void>;
  onUpdateAsset: (id: string, payload: Partial<LibraryAsset>) => Promise<void>;
  onDeleteAsset: (id: string) => Promise<void>;
  onOpenEpisode: (episodeId: string) => void;
}

const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  vinheta: 'Vinheta de Estúdio',
  trilha: 'Trilha / Áudio',
  video: 'B-Roll / Vídeo',
  foto: 'Fotografia / Imagem',
  documento: 'Documento / Dossiê',
  grafico: 'Gráfico / Dados',
  produto: 'Objeto de Cena',
  materia: 'Recorte de Imprensa',
};

const ASSET_STATUS_STYLES: Record<AssetStatus, string> = {
  aprovado: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  obtido: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  em_busca: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  pendente: 'bg-zinc-800 text-zinc-400 border-zinc-700',
};

export const LibraryView: React.FC<LibraryViewProps> = ({
  libraryAssets,
  shows,
  episodes,
  selectedShowId,
  onCreateAsset,
  onUpdateAsset,
  onDeleteAsset,
  onOpenEpisode,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultShowId = selectedShowId !== 'ALL' ? selectedShowId : shows[0]?.id || '';
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState<AssetType>('video');
  const [formStatus, setFormStatus] = useState<AssetStatus>('aprovado');
  const [formShowId, setFormShowId] = useState(defaultShowId);
  const [formEpisodeId, setFormEpisodeId] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formMoment, setFormMoment] = useState('');
  const [formTags, setFormTags] = useState('b-roll, estúdio, 4k');
  const [formReusable, setFormReusable] = useState(true);

  const filteredAssets = libraryAssets.filter((ast) => {
    if (selectedShowId !== 'ALL' && ast.showId && ast.showId !== selectedShowId) return false;
    if (filterType !== 'ALL' && ast.type !== filterType) return false;
    if (filterStatus !== 'ALL' && ast.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = ast.title.toLowerCase().includes(q);
      const matchDesc = (ast.description || '').toLowerCase().includes(q);
      const matchTags = (ast.tags || []).some((t) => t.toLowerCase().includes(q));
      if (!matchTitle && !matchDesc && !matchTags) return false;
    }
    return true;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;
    setIsSubmitting(true);
    try {
      await onCreateAsset({
        title: formTitle.trim(),
        type: formType,
        status: formStatus,
        showId: formShowId || undefined,
        episodeId: formEpisodeId || undefined,
        description: formDescription.trim(),
        moment: formMoment.trim() || 'Acervo permanente do programa',
        tags: formTags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        reusable: formReusable,
      });
      setIsModalOpen(false);
      setFormTitle('');
      setFormDescription('');
      setFormMoment('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-amber-400 mb-1">
            <FolderKanban className="w-3.5 h-3.5" />
            <span>Acervo Transversal • Fase 3</span>
          </div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">
            Biblioteca de Assets & Materiais de Estúdio
          </h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            Vinhetas, trilhas, B-rolls, dossiês e imagens sincronizados entre episódios e programas.
          </p>
        </div>

        <button
          onClick={() => {
            setFormShowId(selectedShowId !== 'ALL' ? selectedShowId : shows[0]?.id || '');
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-sm transition cursor-pointer shadow-lg shadow-amber-500/10"
        >
          <Plus className="w-4 h-4" />
          Catalogar Novo Asset
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-zinc-900/60 border border-zinc-800/70 rounded-xl p-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por título, descrição ou tag (ex: 4k, vinheta, drone)..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
          />
        </div>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200"
        >
          <option value="ALL">Todos os Formatos</option>
          {Object.entries(ASSET_TYPE_LABELS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200"
        >
          <option value="ALL">Todos os Status</option>
          <option value="aprovado">Aprovado para Estúdio</option>
          <option value="obtido">Obtido / Em Triagem</option>
          <option value="em_busca">Em Busca pela Produção</option>
          <option value="pendente">Pendente</option>
        </select>
      </div>

      {/* Asset Grid */}
      {filteredAssets.length === 0 ? (
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-12 text-center">
          <FolderKanban className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-zinc-200">
            Nenhum material encontrado na biblioteca
          </h3>
          <p className="text-sm text-zinc-400 mt-1 max-w-md mx-auto">
            Adicione vinhetas, trilhas ou B-rolls reutilizáveis, ou crie assets diretamente na aba "Assets & B-Roll" de qualquer episódio.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAssets.map((ast) => {
            const show = shows.find((s) => s.id === ast.showId);
            return (
              <div
                key={ast.id}
                className="bg-zinc-900/90 border border-zinc-800/90 hover:border-zinc-700 rounded-xl p-5 flex flex-col justify-between gap-4 transition"
              >
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono uppercase px-2.5 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-amber-400">
                        {ASSET_TYPE_LABELS[ast.type] || ast.type}
                      </span>
                      <span
                        className={`text-xs font-medium px-2.5 py-0.5 rounded border uppercase ${
                          ASSET_STATUS_STYLES[ast.status] || ASSET_STATUS_STYLES.pendente
                        }`}
                      >
                        {ast.status}
                      </span>
                    </div>

                    {ast.reusable && (
                      <span className="text-[11px] font-mono text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                        Reutilizável
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-zinc-100">{ast.title}</h3>
                  {ast.description && (
                    <p className="text-xs text-zinc-400 leading-relaxed">{ast.description}</p>
                  )}

                  {ast.moment && (
                    <div className="text-xs text-zinc-300 bg-zinc-950/70 border border-zinc-800/80 rounded-lg px-3 py-2 font-mono">
                      Deixa / Aplicação: {ast.moment}
                    </div>
                  )}

                  {ast.tags && ast.tags.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {ast.tags.map((t, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 text-[11px] text-zinc-400 bg-zinc-950 border border-zinc-800/90 px-2 py-0.5 rounded"
                        >
                          <Tag className="w-2.5 h-2.5 text-amber-500/70" />
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-zinc-800/80 text-xs">
                  <div className="text-zinc-400 truncate max-w-[65%]">
                    {show ? <span className="text-zinc-300 font-medium">{show.title}</span> : null}
                    {ast.episodeId && ast.episodeTitle ? (
                      <button
                        onClick={() => onOpenEpisode(ast.episodeId!)}
                        className="ml-2 text-amber-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Film className="w-3 h-3" />
                        {ast.episodeTitle}
                      </button>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {ast.status !== 'aprovado' && (
                      <button
                        onClick={() => onUpdateAsset(ast.id, { status: 'aprovado' })}
                        className="px-2.5 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-medium cursor-pointer"
                      >
                        Aprovar
                      </button>
                    )}
                    <button
                      onClick={() => onDeleteAsset(ast.id)}
                      className="p-1.5 rounded bg-zinc-950 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 border border-zinc-800 cursor-pointer"
                      title="Excluir asset da biblioteca"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Novo Asset */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h2 className="text-lg font-bold text-zinc-100">
                Catalogar Material na Biblioteca
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Título do Material / Asset *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ex: Vinheta de Transição 4K / B-Roll Drone Noturno"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Tipo</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as AssetType)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100"
                  >
                    {Object.entries(ASSET_TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as AssetStatus)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100"
                  >
                    <option value="aprovado">Aprovado</option>
                    <option value="obtido">Obtido</option>
                    <option value="em_busca">Em Busca</option>
                    <option value="pendente">Pendente</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Programa Vinculado
                  </label>
                  <select
                    value={formShowId}
                    onChange={(e) => setFormShowId(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100"
                  >
                    <option value="">Acervo Global da Organização</option>
                    {shows.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Episódio (Opcional)
                  </label>
                  <select
                    value={formEpisodeId}
                    onChange={(e) => setFormEpisodeId(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100"
                  >
                    <option value="">Uso transversal (Múltiplos episódios)</option>
                    {episodes
                      .filter((ep) => !formShowId || ep.showId === formShowId)
                      .map((ep) => (
                        <option key={ep.id} value={ep.id}>
                          EP #{ep.episodeNumber} — {ep.title}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Descrição Técnica / Editorial
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Deixa / Momento de Aplicação
                </label>
                <input
                  type="text"
                  value={formMoment}
                  onChange={(e) => setFormMoment(e.target.value)}
                  placeholder="Ex: Abertura após Cold Open / Bloco 2"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Tags de Indexação (separadas por vírgula)
                </label>
                <input
                  type="text"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-semibold cursor-pointer"
                >
                  {isSubmitting ? 'Salvando...' : 'Catalogar na Biblioteca'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
