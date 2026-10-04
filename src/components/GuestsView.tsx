import React, { useState } from 'react';
import {
  Users,
  Plus,
  Search,
  ExternalLink,
  Building,
  Mail,
  Phone,
  FileText,
  Clock,
  Sparkles
} from 'lucide-react';
import { Guest } from '../types';

interface GuestsViewProps {
  guests: Guest[];
  onSaveGuest: (guest: Partial<Guest>) => Promise<void>;
  onNewEpisodeWithGuest: (guest: Guest) => void;
}

export const GuestsView: React.FC<GuestsViewProps> = ({
  guests,
  onSaveGuest,
  onNewEpisodeWithGuest,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [company, setCompany] = useState('');
  const [bio, setBio] = useState('');
  const [contacts, setContacts] = useState('');
  const [notes, setNotes] = useState('');

  const filteredGuests = guests.filter(
    (g) =>
      g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await onSaveGuest({
      name,
      role,
      company,
      bio,
      contacts,
      notes,
      links: [],
      previousEpisodes: [],
    });

    setName('');
    setRole('');
    setCompany('');
    setBio('');
    setContacts('');
    setNotes('');
    setShowAddModal(false);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-5 h-5 text-amber-400" />
            <h1 className="text-xl md:text-2xl font-bold text-zinc-100">Banco de Convidados & Histórico</h1>
          </div>
          <p className="text-xs text-zinc-400">
            Cadastre entrevistados, preserve pesquisas prévias e recupere dossiês em novos episódios.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-lg flex items-center gap-2 transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Novo Convidado</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por nome, cargo ou empresa..."
          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-amber-500"
        />
      </div>

      {/* Guests Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredGuests.map((guest) => (
          <div
            key={guest.id}
            className="bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 rounded-xl p-5 flex flex-col justify-between space-y-4 transition-all"
          >
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-amber-400 text-sm">
                  {guest.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-100">{guest.name}</h3>
                  <p className="text-xs text-zinc-400">
                    {guest.role} {guest.company ? `· ${guest.company}` : ''}
                  </p>
                </div>
              </div>

              <p className="text-xs text-zinc-300 line-clamp-3 leading-relaxed">
                {guest.bio || 'Sem biografia cadastrada.'}
              </p>

              {guest.contacts && (
                <div className="mt-3 text-[11px] font-mono text-zinc-400 bg-zinc-950 p-2 rounded border border-zinc-850 truncate">
                  {guest.contacts}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
              <span className="text-[11px] font-mono text-zinc-500">
                {(guest.previousEpisodes || []).length} episódios gravados
              </span>

              <button
                onClick={() => onNewEpisodeWithGuest(guest)}
                className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-amber-300 font-semibold text-xs rounded transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Criar Episódio</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Add Guest */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-lg p-6 space-y-4">
            <h3 className="text-sm font-bold text-zinc-100">Cadastrar Novo Convidado</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs text-zinc-300 mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Dra. Camila Nogueira"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-300 mb-1">Cargo / Especialidade</label>
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="Ex: Cofundadora & CTO"
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-300 mb-1">Empresa</label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Ex: BioHealth Analytics"
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-300 mb-1">Biografia Resumida</label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Ex: Pioneira em inteligência artificial na saúde..."
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-300 mb-1">Contatos / Assessoria</label>
                <input
                  type="text"
                  value={contacts}
                  onChange={(e) => setContacts(e.target.value)}
                  placeholder="E-mail ou WhatsApp da assessoria"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-300 mb-1">Notas Internas & Recomendações</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Fala com entusiasmo sobre inovação; prefere perguntas diretas"
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
                  Salvar Convidado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
