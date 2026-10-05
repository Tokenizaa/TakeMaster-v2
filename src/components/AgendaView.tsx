import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Tv,
  Users,
  Video,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { AgendaEvent, Episode, Program } from '../types';

interface AgendaViewProps {
  events: AgendaEvent[];
  episodes: Episode[];
  programs: Program[];
  onAddEvent: (event: AgendaEvent) => void;
  onDeleteEvent: (id: string) => void;
}

export const AgendaView: React.FC<AgendaViewProps> = ({
  events,
  episodes,
  programs,
  onAddEvent,
  onDeleteEvent,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newTime, setNewTime] = useState('14:00');
  const [newType, setNewType] = useState<AgendaEvent['type']>('recording');
  const [newEpisodeId, setNewEpisodeId] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const event: AgendaEvent = {
      id: `ev-${Date.now()}`,
      title: newTitle,
      type: newType,
      scheduledDate: newDate,
      scheduledTime: newTime,
      episodeId: newEpisodeId || undefined,
      notes: newNotes
    };

    onAddEvent(event);
    setIsAdding(false);
    setNewTitle('');
    setNewNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-400" />
            Agenda de Produção & Call Sheets
          </h1>
          <p className="text-xs text-slate-400">
            Acompanhe diárias de estúdio, horários de chegada de convidados e prazos de edição.
          </p>
        </div>

        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold shadow-md transition"
        >
          <Plus className="w-4 h-4" />
          + Agendar Gravação
        </button>
      </div>

      {/* Modal Add Event */}
      {isAdding && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold text-white">Agendar Diária / Gravação</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">Título do Evento</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Ex: Gravação Ep 04 - Estúdio Principal"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">Data</label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={e => setNewDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">Horário (Call Time)</label>
                  <input
                    type="time"
                    required
                    value={newTime}
                    onChange={e => setNewTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">Tipo</label>
                  <select
                    value={newType}
                    onChange={e => setNewType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white"
                  >
                    <option value="recording">Gravação no Estúdio</option>
                    <option value="rehearsal">Passagem / Ensaio</option>
                    <option value="meeting">Reunião de Pauta</option>
                    <option value="deadline">Prazo de Entrega Edição</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">Vincular a Episódio</label>
                  <select
                    value={newEpisodeId}
                    onChange={e => setNewEpisodeId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white"
                  >
                    <option value="">Nenhum (Geral)</option>
                    {episodes.map(ep => (
                      <option key={ep.id} value={ep.id}>{ep.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">Notas de Produção (Call Sheet)</label>
                <textarea
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                  placeholder="Instruções para equipe técnica, figurino, alimentação e chegada de convidados..."
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg text-xs"
                >
                  Salvar na Agenda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Events Timeline List */}
      <div className="space-y-3">
        {events.length === 0 ? (
          <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
            <Calendar className="w-12 h-12 text-slate-600 mx-auto" />
            <p className="text-sm text-slate-300 font-medium">Nenhum evento na agenda de produção.</p>
            <button
              onClick={() => setIsAdding(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg text-xs font-semibold"
            >
              Criar Primeiro Agendamento
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map(ev => {
              const ep = episodes.find(e => e.id === ev.episodeId);
              return (
                <div
                  key={ev.id}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3 hover:border-slate-700 transition shadow-sm"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-950 text-purple-300 border border-purple-800">
                        {ev.type}
                      </span>
                      <button
                        onClick={() => onDeleteEvent(ev.id)}
                        className="text-slate-500 hover:text-red-400 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <h3 className="text-sm font-bold text-white">{ev.title}</h3>

                    <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                      <Clock className="w-3.5 h-3.5 text-purple-400" />
                      <span>{ev.scheduledDate} às {ev.scheduledTime}</span>
                    </div>

                    {ep && (
                      <p className="text-xs text-emerald-400 font-medium">
                        Episódio: {ep.title}
                      </p>
                    )}

                    {ev.notes && (
                      <p className="text-xs text-slate-400 bg-slate-950 p-2.5 rounded border border-slate-800">
                        {ev.notes}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
