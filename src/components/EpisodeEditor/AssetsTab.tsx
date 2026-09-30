import React, { useState } from 'react';
import {
  FolderOpen,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Image,
  Video,
  FileText,
  PieChart,
  Package,
  Newspaper
} from 'lucide-react';
import { Episode, ProductionAsset } from '../../types';

interface AssetsTabProps {
  episode: Episode;
  onUpdateEpisode: (updated: Partial<Episode>) => void;
  onAdvanceToNextTab: () => void;
}

export const AssetsTab: React.FC<AssetsTabProps> = ({
  episode,
  onUpdateEpisode,
  onAdvanceToNextTab,
}) => {
  const assets = episode.assets || [];
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<ProductionAsset['type']>('foto');
  const [newDesc, setNewDesc] = useState('');
  const [newMoment, setNewMoment] = useState('');

  const handleAddAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const asset: ProductionAsset = {
      id: `ast-${Date.now()}`,
      title: newTitle,
      type: newType,
      description: newDesc,
      moment: newMoment,
      status: 'pendente',
    };

    onUpdateEpisode({ assets: [...assets, asset] });
    setShowAddModal(false);
    setNewTitle('');
    setNewDesc('');
    setNewMoment('');
  };

  const handleToggleStatus = (id: string) => {
    const statusCycle: ProductionAsset['status'][] = ['pendente', 'em_busca', 'obtido', 'aprovado'];
    const updated = assets.map((a) => {
      if (a.id !== id) return a;
      const nextIdx = (statusCycle.indexOf(a.status) + 1) % statusCycle.length;
      return { ...a, status: statusCycle[nextIdx] };
    });
    onUpdateEpisode({ assets: updated });
  };

  const handleDeleteAsset = (id: string) => {
    onUpdateEpisode({ assets: assets.filter((a) => a.id !== id) });
  };

  const getStatusBadge = (status: ProductionAsset['status']) => {
    switch (status) {
      case 'aprovado':
        return 'bg-emerald-950/70 border-emerald-700/60 text-emerald-400';
      case 'obtido':
        return 'bg-sky-950/70 border-sky-700/60 text-sky-400';
      case 'em_busca':
        return 'bg-amber-950/70 border-amber-700/60 text-amber-400';
      default:
        return 'bg-zinc-800 border-zinc-700 text-zinc-400';
    }
  };

  const getTypeIcon = (type: ProductionAsset['type']) => {
    switch (type) {
      case 'foto':
        return <Image className="w-4 h-4 text-emerald-400" />;
      case 'video':
        return <Video className="w-4 h-4 text-sky-400" />;
      case 'documento':
        return <FileText className="w-4 h-4 text-indigo-400" />;
      case 'grafico':
        return <PieChart className="w-4 h-4 text-amber-400" />;
      case 'produto':
        return <Package className="w-4 h-4 text-purple-400" />;
      case 'materia':
        return <Newspaper className="w-4 h-4 text-red-400" />;
      default:
        return <FolderOpen className="w-4 h-4 text-zinc-400" />;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <FolderOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-100">B-Roll, Fotos & Materiais de Apoio</h2>
            <p className="text-xs text-zinc-400">
              Checklist de arquivos visuais e objetos de cena que devem ser inseridos durante a narrativa.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar Material</span>
          </button>

          <button
            onClick={onAdvanceToNextTab}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Avançar para Cortes →
          </button>
        </div>
      </div>

      {/* Assets Grid */}
      {assets.length === 0 ? (
        <div className="text-center py-12 px-4 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/40">
          <FolderOpen className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
          <p className="text-xs text-zinc-400">
            Nenhum material de apoio cadastrado. Adicione fotos antigas, recortes ou vídeos para enriquecer a edição.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl p-5 flex flex-col justify-between space-y-3 transition-all"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded bg-zinc-950 border border-zinc-800">
                      {getTypeIcon(asset.type)}
                    </span>
                    <span className="text-[11px] font-mono uppercase text-zinc-400 font-bold">
                      {asset.type}
                    </span>
                  </div>

                  <button
                    onClick={() => handleToggleStatus(asset.id)}
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border transition-colors cursor-pointer ${getStatusBadge(
                      asset.status
                    )}`}
                    title="Clique para alternar o status do material"
                  >
                    {asset.status.toUpperCase()}
                  </button>
                </div>

                <h3 className="text-sm font-bold text-zinc-100">{asset.title}</h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{asset.description}</p>
              </div>

              <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500">
                <span className="font-mono text-[11px] text-amber-400/80">
                  <strong>Momento: </strong>
                  {asset.moment || 'Durante a narrativa'}
                </span>
                <button
                  onClick={() => handleDeleteAsset(asset.id)}
                  className="text-zinc-600 hover:text-red-400 p-1 rounded transition-colors cursor-pointer"
                  title="Excluir"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Add Material */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-sm font-bold text-zinc-100">Adicionar Material / B-Roll</h3>
            <form onSubmit={handleAddAsset} className="space-y-3">
              <div>
                <label className="block text-xs text-zinc-300 mb-1">Título do Material</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Foto da Kombi 1989 com as ferramentas"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-300 mb-1">Tipo de Mídia / Objeto</label>
                <select
                  value={newType}
                  onChange={(e: any) => setNewType(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="foto">Foto Antiga / Imagem</option>
                  <option value="video">Vídeo de Arquivo / B-Roll</option>
                  <option value="documento">Documento / Certidão / Contrato</option>
                  <option value="grafico">Gráfico / Estatística</option>
                  <option value="produto">Produto Físico na Bancada</option>
                  <option value="materia">Matéria de Jornal / Notícia</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-zinc-300 mb-1">Descrição</label>
                <textarea
                  rows={2}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Ex: Foto analógica digitalizada mostrando o início..."
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-300 mb-1">Momento do Disparo na Edição</label>
                <input
                  type="text"
                  value={newMoment}
                  onChange={(e) => setNewMoment(e.target.value)}
                  placeholder="Ex: No Bloco 02, quando ele citar a primeira oficina"
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
