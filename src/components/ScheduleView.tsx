import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Film,
  MapPin,
  Plus,
  Users,
  CheckCircle2,
  AlertCircle,
  Play,
  Trash2,
  Filter,
  Clapperboard,
  Edit3,
  X,
} from 'lucide-react';
import {
  Episode,
  Production,
  ScheduleEvent,
  ScheduleEventStatus,
  ScheduleEventType,
  Show,
} from '../types';

interface ScheduleViewProps {
  scheduleEvents: ScheduleEvent[];
  shows: Show[];
  productions: Production[];
  episodes: Episode[];
  selectedShowId: string;
  onCreateEvent: (payload: Partial<ScheduleEvent>) => Promise<void>;
  onUpdateEvent: (id: string, payload: Partial<ScheduleEvent>) => Promise<void>;
  onDeleteEvent: (id: string) => Promise<void>;
  onOpenEpisode: (episodeId: string) => void;
}

const EVENT_TYPE_LABELS: Record<ScheduleEventType, { label: string; color: string }> = {
  pre_interview: {
    label: 'Pré-Entrevista',
    color: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
  },
  briefing: {
    label: 'Briefing & Som',
    color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
  },
  rehearsal: {
    label: 'Ensaio Técnico',
    color: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  },
  recording: {
    label: 'Gravação Estúdio',
    color: 'bg-red-500/15 text-red-400 border-red-500/30',
  },
  editing: {
    label: 'Ilha de Edição',
    color: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  },
  review: {
    label: 'Revisão / Corte',
    color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  },
  release: {
    label: 'Publicação / Master',
    color: 'bg-teal-500/10 text-teal-400 border-teal-500/30',
  },
};

const EVENT_STATUS_LABELS: Record<ScheduleEventStatus, { label: string; badge: string }> = {
  scheduled: {
    label: 'Agendado',
    badge: 'bg-zinc-800 text-zinc-300 border-zinc-700',
  },
  confirmed: {
    label: 'Confirmado',
    badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
  in_progress: {
    label: 'Em Andamento',
    badge: 'bg-red-500/20 text-red-300 border-red-500/40',
  },
  completed: {
    label: 'Concluído',
    badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  cancelled: {
    label: 'Cancelado',
    badge: 'bg-zinc-900 text-zinc-500 border-zinc-800 line-through',
  },
};

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  scheduleEvents,
  shows,
  productions,
  episodes,
  selectedShowId,
  onCreateEvent,
  onUpdateEvent,
  onDeleteEvent,
  onOpenEpisode,
}) => {
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultShowId =
    selectedShowId !== 'ALL' ? selectedShowId : shows[0]?.id || '';

  const [formTitle, setFormTitle] = useState('');
  const [formShowId, setFormShowId] = useState(defaultShowId);
  const [formProductionId, setFormProductionId] = useState('');
  const [formEpisodeId, setFormEpisodeId] = useState('');
  const [formType, setFormType] = useState<ScheduleEventType>('recording');
  const [formStatus, setFormStatus] = useState<ScheduleEventStatus>('confirmed');
  const [formDate, setFormDate] = useState('2026-10-06');
  const [formStartTime, setFormStartTime] = useState('14:00');
  const [formEndTime, setFormEndTime] = useState('16:00');
  const [formLocation, setFormLocation] = useState('Estúdio Principal (Set A)');
  const [formTeam, setFormTeam] = useState('Diretor de Corte, Apresentador, Produtor de Pauta');
  const [formNotes, setFormNotes] = useState('');

  const openCreateModal = () => {
    const targetShow = selectedShowId !== 'ALL' ? selectedShowId : shows[0]?.id || '';
    const showProds = productions.filter((p) => p.showId === targetShow);
    const showEps = episodes.filter((e) => e.showId === targetShow);

    setEditingEvent(null);
    setFormShowId(targetShow);
    setFormProductionId(showProds[0]?.id || '');
    setFormEpisodeId(showEps[0]?.id || '');
    setFormTitle('');
    setFormType('recording');
    setFormStatus('confirmed');
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormStartTime('14:00');
    setFormEndTime('16:00');
    setFormLocation('Estúdio Principal (Set A)');
    setFormTeam('Helena Costa, Rafael Mendes, Equipe Técnica');
    setFormNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (ev: ScheduleEvent) => {
    setEditingEvent(ev);
    setFormShowId(ev.showId);
    setFormProductionId(ev.productionId || '');
    setFormEpisodeId(ev.episodeId || '');
    setFormTitle(ev.title);
    setFormType(ev.type);
    setFormStatus(ev.status);
    const startObj = new Date(ev.scheduledStart);
    const endObj = new Date(ev.scheduledEnd);
    setFormDate(
      !Number.isNaN(startObj.getTime())
        ? startObj.toISOString().slice(0, 10)
        : '2026-10-06'
    );
    setFormStartTime(
      !Number.isNaN(startObj.getTime())
        ? startObj.toISOString().slice(11, 16)
        : '14:00'
    );
    setFormEndTime(
      !Number.isNaN(endObj.getTime())
        ? endObj.toISOString().slice(11, 16)
        : '16:00'
    );
    setFormLocation(ev.studioLocation);
    setFormTeam((ev.assignedTeam || []).join(', '));
    setFormNotes(ev.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formShowId) return;
    setIsSubmitting(true);
    try {
      const scheduledStart = `${formDate}T${formStartTime}:00.000Z`;
      const scheduledEnd = `${formDate}T${formEndTime}:00.000Z`;
      const payload: Partial<ScheduleEvent> = {
        showId: formShowId,
        productionId: formProductionId || undefined,
        episodeId: formEpisodeId || undefined,
        title: formTitle.trim(),
        type: formType,
        status: formStatus,
        scheduledStart,
        scheduledEnd,
        studioLocation: formLocation.trim(),
        assignedTeam: formTeam
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        notes: formNotes.trim(),
      };

      if (editingEvent) {
        await onUpdateEvent(editingEvent.id, payload);
      } else {
        await onCreateEvent(payload);
      }
      setIsModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredEvents = scheduleEvents.filter((ev) => {
    if (selectedShowId !== 'ALL' && ev.showId !== selectedShowId) return false;
    if (filterType !== 'ALL' && ev.type !== filterType) return false;
    if (filterStatus !== 'ALL' && ev.status !== filterStatus) return false;
    return true;
  });

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatHour = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString().slice(11, 16);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-amber-400 mb-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>Operação de Estúdio • Fase 3</span>
          </div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">
            Agenda de Produção & Estúdio
          </h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            Planejamento operacional conectado diretamente aos programas, temporadas e episódios.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-sm transition cursor-pointer shadow-lg shadow-amber-500/10"
        >
          <Plus className="w-4 h-4" />
          Agendar Sessão de Estúdio
        </button>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-xl p-4">
          <span className="text-xs text-zinc-400 uppercase tracking-wider">Sessões na Agenda</span>
          <div className="text-2xl font-bold text-zinc-100 mt-1 font-mono">
            {filteredEvents.length}
          </div>
        </div>
        <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-xl p-4">
          <span className="text-xs text-zinc-400 uppercase tracking-wider">Gravações de Estúdio</span>
          <div className="text-2xl font-bold text-red-400 mt-1 font-mono">
            {filteredEvents.filter((e) => e.type === 'recording').length}
          </div>
        </div>
        <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-xl p-4">
          <span className="text-xs text-zinc-400 uppercase tracking-wider">Confirmadas</span>
          <div className="text-2xl font-bold text-amber-400 mt-1 font-mono">
            {filteredEvents.filter((e) => e.status === 'confirmed').length}
          </div>
        </div>
        <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-xl p-4">
          <span className="text-xs text-zinc-400 uppercase tracking-wider">Concluídas</span>
          <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono">
            {filteredEvents.filter((e) => e.status === 'completed').length}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-zinc-900/60 border border-zinc-800/70 rounded-xl p-3">
        <div className="flex items-center gap-1.5 text-xs text-zinc-400 px-2">
          <Filter className="w-3.5 h-3.5 text-amber-400" />
          <span>Filtrar Operação:</span>
        </div>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
        >
          <option value="ALL">Todos os Tipos de Sessão</option>
          {Object.entries(EVENT_TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
        >
          <option value="ALL">Todos os Status</option>
          {Object.entries(EVENT_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
      </div>

      {/* Events Timeline List */}
      {filteredEvents.length === 0 ? (
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-12 text-center">
          <Calendar className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-zinc-200">
            Nenhum compromisso operacional encontrado
          </h3>
          <p className="text-sm text-zinc-400 mt-1 max-w-md mx-auto">
            Agende gravações de estúdio, briefings de convidados ou sessões de ilha de edição vinculadas aos seus episódios.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEvents.map((ev) => {
            const show = shows.find((s) => s.id === ev.showId);
            const prod = productions.find((p) => p.id === ev.productionId);
            const typeMeta = EVENT_TYPE_LABELS[ev.type] || EVENT_TYPE_LABELS.recording;
            const statusMeta = EVENT_STATUS_LABELS[ev.status] || EVENT_STATUS_LABELS.scheduled;

            return (
              <div
                key={ev.id}
                className="bg-zinc-900/90 border border-zinc-800/90 hover:border-zinc-700 rounded-xl p-5 transition flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-xs font-medium px-2.5 py-0.5 rounded border ${typeMeta.color}`}
                    >
                      {typeMeta.label}
                    </span>
                    <span
                      className={`text-xs font-medium px-2.5 py-0.5 rounded border ${statusMeta.badge}`}
                    >
                      {statusMeta.label}
                    </span>
                    {show && (
                      <span className="text-xs text-zinc-400 bg-zinc-950 border border-zinc-800 px-2.5 py-0.5 rounded">
                        {show.title}
                      </span>
                    )}
                    {prod && (
                      <span className="text-xs text-amber-400/90 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded font-mono">
                        T{prod.seasonNumber}: {prod.title}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-zinc-100">{ev.title}</h3>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400">
                    <span className="inline-flex items-center gap-1.5 font-mono text-zinc-300">
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />
                      {formatDateTime(ev.scheduledStart)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-mono text-zinc-300">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      {formatHour(ev.scheduledStart)} — {formatHour(ev.scheduledEnd)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                      {ev.studioLocation || 'Estúdio Principal'}
                    </span>
                    {ev.assignedTeam && ev.assignedTeam.length > 0 && (
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-zinc-500" />
                        {ev.assignedTeam.join(', ')}
                      </span>
                    )}
                  </div>

                  {ev.notes && (
                    <p className="text-xs text-zinc-400 bg-zinc-950/70 border border-zinc-800/70 rounded-lg px-3 py-2">
                      {ev.notes}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {ev.episodeId && (
                    <button
                      onClick={() => onOpenEpisode(ev.episodeId!)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-medium transition cursor-pointer"
                    >
                      <Clapperboard className="w-3.5 h-3.5" />
                      Abrir Episódio {ev.episodeNumber ? `#${ev.episodeNumber}` : ''}
                    </button>
                  )}

                  {ev.status !== 'completed' && (
                    <button
                      onClick={() => onUpdateEvent(ev.id, { status: 'completed' })}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-medium transition cursor-pointer"
                      title="Marcar sessão como concluída"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Concluir
                    </button>
                  )}

                  <button
                    onClick={() => openEditModal(ev)}
                    className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition cursor-pointer"
                    title="Editar sessão"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onDeleteEvent(ev.id)}
                    className="p-2 rounded-lg bg-zinc-900 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 border border-zinc-800 transition cursor-pointer"
                    title="Remover da agenda"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-zinc-100">
                  {editingEvent ? 'Editar Sessão de Estúdio' : 'Agendar Sessão de Produção'}
                </h2>
                <p className="text-xs text-zinc-400">
                  Vincule o compromisso ao programa, temporada e episódio correspondentes.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Título do Compromisso *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ex: Gravação Oficial 3 Câmeras — EP #13"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Programa (Show) *
                  </label>
                  <select
                    value={formShowId}
                    onChange={(e) => {
                      const newShowId = e.target.value;
                      setFormShowId(newShowId);
                      const prods = productions.filter((p) => p.showId === newShowId);
                      const eps = episodes.filter((ep) => ep.showId === newShowId);
                      setFormProductionId(prods[0]?.id || '');
                      setFormEpisodeId(eps[0]?.id || '');
                    }}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100"
                  >
                    {shows.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Temporada / Produção
                  </label>
                  <select
                    value={formProductionId}
                    onChange={(e) => setFormProductionId(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100"
                  >
                    <option value="">Sem vínculo de temporada</option>
                    {productions
                      .filter((p) => p.showId === formShowId)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          T{p.seasonNumber} — {p.title}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Episódio Vinculado (Opcional)
                </label>
                <select
                  value={formEpisodeId}
                  onChange={(e) => setFormEpisodeId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100"
                >
                  <option value="">Sessão geral do programa (sem episódio específico)</option>
                  {episodes
                    .filter((ep) => ep.showId === formShowId)
                    .map((ep) => (
                      <option key={ep.id} value={ep.id}>
                        EP #{ep.episodeNumber} — {ep.title} ({ep.guestName || 'Solo'})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Tipo de Sessão
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as ScheduleEventType)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100"
                  >
                    {Object.entries(EVENT_TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Status Operacional
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as ScheduleEventStatus)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100"
                  >
                    {Object.entries(EVENT_STATUS_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Data</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Início</label>
                  <input
                    type="time"
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Término</label>
                  <input
                    type="time"
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Estúdio / Localização
                </label>
                <input
                  type="text"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Equipe Escalada (separada por vírgula)
                </label>
                <input
                  type="text"
                  value={formTeam}
                  onChange={(e) => setFormTeam(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Observações de Operação / Técnica
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
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
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting
                    ? 'Persistindo...'
                    : editingEvent
                    ? 'Salvar Alterações'
                    : 'Confirmar Agendamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
