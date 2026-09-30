import React, { useState } from 'react';
import { Camera, Plus, Trash2, Edit2, Check, Video, Eye, Sliders } from 'lucide-react';
import { Episode, CameraConfig } from '../../types';
import { getCameraColor } from '../../utils/format';

interface CamerasTabProps {
  episode: Episode;
  onUpdateEpisode: (updated: Partial<Episode>) => void;
  onAdvanceToNextTab: () => void;
}

export const CamerasTab: React.FC<CamerasTabProps> = ({
  episode,
  onUpdateEpisode,
  onAdvanceToNextTab,
}) => {
  const cameras = episode.cameras || [];
  const [editingCamId, setEditingCamId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editLabel, setEditLabel] = useState('');
  const [editPurpose, setEditPurpose] = useState('');
  const [editFraming, setEditFraming] = useState('');

  const handleAddCamera = () => {
    const nextNum = cameras.length + 1;
    const newCam: CameraConfig = {
      id: `cam-${Date.now()}`,
      name: `CAM ${nextNum}`,
      label: `Câmera Adicional ${nextNum}`,
      purpose: 'Plano aberto ou detalhe da bancada',
      framing: 'Plano Geral Aberto',
      active: true,
    };
    onUpdateEpisode({ cameras: [...cameras, newCam] });
  };

  const handleDeleteCamera = (id: string) => {
    if (cameras.length <= 1) return;
    onUpdateEpisode({ cameras: cameras.filter((c) => c.id !== id) });
  };

  const startEdit = (cam: CameraConfig) => {
    setEditingCamId(cam.id);
    setEditName(cam.name);
    setEditLabel(cam.label);
    setEditPurpose(cam.purpose);
    setEditFraming(cam.framing);
  };

  const saveEdit = () => {
    if (!editingCamId) return;
    const updated = cameras.map((c) =>
      c.id === editingCamId
        ? {
            ...c,
            name: editName,
            label: editLabel,
            purpose: editPurpose,
            framing: editFraming,
          }
        : c
    );
    onUpdateEpisode({ cameras: updated });
    setEditingCamId(null);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-100">Setup & Mapa de Câmeras do Estúdio</h2>
            <p className="text-xs text-zinc-400">
              Configure enquadramentos, funções e direções de olhar. Suporta de 1 a 4+ câmeras flexíveis.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleAddCamera}
            className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar Câmera</span>
          </button>

          <button
            onClick={onAdvanceToNextTab}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Avançar para Materiais →
          </button>
        </div>
      </div>

      {/* Visual Studio Diagram Simulation */}
      <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-6 relative overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold">
            Simulador de Posicionamento & Eixo Óptico
          </span>
          <span className="text-xs text-zinc-400 font-mono">
            {cameras.length} câmeras ativas
          </span>
        </div>

        {/* Studio Floor Plan Grid */}
        <div className="border border-zinc-800/60 rounded-xl bg-zinc-900/40 p-8 flex flex-col items-center justify-center relative min-h-[220px]">
          {/* Host & Guest Desk */}
          <div className="w-64 h-24 rounded-2xl bg-zinc-800/80 border border-zinc-700 flex items-center justify-between px-6 shadow-2xl relative z-10">
            {/* Host chair */}
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-300 font-bold text-xs shadow-inner">
                AP
              </div>
              <span className="text-[10px] text-zinc-400 font-mono mt-1">Apresentador</span>
            </div>

            <div className="text-[11px] text-zinc-400 font-mono text-center">
              Mesa / Bancada
            </div>

            {/* Guest chair */}
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-sky-500/20 border border-sky-500/50 flex items-center justify-center text-sky-300 font-bold text-xs shadow-inner">
                CV
              </div>
              <span className="text-[10px] text-zinc-400 font-mono mt-1">Convidado</span>
            </div>
          </div>

          {/* Camera Tripods Positioned in Front */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-10 w-full">
            {cameras.map((cam) => {
              const style = getCameraColor(cam.name);
              return (
                <div
                  key={cam.id}
                  className={`flex flex-col items-center p-3 rounded-xl border ${style.border} ${style.bg} transition-all`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${style.badge}`}>
                    {cam.name}
                  </div>
                  <span className="text-xs font-bold text-zinc-200 mt-1.5">{cam.label}</span>
                  <span className="text-[10px] text-zinc-400 font-mono">{cam.framing}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Cameras Detailed List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cameras.map((cam) => {
          const style = getCameraColor(cam.name);
          const isEditing = editingCamId === cam.id;

          return (
            <div
              key={cam.id}
              className={`bg-zinc-900 border rounded-xl p-5 space-y-3 transition-all ${
                isEditing ? 'border-amber-500 ring-1 ring-amber-500/30' : 'border-zinc-800'
              }`}
            >
              {isEditing ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-mono text-zinc-400">Identificação</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded p-1.5 text-xs text-zinc-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-zinc-400">Posição / Ângulo</label>
                      <input
                        type="text"
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded p-1.5 text-xs text-zinc-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-zinc-400">Enquadramento</label>
                    <input
                      type="text"
                      value={editFraming}
                      onChange={(e) => setEditFraming(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded p-1.5 text-xs text-zinc-100"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-zinc-400">Finalidade & Diretriz</label>
                    <textarea
                      rows={2}
                      value={editPurpose}
                      onChange={(e) => setEditPurpose(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded p-1.5 text-xs text-zinc-100"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                    <button
                      onClick={() => setEditingCamId(null)}
                      className="px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={saveEdit}
                      className="px-3 py-1 bg-amber-500 text-zinc-950 font-bold text-xs rounded"
                    >
                      Salvar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${style.badge}`}>
                        {cam.name}
                      </span>
                      <h3 className="text-sm font-bold text-zinc-200">{cam.label}</h3>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEdit(cam)}
                        className="p-1 text-zinc-400 hover:text-amber-400 rounded"
                        title="Editar câmera"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteCamera(cam.id)}
                        disabled={cameras.length <= 1}
                        className="p-1 text-zinc-600 hover:text-red-400 rounded disabled:opacity-20"
                        title="Excluir câmera"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="text-xs space-y-1">
                    <p className="text-zinc-400 font-mono text-[11px]">
                      <strong>Enquadramento: </strong>
                      <span className="text-zinc-300">{cam.framing}</span>
                    </p>
                    <p className="text-zinc-400 leading-relaxed font-sans text-xs">
                      <strong>Função: </strong>
                      {cam.purpose}
                    </p>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
