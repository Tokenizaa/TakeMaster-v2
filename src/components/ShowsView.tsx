import React, { useState } from 'react';
import {
  Tv,
  Plus,
  Clock,
  User,
  Sliders,
  Sparkles,
  Trash2,
  Film
} from 'lucide-react';
import { Show, ShowFormat } from '../types';

interface ShowsViewProps {
  shows: Show[];
  activeShowId: string;
  onSelectShowId: (id: string) => void;
  onSaveShow: (show: Partial<Show>) => Promise<void>;
  onDeleteShow: (id: string) => Promise<void>;
}

export const ShowsView: React.FC<ShowsViewProps> = ({
  shows,
  activeShowId,
  onSelectShowId,
  onSaveShow,
  onDeleteShow,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [host, setHost] = useState('');
  const [format, setFormat] = useState<ShowFormat>('Entrevista');
  const [defaultDurationMin, setDefaultDurationMin] = useState(45);
  const [editorialStyle, setEditorialStyle] = useState('');
  const [scenario, setScenario] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    await onSaveShow({
      title,
      description,
      host,
      format,
      defaultDurationMin,
      editorialStyle,
      scenario,
      cameras: [
        {
          id: 'cam-1',
          name: 'CAM 1',
          label: 'Frontal Apresentador',
          purpose: 'Abertura, encerramento, passagens e teleprompter',
          framing: 'Plano Médio Frontal',
          active: true,
        },
        {
          id: 'cam-2',
          name: 'CAM 2',
          label: '45° Apresentador',
          purpose: 'Perguntas e interação na bancada',
          framing: 'Plano Médio 45°',
          active: true,
        },
        {
          id: 'cam-3',
          name: 'CAM 3',
          label: '45° Convidado',
          purpose: 'Respostas e closes do entrevistado',
          framing: 'Plano Fechado 45°',
          active: true,
        },
      ],
      standardStructure: ['Gancho', 'Abertura', 'Origem', 'A Crise', 'A Virada', 'Ping-Pong', 'Encerramento'],
      defaultOpening: 'Bem-vindos a mais um episódio...',
      defaultClosing: 'Obrigado por nos acompanhar até aqui. Nos vemos na próxima semana!',
    });

    setTitle('');
    setDescription('');
    setHost('');
    setEditorialStyle('');
    setScenario('');
    setShowAddModal(false);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Tv className="w-5 h-5 text-amber-400" />
            <h1 className="text-xl md:text-2xl font-bold text-zinc-100">Programas & Identidades Editoriais</h1>
          </div>
          <p className="text-xs text-zinc-400">
            Cadastre os formatos principais. Novos episódios herdam estrutura, duração e setup de câmeras.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-lg flex items-center gap-2 transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Novo Programa</span>
        </button>
      </div>

      {/* Shows Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {shows.map((show) => {
          const isActive = show.id === activeShowId;
          return (
            <div
              key={show.id}
              className={`rounded-2xl p-6 transition-all border flex flex-col justify-between space-y-4 ${
                isActive
                  ? 'bg-zinc-900 border-amber-500/80 ring-1 ring-amber-500/30'
                  : 'bg-zinc-900/70 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase">
                      {show.format}
                    </span>
                    {isActive && (
                      <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                        PROGRAMA SELECIONADO
                      </span>
                    )}
                  </div>

                  {shows.length > 1 && (
                    <button
                      onClick={() => onDeleteShow(show.id)}
                      className="text-zinc-600 hover:text-red-400 p-1 transition-colors cursor-pointer"
                      title="Excluir programa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <h3 className="text-lg font-bold text-zinc-100">{show.title}</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">{show.description}</p>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-2 border-t border-zinc-800/80">
                  <div className="text-zinc-400">
                    Apresentador: <strong className="text-zinc-200">{show.host || 'Apresentador'}</strong>
                  </div>
                  <div className="text-zinc-400">
                    Duração Padrão: <strong className="text-zinc-200">{show.defaultDurationMin} min</strong>
                  </div>
                </div>

                {show.editorialStyle && (
                  <p className="text-[11px] text-zinc-400 bg-zinc-950 p-2.5 rounded-lg border border-zinc-850 italic">
                    Estilo: {show.editorialStyle}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
                <span className="text-xs font-mono text-zinc-500">
                  {show.cameras?.length || 3} câmeras configuradas
                </span>

                {!isActive && (
                  <button
                    onClick={() => onSelectShowId(show.id)}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    Tornar Programa Ativo
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Add Show */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-lg p-6 space-y-4">
            <h3 className="text-sm font-bold text-zinc-100">Criar Novo Programa</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs text-zinc-300 mb-1">Título do Programa</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Mentes de Valor"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-300 mb-1">Apresentador Principal</label>
                  <input
                    type="text"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    placeholder="Ex: Renan Vianna"
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-300 mb-1">Formato</label>
                  <select
                    value={format}
                    onChange={(e: any) => setFormat(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Entrevista">Entrevista</option>
                    <option value="Podcast/Videocast">Podcast/Videocast</option>
                    <option value="Programa Solo">Programa Solo</option>
                    <option value="Mesa Redonda">Mesa Redonda</option>
                    <option value="Debate">Debate</option>
                    <option value="Reportagem">Reportagem</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-300 mb-1">Duração Estimada (min)</label>
                <input
                  type="number"
                  min={10}
                  max={240}
                  value={defaultDurationMin}
                  onChange={(e) => setDefaultDurationMin(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-300 mb-1">Descrição Editorial</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Entrevistas com líderes de negócios com foco na verdade dos bastidores..."
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-300 mb-1">Estilo & Cenário</label>
                <input
                  type="text"
                  value={scenario}
                  onChange={(e) => setScenario(e.target.value)}
                  placeholder="Ex: Estúdio escuro com iluminação pontual e mesa rústica"
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
                  Salvar Programa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
