import React, { useState } from 'react';
import {
  Camera,
  CheckSquare,
  Sparkles,
  Plus,
  Trash2,
  Video,
  Scissors,
  CheckCircle,
  FileCheck2,
  Sliders,
  Tv,
  Layers,
  UploadCloud,
  ExternalLink,
  Users,
  Eye
} from 'lucide-react';
import {
  Episode,
  CameraConfig,
  PlannedShort,
  ProductionMaterial,
  ChecklistItem
} from '../../types';
import { getCameraColorClass } from '../../utils/format';

interface EpisodeProductionWorkspaceProps {
  episode: Episode;
  availableCameras: CameraConfig[];
  onUpdateEpisode: (updated: Episode) => void;
}

export const EpisodeProductionWorkspace: React.FC<EpisodeProductionWorkspaceProps> = ({
  episode,
  availableCameras,
  onUpdateEpisode,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'cameras' | 'shorts' | 'assets' | 'checklist'>('cameras');

  // New Camera state
  const [newCamName, setNewCamName] = useState('');
  const [newCamRole, setNewCamRole] = useState('Apresentador');
  const [newCamType, setNewCamType] = useState<'close' | 'medium' | 'wide' | 'overhead' | 'mobile'>('close');

  // New Short state
  const [newShortTitle, setNewShortTitle] = useState('');
  const [newShortHook, setNewShortHook] = useState('');
  const [newShortCam, setNewShortCam] = useState(availableCameras[0]?.name || 'CAM 1');

  // Handle Checklist toggle
  const handleToggleChecklist = (checkId: string) => {
    const list = episode.checklist || [];
    const updated = list.map(item => {
      if (item.id === checkId) {
        return { ...item, completed: !item.completed };
      }
      return item;
    });

    onUpdateEpisode({
      ...episode,
      checklist: updated,
      updatedAt: new Date().toISOString()
    });
  };

  const handleAddChecklistItem = (task: string, category: ChecklistItem['category']) => {
    if (!task.trim()) return;
    const newItem: ChecklistItem = {
      id: `chk-${Date.now()}`,
      task,
      category,
      completed: false,
      assignedTo: 'Produção'
    };

    onUpdateEpisode({
      ...episode,
      checklist: [...(episode.checklist || []), newItem],
      updatedAt: new Date().toISOString()
    });
  };

  const handleAddPlannedShort = () => {
    if (!newShortTitle.trim()) return;
    const newShort: PlannedShort = {
      id: `sh-${Date.now()}`,
      title: newShortTitle,
      suggestedHook: newShortHook || 'O momento exato que mudou a história...',
      narrativeArc: 'Início provocativo -> Tensão -> Conclusão chocante',
      expectedDurationSeconds: 45,
      cameraFocus: newShortCam,
      bRollNotes: 'Inserir zoom dinâmico 9:16 e legendas automáticas',
      targetPlatform: ['Instagram Reels', 'TikTok', 'YouTube Shorts']
    };

    onUpdateEpisode({
      ...episode,
      plannedShorts: [...(episode.plannedShorts || []), newShort],
      updatedAt: new Date().toISOString()
    });

    setNewShortTitle('');
    setNewShortHook('');
  };

  const handleDeleteShort = (id: string) => {
    onUpdateEpisode({
      ...episode,
      plannedShorts: (episode.plannedShorts || []).filter(s => s.id !== id),
      updatedAt: new Date().toISOString()
    });
  };

  const completedChecks = (episode.checklist || []).filter(c => c.completed).length;
  const totalChecks = (episode.checklist || []).length;
  const checklistPercent = totalChecks > 0 ? Math.round((completedChecks / totalChecks) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Sub-navigation bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-xl p-3">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveSubTab('cameras')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
              activeSubTab === 'cameras'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            Mapa de Câmeras & Enquadramentos
          </button>

          <button
            onClick={() => setActiveSubTab('shorts')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
              activeSubTab === 'shorts'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Scissors className="w-3.5 h-3.5" />
            Planejador de Cortes / Shorts ({(episode.plannedShorts || []).length})
          </button>

          <button
            onClick={() => setActiveSubTab('checklist')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
              activeSubTab === 'checklist'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            Checklist de Estúdio ({checklistPercent}%)
          </button>

          <button
            onClick={() => setActiveSubTab('assets')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
              activeSubTab === 'assets'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            GCs & Materiais Visuais ({(episode.materials || []).length})
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 pr-2">
          <span>Formato:</span>
          <span className="font-semibold text-purple-300">{episode.format}</span>
        </div>
      </div>

      {/* SUBTAB: CAMERAS & STUDIO SPATIAL MAP */}
      {activeSubTab === 'cameras' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Visual Studio Diagram */}
            <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Video className="w-4 h-4 text-purple-400" />
                    Layout Físico do Estúdio & Posicionamento
                  </h3>
                  <p className="text-xs text-slate-400">
                    Posição relativa das câmeras, apresentador e convidados no set.
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-[11px] text-slate-300">
                  {availableCameras.length} Câmeras Ativas
                </span>
              </div>

              {/* Spatial Arena Representation */}
              <div className="relative w-full h-80 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex flex-col justify-between p-6">
                {/* Background Grid Pattern */}
                <div
                  className="absolute inset-0 opacity-15 pointer-events-none"
                  style={{
                    backgroundImage: 'radial-gradient(#a855f7 1px, transparent 1px)',
                    backgroundSize: '20px 20px'
                  }}
                />

                {/* Studio Center Stage */}
                <div className="relative z-10 flex items-center justify-around w-full mt-4">
                  {/* Presenter Position */}
                  <div className="flex flex-col items-center">
                    <div className="w-14 h-14 rounded-full bg-purple-900/80 border-2 border-purple-400 flex items-center justify-center text-purple-200 shadow-lg shadow-purple-900/40">
                      <Users className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-white mt-1.5">
                      {episode.presenterName || 'Apresentador'}
                    </span>
                    <span className="text-[10px] text-purple-400">Posição Fixa (Mesa)</span>
                  </div>

                  {/* Program Logo / Set Backdrop */}
                  <div className="px-4 py-2 rounded-lg bg-slate-900/90 border border-slate-700 text-center">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Cenário / Telão</p>
                    <p className="text-xs font-semibold text-slate-200">{episode.title}</p>
                  </div>

                  {/* Guests / Participants Position */}
                  <div className="flex flex-col items-center">
                    <div className="w-14 h-14 rounded-full bg-amber-900/80 border-2 border-amber-400 flex items-center justify-center text-amber-200 shadow-lg shadow-amber-900/40">
                      <Users className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-white mt-1.5">
                      {episode.participants?.length ? episode.participants[0].name : 'Convidado(s)'}
                    </span>
                    <span className="text-[10px] text-amber-400">Poltrona Convidado</span>
                  </div>
                </div>

                {/* Camera Triangulation Points (Bottom) */}
                <div className="relative z-10 flex items-center justify-between w-full pt-4 border-t border-slate-800/80">
                  {availableCameras.map((cam, idx) => {
                    const badgeClass = getCameraColorClass(cam.name);
                    return (
                      <div key={cam.id || idx} className="flex flex-col items-center text-center">
                        <div className={`p-2 rounded-full border shadow-md ${badgeClass} mb-1 animate-pulse`}>
                          <Camera className="w-4 h-4" />
                        </div>
                        <span className="text-[11px] font-bold text-white">{cam.name}</span>
                        <span className="text-[9px] text-slate-400 max-w-[90px] truncate">{cam.target}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Camera Setup Cards */}
            <div className="lg:col-span-5 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-purple-400" />
                Especificações Técnicas de Câmera
              </h3>

              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {availableCameras.map(cam => (
                  <div
                    key={cam.id}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2 hover:border-slate-700 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                        <span className="text-xs font-bold text-white">{cam.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {(cam.shotType || 'médio').toUpperCase()}
                        </span>
                      </div>
                      <span className="text-[10px] text-purple-400 font-mono">
                        {cam.focalLength || '50mm f/1.8'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300">
                      <strong className="text-slate-400">Enquadramento:</strong> {cam.target}
                    </p>
                    {cam.lensNotes && (
                      <p className="text-[11px] text-slate-400 italic">
                        Nota: {cam.lensNotes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB: SHORTS & CLIPS PLANNER */}
      {activeSubTab === 'shorts' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-pink-400" />
                  Estratégia de Cortes & Shorts (TikTok, Reels, Shorts)
                </h3>
                <p className="text-xs text-slate-400">
                  Planeje com antecedência momentos de alto impacto para cortes verticais (9:16) com ganchos fortes nos primeiros 3 segundos.
                </p>
              </div>
            </div>

            {/* Quick Add Short Form */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                + Planejar Novo Corte
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={newShortTitle}
                  onChange={e => setNewShortTitle(e.target.value)}
                  placeholder="Título do Corte (Ex: A falência que gerou a virada)"
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500"
                />
                <input
                  type="text"
                  value={newShortHook}
                  onChange={e => setNewShortHook(e.target.value)}
                  placeholder="Gancho de Abertura (Primeiros 3 segundos na cara do público)"
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Câmera Principal:</span>
                  <select
                    value={newShortCam}
                    onChange={e => setNewShortCam(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-200"
                  >
                    {availableCameras.map(cam => (
                      <option key={cam.id} value={cam.name}>{cam.name}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleAddPlannedShort}
                  className="px-4 py-1.5 bg-pink-600 hover:bg-pink-500 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Salvar Corte
                </button>
              </div>
            </div>

            {/* Shorts List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {(episode.plannedShorts || []).map(short => (
                <div
                  key={short.id}
                  className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-950 text-pink-300 border border-pink-800">
                        {short.expectedDurationSeconds || 45}s vertical
                      </span>
                      <button
                        onClick={() => handleDeleteShort(short.id)}
                        className="text-slate-500 hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <h4 className="text-sm font-bold text-white">{short.title}</h4>

                    <div className="bg-slate-900/90 rounded-lg p-2.5 border border-slate-800 space-y-1">
                      <span className="text-[10px] font-bold text-amber-400 uppercase">Gancho (3s):</span>
                      <p className="text-xs text-slate-200 italic font-serif">"{short.suggestedHook}"</p>
                    </div>

                    {short.narrativeArc && (
                      <p className="text-[11px] text-slate-400">
                        <strong className="text-slate-300">Arco:</strong> {short.narrativeArc}
                      </p>
                    )}

                    <div className="text-[10px] text-purple-300 flex items-center gap-1 pt-1">
                      <Camera className="w-3 h-3" />
                      Foco: {short.cameraFocus}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 pt-2 border-t border-slate-800/80">
                    {(short.targetPlatform || ['Reels', 'TikTok', 'Shorts']).map(plat => (
                      <span key={plat} className="px-1.5 py-0.5 rounded bg-slate-900 text-[10px] text-slate-400">
                        {plat}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB: CHECKLIST */}
      {activeSubTab === 'checklist' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-emerald-400" />
                  Checklist Técnico de Pré-Gravação
                </h3>
                <p className="text-xs text-slate-400">
                  Garante que luz, áudio, câmeras e teleprompter estejam impecáveis antes de rodar o estúdio.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-400">
                  {completedChecks} de {totalChecks} concluídos
                </span>
                <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${checklistPercent}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {['audio', 'video', 'content', 'guest'].map(cat => {
                const categoryItems = (episode.checklist || []).filter(c => c.category === cat);
                const titles: Record<string, string> = {
                  audio: 'Áudio & Microfones',
                  video: 'Câmeras, Switcher & Iluminação',
                  content: 'Conteúdo & Teleprompter',
                  guest: 'Acolhimento & Recepção de Participantes'
                };

                return (
                  <div key={cat} className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2.5">
                    <h4 className="text-xs font-bold text-purple-300 uppercase tracking-wider">
                      {titles[cat] || cat}
                    </h4>

                    <div className="space-y-1.5">
                      {categoryItems.map(item => (
                        <button
                          key={item.id}
                          onClick={() => handleToggleChecklist(item.id)}
                          className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-900/70 hover:bg-slate-900 transition text-left"
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-4 h-4 rounded flex items-center justify-center border transition ${
                                item.completed
                                  ? 'bg-emerald-600 border-emerald-500 text-white'
                                  : 'border-slate-600 bg-slate-800'
                              }`}
                            >
                              {item.completed && <CheckCircle className="w-3.5 h-3.5" />}
                            </div>
                            <span
                              className={`text-xs ${
                                item.completed ? 'line-through text-slate-500' : 'text-slate-200'
                              }`}
                            >
                              {item.task}
                            </span>
                          </div>

                          {item.assignedTo && (
                            <span className="text-[10px] text-slate-500">{item.assignedTo}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB: ASSETS & GRAPHICS */}
      {activeSubTab === 'assets' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                GCs, Letterings, Vinhetas e Materiais de Apoio
              </h3>
              <p className="text-xs text-slate-400">
                Textos de GC (Lower Third) para participantes e assets audiovisuais preparados para o switcher.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(episode.materials || []).map(mat => (
                <div
                  key={mat.id}
                  className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2 hover:border-slate-700 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                      {mat.type.toUpperCase()}
                    </span>
                    <span className="text-[11px] text-purple-400">No ar em: {mat.displayTime}</span>
                  </div>

                  <h4 className="text-sm font-semibold text-white">{mat.title}</h4>
                  <p className="text-xs text-slate-300 bg-slate-900 p-2 rounded border border-slate-800">
                    {mat.content}
                  </p>
                  {mat.notes && (
                    <p className="text-[10px] text-slate-400 italic">Nota: {mat.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
