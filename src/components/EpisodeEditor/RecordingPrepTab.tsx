import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  PlayCircle,
  Plus,
  Sliders,
  Mic,
  Camera,
  Battery,
  HardDrive,
  Volume2,
  Smartphone,
  Coffee,
  Sparkles
} from 'lucide-react';
import { Episode, TechnicalChecklist } from '../../types';

interface RecordingPrepTabProps {
  episode: Episode;
  onUpdateEpisode: (updated: Partial<Episode>) => void;
  onOpenStudioMode: () => void;
}

export const RecordingPrepTab: React.FC<RecordingPrepTabProps> = ({
  episode,
  onUpdateEpisode,
  onOpenStudioMode,
}) => {
  const checklist = episode.technicalChecklist || {
    cam1Recording: false,
    cam2Recording: false,
    cam3Recording: false,
    micHost: false,
    micGuest: false,
    audioMonitored: false,
    lighting: false,
    memoryCardsStorage: false,
    batteries: false,
    syncClap: false,
    waterReady: false,
    silentPhones: false,
    customItems: [],
  };

  const [newCustomLabel, setNewCustomLabel] = useState('');

  // Automated Content Verification (Section 47)
  const autoVerifications = [
    {
      label: 'Roteiro e falas estruturadas',
      passed: (episode.script || []).length > 3,
      detail: `${(episode.script || []).length} cenas mapeadas`,
    },
    {
      label: 'Abertura frontal cadastrada',
      passed: (episode.script || []).some((s) => s.type === 'opening' || s.type === 'cold_open'),
      detail: 'Cold open ou abertura na CAM 1',
    },
    {
      label: 'Encerramento e chamada de ação (CTA)',
      passed: (episode.script || []).some((s) => s.type === 'closing'),
      detail: 'Texto final do apresentador',
    },
    {
      label: 'Setup de câmeras configurado',
      passed: (episode.cameras || []).length >= 2,
      detail: `${(episode.cameras || []).length} câmeras ativas`,
    },
    {
      label: 'Perguntas com repiques investigativos',
      passed: (episode.questions || []).some((q) => (q.followUps || []).length > 0),
      detail: 'Ramificações inteligentes prontas',
    },
    {
      label: 'Materiais / B-Roll obtidos',
      passed: !(episode.assets || []).some((a) => a.status === 'pendente'),
      detail: (episode.assets || []).some((a) => a.status === 'pendente')
        ? 'Atenção: há materiais pendentes de busca'
        : 'Todos os materiais prontos',
    },
  ];

  const allAutoPassed = autoVerifications.every((v) => v.passed);

  const toggleTechnicalItem = (key: keyof Omit<TechnicalChecklist, 'customItems'>) => {
    const updated = {
      ...checklist,
      [key]: !checklist[key],
    };
    onUpdateEpisode({ technicalChecklist: updated });
  };

  const toggleCustomItem = (id: string) => {
    const updatedCustom = (checklist.customItems || []).map((it) =>
      it.id === id ? { ...it, done: !it.done } : it
    );
    onUpdateEpisode({
      technicalChecklist: { ...checklist, customItems: updatedCustom },
    });
  };

  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomLabel.trim()) return;

    const newItem = {
      id: `chk-${Date.now()}`,
      label: newCustomLabel,
      done: false,
    };

    onUpdateEpisode({
      technicalChecklist: {
        ...checklist,
        customItems: [...(checklist.customItems || []), newItem],
      },
    });
    setNewCustomLabel('');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner and Big Studio Action */}
      <div className="bg-gradient-to-r from-red-950/40 via-zinc-900 to-zinc-900 border border-red-900/60 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-mono font-bold text-red-400 uppercase tracking-wider">
              Área de Gravação Técnica
            </span>
          </div>
          <h2 className="text-xl font-bold text-zinc-100">Pronto para o Estúdio?</h2>
          <p className="text-xs text-zinc-400 mt-1 max-w-xl">
            Verifique o checklist automático de conteúdo e os itens técnicos de áudio, câmeras e iluminação antes de iniciar a gravação.
          </p>
        </div>

        <button
          onClick={onOpenStudioMode}
          className="px-6 py-3.5 bg-red-600 hover:bg-red-500 text-white font-extrabold text-sm rounded-xl flex items-center justify-center gap-2.5 shadow-xl shadow-red-950/60 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shrink-0"
        >
          <PlayCircle className="w-5 h-5 fill-white/20" />
          <span>🎬 INICIAR MODO ESTÚDIO</span>
        </button>
      </div>

      {/* Grid: Auto Editorial Checklist vs Technical Hardware Checklist */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Automated Editorial Checklist */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold font-mono text-zinc-200 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>1. Checklist Editorial & Roteiro</span>
            </h3>
            <span
              className={`text-[11px] font-mono px-2 py-0.5 rounded font-bold ${
                allAutoPassed
                  ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-400'
                  : 'bg-amber-950/60 border border-amber-800 text-amber-400'
              }`}
            >
              {allAutoPassed ? 'Roteiro Aprovado ✓' : 'Atenção aos Detalhes'}
            </span>
          </div>

          <div className="space-y-2.5">
            {autoVerifications.map((v, i) => (
              <div
                key={i}
                className="bg-zinc-950/60 border border-zinc-800/80 rounded-lg p-3 flex items-start gap-3"
              >
                <div className="pt-0.5">
                  {v.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-200">{v.label}</h4>
                  <p className="text-[11px] text-zinc-400 font-mono mt-0.5">{v.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Technical Studio Checklist */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold font-mono text-zinc-200 uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-sky-400" />
              <span>2. Checklist Técnico do Estúdio</span>
            </h3>
            <span className="text-[11px] font-mono text-zinc-400">Antes do REC</span>
          </div>

          <div className="space-y-2 text-xs">
            <label className="flex items-center gap-3 p-2.5 bg-zinc-950/60 border border-zinc-800 rounded-lg cursor-pointer hover:bg-zinc-950">
              <input
                type="checkbox"
                checked={checklist.cam1Recording}
                onChange={() => toggleTechnicalItem('cam1Recording')}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
              <Camera className="w-4 h-4 text-red-400" />
              <span className="text-zinc-200 font-medium">CAM 1 gravando & enquadrada</span>
            </label>

            <label className="flex items-center gap-3 p-2.5 bg-zinc-950/60 border border-zinc-800 rounded-lg cursor-pointer hover:bg-zinc-950">
              <input
                type="checkbox"
                checked={checklist.cam2Recording}
                onChange={() => toggleTechnicalItem('cam2Recording')}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
              <Camera className="w-4 h-4 text-amber-400" />
              <span className="text-zinc-200 font-medium">CAM 2 gravando (Apresentador 45°)</span>
            </label>

            <label className="flex items-center gap-3 p-2.5 bg-zinc-950/60 border border-zinc-800 rounded-lg cursor-pointer hover:bg-zinc-950">
              <input
                type="checkbox"
                checked={checklist.cam3Recording}
                onChange={() => toggleTechnicalItem('cam3Recording')}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
              <Camera className="w-4 h-4 text-sky-400" />
              <span className="text-zinc-200 font-medium">CAM 3 gravando (Convidado 45°)</span>
            </label>

            <label className="flex items-center gap-3 p-2.5 bg-zinc-950/60 border border-zinc-800 rounded-lg cursor-pointer hover:bg-zinc-950">
              <input
                type="checkbox"
                checked={checklist.micHost}
                onChange={() => toggleTechnicalItem('micHost')}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
              <Mic className="w-4 h-4 text-emerald-400" />
              <span className="text-zinc-200 font-medium">Microfone do Apresentador nivelado (-12dB)</span>
            </label>

            <label className="flex items-center gap-3 p-2.5 bg-zinc-950/60 border border-zinc-800 rounded-lg cursor-pointer hover:bg-zinc-950">
              <input
                type="checkbox"
                checked={checklist.micGuest}
                onChange={() => toggleTechnicalItem('micGuest')}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
              <Mic className="w-4 h-4 text-emerald-400" />
              <span className="text-zinc-200 font-medium">Microfone do Convidado testado e sem ruído</span>
            </label>

            <label className="flex items-center gap-3 p-2.5 bg-zinc-950/60 border border-zinc-800 rounded-lg cursor-pointer hover:bg-zinc-950">
              <input
                type="checkbox"
                checked={checklist.lighting}
                onChange={() => toggleTechnicalItem('lighting')}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
              <span className="w-4 h-4 flex items-center justify-center text-amber-400">💡</span>
              <span className="text-zinc-200 font-medium">Iluminação principal e luz de recorte acesas</span>
            </label>

            <label className="flex items-center gap-3 p-2.5 bg-zinc-950/60 border border-zinc-800 rounded-lg cursor-pointer hover:bg-zinc-950">
              <input
                type="checkbox"
                checked={checklist.syncClap}
                onChange={() => toggleTechnicalItem('syncClap')}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
              <span className="w-4 h-4 flex items-center justify-center text-amber-400">🎬</span>
              <span className="text-zinc-200 font-medium">Sincronização / Claquete executada</span>
            </label>

            <label className="flex items-center gap-3 p-2.5 bg-zinc-950/60 border border-zinc-800 rounded-lg cursor-pointer hover:bg-zinc-950">
              <input
                type="checkbox"
                checked={checklist.waterReady}
                onChange={() => toggleTechnicalItem('waterReady')}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
              <Coffee className="w-4 h-4 text-sky-400" />
              <span className="text-zinc-200 font-medium">Água na bancada para apresentador e convidado</span>
            </label>

            <label className="flex items-center gap-3 p-2.5 bg-zinc-950/60 border border-zinc-800 rounded-lg cursor-pointer hover:bg-zinc-950">
              <input
                type="checkbox"
                checked={checklist.silentPhones}
                onChange={() => toggleTechnicalItem('silentPhones')}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
              <Smartphone className="w-4 h-4 text-purple-400" />
              <span className="text-zinc-200 font-medium">Celulares no modo silencioso / avião</span>
            </label>

            {/* Custom Technical Items */}
            {(checklist.customItems || []).map((ci) => (
              <label
                key={ci.id}
                className="flex items-center gap-3 p-2.5 bg-zinc-950/60 border border-zinc-800 rounded-lg cursor-pointer hover:bg-zinc-950"
              >
                <input
                  type="checkbox"
                  checked={ci.done}
                  onChange={() => toggleCustomItem(ci.id)}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
                <span className="text-zinc-300">{ci.label}</span>
              </label>
            ))}
          </div>

          {/* Form add custom check item */}
          <form onSubmit={handleAddCustomItem} className="flex gap-2 pt-2 border-t border-zinc-800">
            <input
              type="text"
              value={newCustomLabel}
              onChange={(e) => setNewCustomLabel(e.target.value)}
              placeholder="Adicionar item técnico..."
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-lg cursor-pointer"
            >
              + Adicionar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
