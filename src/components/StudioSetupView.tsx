import React, { useState } from 'react';
import { Camera, Plus, Trash2, Edit2, Check, Sliders, Video, Eye } from 'lucide-react';
import { CameraConfig, Show } from '../types';
import { getCameraColor } from '../utils/format';

interface StudioSetupViewProps {
  activeShow: Show | null;
  onUpdateShowCameras: (cameras: CameraConfig[]) => Promise<void>;
}

export const StudioSetupView: React.FC<StudioSetupViewProps> = ({
  activeShow,
  onUpdateShowCameras,
}) => {
  const [cameras, setCameras] = useState<CameraConfig[]>(activeShow?.cameras || []);
  const [editingCamId, setEditingCamId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [label, setLabel] = useState('');
  const [purpose, setPurpose] = useState('');
  const [framing, setFraming] = useState('');

  const handleAddCamera = async () => {
    const nextNum = cameras.length + 1;
    const newCam: CameraConfig = {
      id: `cam-${Date.now()}`,
      name: `CAM ${nextNum}`,
      label: `Câmera ${nextNum}`,
      purpose: 'Enquadramento auxiliar de estúdio',
      framing: 'Plano Geral',
      active: true,
    };
    const updated = [...cameras, newCam];
    setCameras(updated);
    await onUpdateShowCameras(updated);
  };

  const handleDelete = async (id: string) => {
    if (cameras.length <= 1) return;
    const updated = cameras.filter((c) => c.id !== id);
    setCameras(updated);
    await onUpdateShowCameras(updated);
  };

  const startEdit = (cam: CameraConfig) => {
    setEditingCamId(cam.id);
    setName(cam.name);
    setLabel(cam.label);
    setPurpose(cam.purpose);
    setFraming(cam.framing);
  };

  const saveEdit = async () => {
    if (!editingCamId) return;
    const updated = cameras.map((c) =>
      c.id === editingCamId ? { ...c, name, label, purpose, framing } : c
    );
    setCameras(updated);
    await onUpdateShowCameras(updated);
    setEditingCamId(null);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sliders className="w-5 h-5 text-amber-400" />
            <h1 className="text-xl md:text-2xl font-bold text-zinc-100">Configurações de Estúdio & Câmeras</h1>
          </div>
          <p className="text-xs text-zinc-400">
            Defina o setup padrão de câmeras para o programa <strong className="text-zinc-200">{activeShow?.title}</strong>.
          </p>
        </div>

        <button
          onClick={handleAddCamera}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-lg flex items-center gap-2 transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Adicionar Câmera</span>
        </button>
      </div>

      {/* Cameras List */}
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
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded p-1.5 text-xs text-zinc-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-zinc-400">Posição</label>
                      <input
                        type="text"
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded p-1.5 text-xs text-zinc-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-zinc-400">Enquadramento</label>
                    <input
                      type="text"
                      value={framing}
                      onChange={(e) => setFraming(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded p-1.5 text-xs text-zinc-100"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-zinc-400">Função</label>
                    <textarea
                      rows={2}
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
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
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(cam.id)}
                        disabled={cameras.length <= 1}
                        className="p-1 text-zinc-600 hover:text-red-400 rounded disabled:opacity-20"
                        title="Excluir"
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
