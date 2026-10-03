import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  Trash2,
  ChevronDown,
  ChevronUp,
  Save,
  X,
  AlertTriangle
} from 'lucide-react';
import { Guest, ParticipantType, GroupType, EntityType } from '../types/domain';
import { ErrorMessage } from './ErrorMessage';
import { validateParticipantData } from '../validation/participants.validators';

interface ParticipantsViewProps {
  guests: Guest[];
  onGetParticipants: () => Promise<Guest[]>;
  onSaveParticipant: (guest: Partial<Guest>) => Promise<Guest>;
  onDeleteParticipant: (id: string) => Promise<boolean>;
  fetchError?: string | null;
}

export const ParticipantsView: React.FC<ParticipantsViewProps> = ({
  guests: initialParticipants,
  onGetParticipants,
  onSaveParticipant,
  onDeleteParticipant,
  fetchError,
}) => {
  // Form state for adding new participant
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    values: {
      name: '',
      type: 'individual' as ParticipantType,
      group_type: null as GroupType | null,
      role: '',
      company: '',
      company_or_group: null as string | null,
      bio: '',
      contacts: '',
      notes: '',
      links: [] as string[],
      members: [] as string[],
      entity_type: 'individual' as EntityType,
      social_handles: {} as Record<string, string>,
      previous_episodes: [] as string[],
      previous_research_summary: null as string | null,
    },
    errors: {
      name: '',
      role: '',
      company: '',
      bio: '',
      contacts: '',
      notes: '',
      type: '',
      group_type: '',
      company_or_group: '',
      entity_type: '',
      links: '',
      members: '',
      social_handles: '',
      previous_episodes: '',
      previous_research_summary: '',
    },
    isValid: false
  });

  // Edit inline state
  const [editingParticipantId, setEditingParticipantId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    values: {
      name: '',
      type: 'individual' as ParticipantType,
      group_type: null as GroupType | null,
      role: '',
      company: '',
      company_or_group: null as string | null,
      bio: '',
      contacts: '',
      notes: '',
      links: [] as string[],
      members: [] as string[],
      entity_type: 'individual' as EntityType,
      social_handles: {} as Record<string, string>,
      previous_episodes: [] as string[],
      previous_research_summary: null as string | null,
    },
    errors: {
      name: '',
      role: '',
      company: '',
      bio: '',
      contacts: '',
      notes: '',
      type: '',
      group_type: '',
      company_or_group: '',
      entity_type: '',
      links: '',
      members: '',
      social_handles: '',
      previous_episodes: '',
      previous_research_summary: '',
    },
    isValid: false
  });

  // Participants state (initialized from prop)
  const [participants, setParticipants] = useState<Guest[]>(initialParticipants ?? []);

  // Search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<ParticipantType | ''>('');
  const [groupTypeFilter, setGroupTypeFilter] = useState<GroupType | ''>('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [entityTypeFilter, setEntityTypeFilter] = useState<EntityType | ''>('');
  const [companyFilter, setCompanyFilter] = useState<string>('');

  // Pagination
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Active participant (for double-click activation)
  const [activeParticipantId, setActiveParticipantId] = useState<string | null>(null);

  // Expanded details
  const [expandedParticipantId, setExpandedParticipantId] = useState<string | null>(null);

  // Unified error and success states (following ProgramsView pattern)
  const [error, setError] = useState<string | null>(fetchError ?? null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Loading states
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  // Validation helper functions - shared between add and edit forms
  const validateFormField = useCallback((field: keyof Guest, value: any, isUpdate: boolean = false) => {
    // Create a properly typed temporary object with all fields initialized
    const testData: Partial<Guest> = {
      name: '',
      type: 'individual' as ParticipantType,
      group_type: null as GroupType | null,
      role: '',
      company: '',
      company_or_group: null as string | null,
      bio: '',
      contacts: '',
      notes: '',
      links: [] as string[],
      members: [] as string[],
      entity_type: 'individual' as EntityType,
      social_handles: {} as Record<string, string>,
      previous_episodes: [] as string[],
      previous_research_summary: null as string | null,
      legacy_id: null,
      program_id: null,
    };

    // Set the field value we want to validate
    (testData as any)[field] = value;

    // Use the backend validation function
    const errors = validateParticipantData(testData, isUpdate);

    // Return error message for this field if any, empty string otherwise
    const fieldError = errors.find(err => err.field === field);
    return fieldError ? fieldError.message : '';
  }, []);

  const validateForm = useCallback((values: Partial<Guest>, isUpdate: boolean = false) => {
    // Use the backend validation function directly
    const errors = validateParticipantData(values, isUpdate);

    // Build errors object matching our form state (backend field names)
    const newErrors: typeof addForm.errors = {
      name: '',
      role: '',
      company: '',
      bio: '',
      contacts: '',
      notes: '',
      type: '',
      group_type: '',
      company_or_group: '',
      entity_type: '',
      links: '',
      members: '',
      social_handles: '',
      previous_episodes: '',
      previous_research_summary: '',
    };

    errors.forEach(err => {
      if (err.field in newErrors) {
        newErrors[err.field as keyof typeof newErrors] = err.message;
      }
    });

    const isValid = Object.values(newErrors).every(msg => msg === '');
    return { errors: newErrors, isValid };
  }, []);

  // Fetch participants with filters and pagination
  const fetchParticipants = useCallback(async () => {
    setIsFetching(true);
    setError(null);
    try {
      const data = await onGetParticipants();
      const guestList: Guest[] = Array.isArray(data) ? data : [];
      setParticipants(guestList);
      setTotalCount(guestList.length);
    } catch (err: any) {
      setError(err.message || 'Falha ao carregar participantes');
      console.error('Fetch participants error:', err);
    } finally {
      setIsFetching(false);
    }
  }, [onGetParticipants]);

  // Re-sync when the parent updates the list (create/edit/delete from App state).
  // Without this the local copy goes stale — the table keeps showing the old rows
  // even though the mutation succeeded and the parent state changed.
  useEffect(() => {
    if (initialParticipants) setParticipants(initialParticipants);
  }, [initialParticipants]);

  // Effect to fetch when props change or filters change
  useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants, searchTerm, typeFilter, groupTypeFilter, roleFilter, entityTypeFilter, companyFilter, page, pageSize]);

  // Handle add modal submit
  const handleAddSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields
    const { errors, isValid } = validateForm(addForm.values, false); // false for create
    if (!isValid) {
      setAddForm(prev => ({ ...prev, errors, isValid }));
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(null);
    try {
      const { values } = addForm;
      // Convert empty arrays to undefined and empty strings to null for optional fields
      const newGuest: Partial<Guest> = {
        name: values.name,
        type: values.type,
        group_type: values.group_type,
        role: values.role,
        company: values.company,
        company_or_group: values.company_or_group,
        bio: values.bio,
        contacts: values.contacts,
        notes: values.notes,
        links: values.links.length ? values.links : undefined,
        members: values.members.length ? values.members : undefined,
        entity_type: values.entity_type,
        social_handles: Object.keys(values.social_handles).length ? values.social_handles : undefined,
        previous_episodes: values.previous_episodes.length ? values.previous_episodes : undefined,
        previous_research_summary: values.previous_research_summary ?? undefined,
      };
      await onSaveParticipant(newGuest);
      
      // Reset form
      setAddForm({
        values: {
          name: '',
          type: 'individual' as ParticipantType,
          group_type: null as GroupType | null,
          role: '',
          company: '',
          company_or_group: null as string | null,
          bio: '',
          contacts: '',
          notes: '',
          links: [] as string[],
          members: [] as string[],
          entity_type: 'individual' as EntityType,
          social_handles: {} as Record<string, string>,
          previous_episodes: [] as string[],
          previous_research_summary: null as string | null,
        },
        errors: {
          name: '',
          role: '',
          company: '',
          bio: '',
          contacts: '',
          notes: '',
          type: '',
          group_type: '',
          company_or_group: '',
          entity_type: '',
          links: '',
          members: '',
          social_handles: '',
          previous_episodes: '',
          previous_research_summary: '',
        },
        isValid: false
      });
      
      setShowAddModal(false);
      setSaveSuccess('Participante salvo com sucesso!');
    } catch (err: any) {
      setSaveError(err.message || 'Falha ao salvar participante');
    } finally {
      setIsSaving(false);
    }
  }, [addForm, onSaveParticipant, validateForm]);

  // Start editing a participant (inline)
  const startEditing = useCallback((participant: Guest) => {
    setEditingParticipantId(participant.id);
    
    // Populate edit form with participant data (already in backend field names)
    setEditForm({
      values: {
        name: participant.name,
        type: participant.type,
        group_type: participant.group_type,
        role: participant.role,
        company: participant.company,
        company_or_group: participant.company_or_group,
        bio: participant.bio,
        contacts: participant.contacts,
        notes: participant.notes,
        links: participant.links ?? [],
        members: participant.members ?? [],
        entity_type: participant.entity_type,
        social_handles: participant.social_handles ?? {},
        previous_episodes: participant.previous_episodes ?? [],
        previous_research_summary: participant.previous_research_summary ?? null,
      },
      errors: {
        name: '',
        role: '',
        company: '',
        bio: '',
        contacts: '',
        notes: '',
        type: '',
        group_type: '',
        company_or_group: '',
        entity_type: '',
        links: '',
        members: '',
        social_handles: '',
        previous_episodes: '',
        previous_research_summary: '',
      },
      isValid: false
    });
  }, []);

  // Save edited participant
  const handleEditSave = useCallback(async (participantId: string) => {
    // Validate
    const { errors, isValid } = validateForm(editForm.values, true); // true for update
    if (!isValid) {
      setEditForm(prev => ({ ...prev, errors, isValid }));
      return;
    }

    setIsSaving(true);
    try {
      const { values } = editForm;
      // Convert empty arrays to undefined and empty strings to null for optional fields
      const updatedData: Partial<Guest> = {
        id: participantId,
        name: values.name,
        type: values.type,
        group_type: values.group_type,
        role: values.role,
        company: values.company,
        company_or_group: values.company_or_group,
        bio: values.bio,
        contacts: values.contacts,
        notes: values.notes,
        links: values.links.length ? values.links : undefined,
        members: values.members.length ? values.members : undefined,
        entity_type: values.entity_type,
        social_handles: Object.keys(values.social_handles).length ? values.social_handles : undefined,
        previous_episodes: values.previous_episodes.length ? values.previous_episodes : undefined,
        previous_research_summary: values.previous_research_summary ?? undefined,
      };
      await onSaveParticipant(updatedData);
      setEditingParticipantId(null);
      setSaveSuccess('Participante atualizado com sucesso!');
    } catch (err: any) {
      setSaveError(err.message || 'Falha ao atualizar participante');
    } finally {
      setIsSaving(false);
    }
  }, [editForm, onSaveParticipant, validateForm]);

  // Cancel edit
  const cancelEdit = useCallback(() => {
    setEditingParticipantId(null);
    // Reset edit form
    setEditForm({
      values: {
        name: '',
        type: 'individual' as ParticipantType,
        group_type: null as GroupType | null,
        role: '',
        company: '',
        company_or_group: null as string | null,
        bio: '',
        contacts: '',
        notes: '',
        links: [] as string[],
        members: [] as string[],
        entity_type: 'individual' as EntityType,
        social_handles: {} as Record<string, string>,
        previous_episodes: [] as string[],
        previous_research_summary: null as string | null,
      },
      errors: {
        name: '',
        role: '',
        company: '',
        bio: '',
        contacts: '',
        notes: '',
        type: '',
        group_type: '',
        company_or_group: '',
        entity_type: '',
        links: '',
        members: '',
        social_handles: '',
        previous_episodes: '',
        previous_research_summary: '',
      },
      isValid: false
    });
  }, []);

  // Delete participant with confirmation
  const handleDelete = useCallback(async (participantId: string) => {
    const participantName = participants.find(p => p.id === participantId)?.name ?? '';
    
    // Custom confirmation dialog (simplified - in a real app you'd use a proper modal component)
    if (window.confirm(`Are you sure you want to delete participant "${participantName}"?`)) {
      setDeleteError(null);
      setIsDeleting(true);
      try {
        await onDeleteParticipant(participantId);
        await onGetParticipants(); // Refresh list
      } catch (err) {
        setDeleteError(getErrorMessage(err));
      } finally {
        setIsDeleting(false);
      }
    }
  }, [participants, onDeleteParticipant, onGetParticipants]);

  // Helper to get user-friendly error message (following ProgramsView pattern)
  const getErrorMessage = useCallback((err: any): string => {
    if (err.response) {
      switch (err.response.status) {
        case 400: return 'Por favor, verifique os campos obrigatórios e tente novamente';
        case 401: return 'Você não está autorizado. Por favor, faça login novamente.';
        case 403: return 'Você não tem permissão para realizar esta ação.';
        case 404: return 'O recurso solicitado não foi encontrado.';
        case 500: return 'Ocorreu um erro interno. Por favor, tente novamente mais tarde.';
        default: return `Erro ${err.response.status}: Ocorreu um erro inesperado. Por favor, tente novamente.`;
      }
    }
    return err.message || 'Erro desconhecido';
  }, []);

  // Toggle expanded details
  const toggleExpanded = useCallback((participantId: string) => {
    setExpandedParticipantId(expandedParticipantId === participantId ? null : participantId);
  }, []);

  // Handle double click to set active participant
  const handleDoubleClick = useCallback((participantId: string) => {
    setActiveParticipantId(activeParticipantId === participantId ? null : participantId);
  }, []);

  // Compute filtered and paginated participants with useMemo for performance
  const filteredParticipants = useMemo(() => {
    return participants.filter((p) => {
      const q = searchTerm.toLowerCase();
      const haystack = [p.name, p.role, p.company, p.bio];
      const matchesSearch = !q || haystack.some((f) => (f ?? '').toLowerCase().includes(q));

      const matchesType = typeFilter ? p.type === typeFilter : true;
      const matchesGroupType = groupTypeFilter ? p.group_type === groupTypeFilter : true;
      const matchesRole = roleFilter ? p.role === roleFilter : true;
      const matchesEntityType = entityTypeFilter ? p.entity_type === entityTypeFilter : true;
      const matchesCompany = companyFilter ? (p.company ?? '').toLowerCase().includes(companyFilter.toLowerCase()) : true;

      return matchesSearch && matchesType && matchesGroupType && matchesRole && matchesEntityType && matchesCompany;
    });
  }, [participants, searchTerm, typeFilter, groupTypeFilter, roleFilter, entityTypeFilter, companyFilter]);

  // Paginate
  const paginatedParticipants = useMemo(() => {
    return filteredParticipants.slice(page * pageSize, (page + 1) * pageSize);
  }, [filteredParticipants, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredParticipants.length / pageSize));

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-amber-400" />
            <h1 className="text-xl md:text-2xl font-bold text-zinc-100">Participantes / Convidados</h1>
          </div>
          <p className="text-xs text-zinc-400">
            Gerencie participantes, suas biografias, contatos e históricos de participação.
          </p>
        </div>

        {/* General Error Message */}
        {error && (
          <div className="flex items-center justify-start w-full">
            <ErrorMessage message={error} onDismiss={() => setError(null)} />
          </div>
        )}

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-lg flex items-center gap-2 transition-colors cursor-pointer shrink-0"
          aria-label="Adicionar novo participante"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Novo Participante</span>
        </button>
      </div>

      {/* Fetch Error Message (for backward compatibility) */}
      {fetchError && (
        <div className="flex items-center justify-start w-full mb-4">
          <ErrorMessage message={fetchError} onDismiss={() => {}} />
        </div>
      )}

      {/* Save Error Message */}
      {saveError && (
        <div className="flex items-center justify-start w-full mb-4">
          <ErrorMessage message={saveError} onDismiss={() => setSaveError(null)} />
        </div>
      )}

      {/* Save Success Message */}
      {saveSuccess && (
        <div className="flex items-center justify-start w-full mb-4">
          <div className="p-4 mb-4 bg-green-900/50 border border-green-800/50 text-green-400 rounded-lg flex items-center gap-3">
            <div className="flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{saveSuccess}</p>
            </div>
            <button
              onClick={() => setSaveSuccess(null)}
              className="text-green-400 hover:text-green-200 flex-shrink-0 p-1 rounded"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Delete Error Message */}
      {deleteError && (
        <div className="flex items-center justify-start w-full mb-4">
          <ErrorMessage message={deleteError} onDismiss={() => setDeleteError(null)} />
        </div>
      )}

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative max-w-md w-full">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, cargo, empresa ou bio..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-gl pl-9 pr-4 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Filter dropdowns */}
        <div className="flex flex-wrap gap-2">
          {/* Type Filter */}
          <div className="relative">
            <label className="block text-xs text-zinc-300 mb-1">Tipo</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as ParticipantType)}
              className={`w-32 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500`}
            >
              <option value="">Todos</option>
              <option value="individual">Individual</option>
              <option value="group">Grupo</option>
              <option value="band">Banda</option>
            </select>
          </div>

          {/* Group Type Filter */}
          <div className="relative">
            <label className="block text-xs text-zinc-300 mb-1">Tipo Grupo</label>
            <select
              value={groupTypeFilter}
              onChange={(e) => setGroupTypeFilter(e.target.value as GroupType | '')}
              className={`w-32 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500`}
            >
              <option value="">Todos</option>
              <option value="band">Banda</option>
              <option value="duo">Duo</option>
              <option value="group">Grupo</option>
              <option value="choir">Choir</option>
              <option value="crew">Tripulação</option>
            </select>
          </div>

          {/* Role Filter */}
          <div className="relative">
            <label className="block text-xs text-zinc-300 mb-1">Cargo</label>
            <input
              type="text"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-32 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Entity Type Filter */}
          <div className="relative">
            <label className="block text-xs text-zinc-300 mb-1">Tipo de Entidade</label>
            <select
              value={entityTypeFilter}
              onChange={(e) => setEntityTypeFilter(e.target.value as EntityType)}
              className={`w-32 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500`}
            >
              <option value="">Todos</option>
              <option value="individual">Individual</option>
              <option value="group">Grupo</option>
              <option value="organization">Organização</option>
              <option value="institution">Instituição</option>
            </select>
          </div>

          {/* Company Filter */}
          <div className="relative">
            <label className="block text-xs text-zinc-300 mb-1">Empresa/Organização</label>
            <input
              type="text"
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="w-32 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
      </div>

      {/* Participants Table */}
      <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-800">
            <thead className="bg-zinc-950">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Nome
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Cargo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Empresa/Organização
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Bio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Contatos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {paginatedParticipants.map((participant) => (
                <tr
                  key={participant.id}
                  className={`cursor-pointer hover:bg-zinc-800/50 transition-colors ${
                    activeParticipantId === participant.id ? 'bg-zinc-800/30' : ''
                  }`}
                  onDoubleClick={() => handleDoubleClick(participant.id)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-zinc-100">
                    {editingParticipantId === participant.id ? (
                      <input
                        aria-label="Editar nome"
                        value={editForm.values.name}
                        onChange={(e) => setEditForm((p) => ({ ...p, values: { ...p.values, name: e.target.value } }))}
                        className="w-full min-w-[10rem] bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs"
                      />
                    ) : participant.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-300">
                    {editingParticipantId === participant.id ? (
                      <select
                        aria-label="Editar tipo"
                        value={editForm.values.type ?? ''}
                        onChange={(e) => setEditForm((p) => ({ ...p, values: { ...p.values, type: e.target.value as ParticipantType } }))}
                        className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs"
                      >
                        <option value="individual">Individual</option>
                        <option value="group">Grupo</option>
                        <option value="band">Banda</option>
                      </select>
                    ) : participant.type
                      ? participant.type.charAt(0).toUpperCase() + participant.type.slice(1)
                      : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-300">
                    {editingParticipantId === participant.id ? (
                      <input
                        aria-label="Editar cargo"
                        value={editForm.values.role}
                        onChange={(e) => setEditForm((p) => ({ ...p, values: { ...p.values, role: e.target.value } }))}
                        className="w-full min-w-[8rem] bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs"
                      />
                    ) : participant.role || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-300">
                    {editingParticipantId === participant.id ? (
                      <input
                        aria-label="Editar empresa"
                        value={editForm.values.company}
                        onChange={(e) => setEditForm((p) => ({ ...p, values: { ...p.values, company: e.target.value } }))}
                        className="w-full min-w-[10rem] bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs"
                      />
                    ) : participant.company || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-300">
                    {editingParticipantId === participant.id ? (
                      <textarea
                        aria-label="Editar bio"
                        value={editForm.values.bio}
                        onChange={(e) => setEditForm((p) => ({ ...p, values: { ...p.values, bio: e.target.value } }))}
                        rows={2}
                        className="w-full min-w-[14rem] bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs"
                      />
                    ) : participant.bio ? (
                      <span className="line-clamp-2">
                        {participant.bio.substring(0, 100)}{participant.bio.length > 100 ? '...' : ''}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-300">
                    {editingParticipantId === participant.id ? (
                      <input
                        aria-label="Editar contatos"
                        value={editForm.values.contacts}
                        onChange={(e) => setEditForm((p) => ({ ...p, values: { ...p.values, contacts: e.target.value } }))}
                        className="w-full min-w-[12rem] bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs"
                      />
                    ) : participant.contacts ? (
                      <span className="line-clamp-1">
                        {participant.contacts.substring(0, 50)}{participant.contacts.length > 50 ? '...' : ''}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    {/* Edit Button */}
                    {!editingParticipantId && (
                      <button
                        onClick={() => startEditing(participant)}
                        className="px-2 py-1 bg-amber-600/20 text-amber-300 text-xs rounded hover:bg-amber-600/30 transition-colors"
                        aria-label="Editar participante"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                        </svg>
                      </button>
                    )}
                    
                    {/* Save/Cancel Buttons (when editing) */}
                    {editingParticipantId === participant.id && (
                      <>
                        <button
                          onClick={() => handleEditSave(participant.id)}
                          disabled={isSaving}
                          className="px-2 py-1 bg-green-600/20 text-green-300 text-xs rounded hover:bg-green-600/30 transition-colors disabled:opacity-50"
                          aria-label="Salvar alterações"
                        >
                          {isSaving ? 'Salvando...' : 'Salvar'}
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-2 py-1 bg-red-600/20 text-red-300 text-xs rounded hover:bg-red-600/30 transition-colors"
                          aria-label="Cancelar edição"
                        >
                          Cancelar
                        </button>
                      </>
                    )}
                    
                    {/* Delete Button */}
                    <button
                      onClick={() => handleDelete(participant.id)}
                      disabled={isDeleting}
                      className="px-2 py-1 bg-red-600/20 text-red-300 text-xs rounded hover:bg-red-600/30 transition-colors disabled:opacity-50"
                      aria-label="Excluir participante"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                    
                    {/* Expanded Details */}
                    {expandedParticipantId === participant.id && (
                      <div className="mt-2 pt-2 border-t border-zinc-800/20">
                        <div className="space-y-1 text-xs text-zinc-400">
                          {participant.notes && (
                                            <div>
                                              <span className="font-medium">Observações:</span> <span className="ml-1">{participant.notes}</span>
                                            </div>
                                          )}
                          {participant.links && participant.links.length > 0 && (
                                            <div>
                                              <span className="font-medium">Links:</span>
                                              <div className="ml-1 flex flex-wrap gap-1">
                                                {participant.links.map((link, index) => (
                                                  <a
                                                    key={index}
                                                    href={link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs text-amber-300 hover:text-amber-200 underline"
                                                    title={link}
                                                  >
                                                    {link.length > 30 ? link.substring(0, 30) + '...' : link}
                                                  </a>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                          {participant.members && participant.members.length > 0 && (
                                            <div>
                                              <span className="font-medium">Membros:</span> <span className="ml-1">{participant.members.join(', ')}</span>
                                            </div>
                                          )}
                          {participant.social_handles && Object.keys(participant.social_handles).length > 0 && (
                                            <div>
                                              <span className="font-medium">Redes Sociais:</span>
                                              <div className="ml-1 flex flex-wrap gap-1">
                                                {Object.entries(participant.social_handles).map(([platform, handle], index) => (
                                                  <span key={index} className="text-xs text-amber-300">
                                                    {platform}: {handle}
                                                  </span>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                          {participant.previous_episodes && participant.previous_episodes.length > 0 && (
                                            <div>
                                              <span className="font-medium">Episódios Anteriores:</span> <span className="ml-1">{participant.previous_episodes.join(', ')}</span>
                                            </div>
                                          )}
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              
              {/* Empty State */}
              {!paginatedParticipants.length && (
                <tr>
                  <td className="px-6 py-8 text-center text-zinc-500" colSpan="7">
                    Nenhum participante encontrado com os filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {filteredParticipants.length > pageSize && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-zinc-800/50 text-sm text-zinc-400">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className={`px-2 py-1 rounded hover:bg-zinc-800/20 ${page === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <ChevronLeft className="h-3 w-3" />
              </button>
              <span>
                Página {page + 1} de {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className={`px-2 py-1 rounded hover:bg-zinc-800/20 ${page >= totalPages - 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
            <div>
              Mostrando {Math.min(filteredParticipants.length, (page + 1) * pageSize)} de {filteredParticipants.length} participantes
            </div>
          </div>
        )}
      </div>

      {/* Add Participant Modal */}
      <div className={`fixed inset-0 z-50 flex items-center justify-center ${showAddModal ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-black/50"></div>
        <div className="relative bg-zinc-900 border border-zinc-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-start pb-4 pl-6 pr-6 pt-2">
            <h2 className="text-xl font-bold text-zinc-100">Adicionar Novo Participante</h2>
            <button
              onClick={() => {
                setShowAddModal(false);
                // Reset validation states when cancelling
                setAddForm({
                  values: {
                    name: '',
                    type: 'individual' as ParticipantType,
                    group_type: null as GroupType | null,
                    role: '',
                    company: '',
                    company_or_group: null as string | null,
                    bio: '',
                    contacts: '',
                    notes: '',
                    links: [] as string[],
                    members: [] as string[],
                    entity_type: 'individual' as EntityType,
                    social_handles: {} as Record<string, string>,
                    previous_episodes: [] as string[],
                    previous_research_summary: null as string | null,
                  },
                  errors: {
                    name: '',
                    role: '',
                    company: '',
                    bio: '',
                    contacts: '',
                    notes: '',
                    type: '',
                    group_type: '',
                    company_or_group: '',
                    entity_type: '',
                    links: '',
                    members: '',
                    social_handles: '',
                    previous_episodes: '',
                    previous_research_summary: '',
                  },
                  isValid: false
                });
              }}
              className="text-zinc-400 hover:text-zinc-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
            {/* Error Messages */}
            {!addForm.isValid && (
              <div className="p-3 bg-red-900/50 border border-red-800/50 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-red-300">
                    Por favor, corrija os erros no formulário antes de salvar.
                  </div>
                </div>
              </div>
            )}
            
            {/* Success Message */}
            {saveSuccess && (
              <div className="p-3 bg-green-900/50 border border-green-800/50 rounded-lg">
                <div className="flex items-start space-x-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <div className="text-sm text-green-300">
                    {saveSuccess}
                  </div>
                </div>
              </div>
            )}
            
            {/* Error Message */}
            {saveError && (
              <div className="p-3 bg-red-900/50 border border-red-800/50 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-red-300">
                    {saveError}
                  </div>
                </div>
              </div>
            )}
            
            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Name */}
              <div className="col-span-2 md:col-span-1 lg:col-span-1">
                <label className="block text-xs text-zinc-300 mb-1">Nome *</label>
                <input
                  type="text"
                  value={addForm.values.name}
                  onChange={(e) => {
                    const value = e.target.value;
                    setAddForm(prev => ({
                      ...prev,
                      values: { ...prev.values, name: value },
                      errors: { ...prev.errors, name: validateFormField('name', value, false) },
                      isValid: validateForm({ ...prev.values, name: value }, false).isValid
                    }));
                  }}
                  className={`w-full bg-zinc-900 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none ${
                    addForm.errors.name
                      ? 'border-red-300 focus:border-red-500'
                      : addForm.values.name
                      ? 'border-green-300 focus:border-green-500'
                      : 'border-zinc-300'
                  }`}
                  placeholder="Nome completo do participante"
                />
                {!addForm.errors.name && addForm.values.name ? (
                  <p className="text-xs text-green-500 mt-1">Nome válido</p>
                ) : (
                  !addForm.errors.name && !addForm.values.name ? (
                    <p className="text-xs text-zinc-500 mt-1">Campo obrigatório</p>
                  ) : (
                    <p className="text-xs text-red-500 mt-1">{addForm.errors.name}</p>
                  )
                )}
              </div>
              
              {/* Type */}
              <div>
                <label className="block text-xs text-zinc-300 mb-1">Tipo *</label>
                <select
                  value={addForm.values.type}
                  onChange={(e) => {
                    const value = e.target.value as ParticipantType;
                    setAddForm(prev => ({
                      ...prev,
                      values: { ...prev.values, type: value },
                      errors: { ...prev.errors, type: validateFormField('type', value, false) },
                      isValid: validateForm({ ...prev.values, type: value }, false).isValid
                    }));
                  }}
                  className={`w-full bg-zinc-900 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none ${
                    addForm.errors.type
                      ? 'border-red-300 focus:border-red-500'
                      : addForm.values.type !== 'individual'
                      ? 'border-green-300 focus:border-green-500'
                      : 'border-zinc-300'
                  }`}
                >
                  <option value="individual">Individual</option>
                  <option value="group">Grupo</option>
                  <option value="band">Banda</option>
                </select>
                {!addForm.errors.type ? (
                  <p className="text-xs text-green-500 mt-1">Tipo válido</p>
                ) : (
                  <p className="text-xs text-red-500 mt-1">{addForm.errors.type}</p>
                )}
              </div>
              
              {/* Group Type (only for groups/bands) */}
              {(addForm.values.type === 'group' || addForm.values.type === 'band') && (
                <div>
                  <label className="block text-xs text-zinc-300 mb-1">Tipo de Grupo</label>
                  <select
                    value={addForm.values.group_type ?? ''}
                    onChange={(e) => {
                      const value = e.target.value as GroupType | '';
                      setAddForm(prev => ({
                        ...prev,
                        values: { ...prev.values, group_type: value === '' ? null : value },
                        errors: { ...prev.errors, group_type: validateFormField('group_type', value, false) },
                        isValid: validateForm({ ...prev.values, group_type: value === '' ? null : value }, false).isValid
                      }));
                    }}
                    className={`w-full bg-zinc-900 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none ${
                      addForm.errors.group_type
                        ? 'border-red-300 focus:border-red-500'
                      : addForm.values.group_type
                      ? 'border-green-300 focus:border-green-500'
                      : 'border-zinc-300'
                    }`}
                  >
                    <option value="">Selecione o tipo de grupo</option>
                    <option value="band">Banda</option>
                    <option value="duo">Duo</option>
                    <option value="group">Grupo</option>
                    <option value="choir">Choir</option>
                    <option value="crew">Tripulação</option>
                  </select>
                  {!addForm.errors.group_type ? (
                    addForm.values.group_type ? (
                      <p className="text-xs text-green-500 mt-1">Tipo de grupo válido</p>
                    ) : (
                      <p className="text-xs text-zinc-500 mt-1">Selecione o tipo de grupo</p>
                    )
                  ) : (
                    <p className="text-xs text-red-500 mt-1">{addForm.errors.group_type}</p>
                  )}
                </div>
              )}
              
              {/* Role */}
              <div>
                <label className="block text-xs text-zinc-300 mb-1">Cargo *</label>
                <input
                  type="text"
                  value={addForm.values.role}
                  onChange={(e) => {
                    const value = e.target.value;
                    setAddForm(prev => ({
                      ...prev,
                      values: { ...prev.values, role: value },
                      errors: { ...prev.errors, role: validateFormField('role', value, false) },
                      isValid: validateForm({ ...prev.values, role: value }, false).isValid
                    }));
                  }}
                  className={`w-full bg-zinc-900 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none ${
                    addForm.errors.role
                      ? 'border-red-300 focus:border-red-500'
                      : addForm.values.role
                      ? 'border-green-300 focus:border-green-500'
                      : 'border-zinc-300'
                  }`}
                  placeholder="Ex: Produtor, Diretor, Apresentador"
                />
                {!addForm.errors.role && addForm.values.role ? (
                  <p className="text-xs text-green-500 mt-1">Cargo válido</p>
                ) : (
                  !addForm.errors.role && !addForm.values.role ? (
                    <p className="text-xs text-zinc-500 mt-1">Campo obrigatório</p>
                  ) : (
                    <p className="text-xs text-red-500 mt-1">{addForm.errors.role}</p>
                  )
                )}
              </div>
              
              {/* Company */}
              <div>
                <label className="block text-xs text-zinc-300 mb-1">Empresa/Organização *</label>
                <input
                  type="text"
                  value={addForm.values.company}
                  onChange={(e) => {
                    const value = e.target.value;
                    setAddForm(prev => ({
                      ...prev,
                      values: { ...prev.values, company: value },
                      errors: { ...prev.errors, company: validateFormField('company', value, false) },
                      isValid: validateForm({ ...prev.values, company: value }, false).isValid
                    }));
                  }}
                  className={`w-full bg-zinc-900 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none ${
                    addForm.errors.company
                      ? 'border-red-300 focus:border-red-500'
                      : addForm.values.company
                      ? 'border-green-300 focus:border-green-500'
                      : 'border-zinc-300'
                  }`}
                  placeholder="Nome da empresa ou organização"
                />
                {!addForm.errors.company && addForm.values.company ? (
                  <p className="text-xs text-green-500 mt-1">Empresa válida</p>
                ) : (
                  !addForm.errors.company && !addForm.values.company ? (
                    <p className="text-xs text-zinc-500 mt-1">Campo obrigatório</p>
                  ) : (
                    <p className="text-xs text-red-500 mt-1">{addForm.errors.company}</p>
                  )
                )}
              </div>
              
              {/* Bio */}
              <div className="col-span-2">
                <label className="block text-xs text-zinc-300 mb-1">Biografia *</label>
                <textarea
                  value={addForm.values.bio}
                  onChange={(e) => {
                    const value = e.target.value;
                    setAddForm(prev => ({
                      ...prev,
                      values: { ...prev.values, bio: value },
                      errors: { ...prev.errors, bio: validateFormField('bio', value, false) },
                      isValid: validateForm({ ...prev.values, bio: value }, false).isValid
                    }));
                  }}
                  rows={4}
                  className={`w-full bg-zinc-900 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none ${
                    addForm.errors.bio
                      ? 'border-red-300 focus:border-red-500'
                      : addForm.values.bio
                      ? 'border-green-300 focus:border-green-500'
                      : 'border-zinc-300'
                  }`}
                  placeholder="Breve biografia do participante"
                />
                {!addForm.errors.bio && addForm.values.bio ? (
                  <p className="text-xs text-green-500 mt-1">Biografia válida</p>
                ) : (
                  !addForm.errors.bio && !addForm.values.bio ? (
                    <p className="text-xs text-zinc-500 mt-1">Campo obrigatório</p>
                  ) : (
                    <p className="text-xs text-red-500 mt-1">{addForm.errors.bio}</p>
                  )
                )}
              </div>
              
              {/* Contacts */}
              <div>
                <label className="block text-xs text-zinc-300 mb-1">Contatos *</label>
                <input
                  type="text"
                  value={addForm.values.contacts}
                  onChange={(e) => {
                    const value = e.target.value;
                    setAddForm(prev => ({
                      ...prev,
                      values: { ...prev.values, contacts: value },
                      errors: { ...prev.errors, contacts: validateFormField('contacts', value, false) },
                      isValid: validateForm({ ...prev.values, contacts: value }, false).isValid
                    }));
                  }}
                  className={`w-full bg-zinc-900 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none ${
                    addForm.errors.contacts
                      ? 'border-red-300 focus:border-red-500'
                      : addForm.values.contacts
                      ? 'border-green-300 focus:border-green-500'
                      : 'border-zinc-300'
                  }`}
                  placeholder="Telefone, e-mail, ou outros contatos"
                />
                {!addForm.errors.contacts && addForm.values.contacts ? (
                  <p className="text-xs text-green-500 mt-1">Contatos válidos</p>
                ) : (
                  !addForm.errors.contacts && !addForm.values.contacts ? (
                    <p className="text-xs text-zinc-500 mt-1">Campo obrigatório</p>
                  ) : (
                    <p className="text-xs text-red-500 mt-1">{addForm.errors.contacts}</p>
                  )
                )}
              </div>
              
              {/* Notes */}
              <div className="col-span-2">
                <label className="block text-xs text-zinc-300 mb-1">Observações *</label>
                <textarea
                  value={addForm.values.notes}
                  onChange={(e) => {
                    const value = e.target.value;
                    setAddForm(prev => ({
                      ...prev,
                      values: { ...prev.values, notes: value },
                      errors: { ...prev.errors, notes: validateFormField('notes', value, false) },
                      isValid: validateForm({ ...prev.values, notes: value }, false).isValid
                    }));
                  }}
                  rows={3}
                  className={`w-full bg-zinc-900 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none ${
                    addForm.errors.notes
                      ? 'border-red-300 focus:border-red-500'
                      : addForm.values.notes
                      ? 'border-green-300 focus:border-green-500'
                      : 'border-zinc-300'
                  }`}
                  placeholder="Observações adicionais sobre o participante"
                />
                {!addForm.errors.notes && addForm.values.notes ? (
                  <p className="text-xs text-green-500 mt-1">Observações válidas</p>
                ) : (
                  !addForm.errors.notes && !addForm.values.notes ? (
                    <p className="text-xs text-zinc-500 mt-1">Campo obrigatório</p>
                  ) : (
                    <p className="text-xs text-red-500 mt-1">{addForm.errors.notes}</p>
                  )
                )}
              </div>
              
              {/* Links */}
              <div>
                <label className="block text-xs text-zinc-300 mb-1">Links (URLs)</label>
                <input
                  type="text"
                  value={addForm.values.links.join(', ')}
                  onChange={(e) => {
                    const value = e.target.value;
                    const linksArray = value
                      .split(',')
                      .map(link => link.trim())
                      .filter(link => link.length > 0);
                    setAddForm(prev => ({
                      ...prev,
                      values: { ...prev.values, links: linksArray },
                      errors: { ...prev.errors, links: validateFormField('links', linksArray, false) },
                      isValid: validateForm({ ...prev.values, links: linksArray }, false).isValid
                    }));
                  }}
                  className={`w-full bg-zinc-900 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none ${
                    addForm.errors.links
                      ? 'border-red-300 focus:border-red-500'
                      : addForm.values.links.length > 0
                      ? 'border-green-300 focus:border-green-500'
                      : 'border-zinc-300'
                  }`}
                  placeholder="https://exemplo.com, https://outro.com"
                />
                {!addForm.errors.links && addForm.values.links.length > 0 ? (
                  <p className="text-xs text-green-500 mt-1">Links válidos</p>
                ) : (
                  !addForm.errors.links && addForm.values.links.length === 0 ? (
                    <p className="text-xs text-zinc-500 mt-1">Opcional</p>
                  ) : (
                    <p className="text-xs text-red-500 mt-1">{addForm.errors.links}</p>
                  )
                )}
              </div>
              
              {/* Members (for groups/bands) */}
              {(addForm.values.type === 'group' || addForm.values.type === 'band') && (
                <div>
                  <label className="block text-xs text-zinc-300 mb-1">Membros (se aplicável)</label>
                  <input
                    type="text"
                    value={addForm.values.members.join(', ')}
                    onChange={(e) => {
                      const value = e.target.value;
                      const membersArray = value
                        .split(',')
                        .map(member => member.trim())
                        .filter(member => member.length > 0);
                      setAddForm(prev => ({
                        ...prev,
                        values: { ...prev.values, members: membersArray },
                        errors: { ...prev.errors, members: validateFormField('members', membersArray, false) },
                        isValid: validateForm({ ...prev.values, members: membersArray }, false).isValid
                      }));
                    }}
                    className={`w-full bg-zinc-900 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none ${
                      addForm.errors.members
                        ? 'border-red-300 focus:border-red-500'
                      : addForm.values.members.length > 0
                      ? 'border-green-300 focus:border-green-500'
                      : 'border-zinc-300'
                    }`}
                    placeholder="Nome do membro 1, Nome do membro 2, ..."
                  />
                  {!addForm.errors.members && addForm.values.members.length > 0 ? (
                    <p className="text-xs text-green-500 mt-1">Membros válidos</p>
                  ) : (
                    !addForm.errors.members && addForm.values.members.length === 0 ? (
                      <p className="text-xs text-zinc-500 mt-1">Opcional</p>
                    ) : (
                      <p className="text-xs text-red-500 mt-1">{addForm.errors.members}</p>
                    )
                  )}
                </div>
              )}
              
              {/* Entity Type */}
              <div>
                <label className="block text-xs text-zinc-300 mb-1">Tipo de Entidade *</label>
                <select
                  value={addForm.values.entity_type}
                  onChange={(e) => {
                    const value = e.target.value as EntityType;
                    setAddForm(prev => ({
                      ...prev,
                      values: { ...prev.values, entity_type: value },
                      errors: { ...prev.errors, entity_type: validateFormField('entity_type', value, false) },
                      isValid: validateForm({ ...prev.values, entity_type: value }, false).isValid
                    }));
                  }}
                  className={`w-full bg-zinc-900 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none ${
                    addForm.errors.entity_type
                      ? 'border-red-300 focus:border-red-500'
                      : addForm.values.entity_type !== 'individual'
                      ? 'border-green-300 focus:border-green-500'
                      : 'border-zinc-300'
                  }`}
                >
                  <option value="individual">Individual</option>
                  <option value="group">Grupo</option>
                  <option value="organization">Organização</option>
                  <option value="institution">Instituição</option>
                </select>
                {!addForm.errors.entity_type ? (
                  <p className="text-xs text-green-500 mt-1">Tipo de entidade válido</p>
                ) : (
                  <p className="text-xs text-red-500 mt-1">{addForm.errors.entity_type}</p>
                )}
              </div>
              
              {/* Social Handles */}
              <div>
                <label className="block text-xs text-zinc-300 mb-1">Redes Sociais (formato: plataforma:handle)</label>
                <input
                  type="text"
                  value={Object.entries(addForm.values.social_handles).map(([k, v]) => `${k}:${v}`).join(', ')}
                  onChange={(e) => {
                    const value = e.target.value;
                    const pairs = value
                      .split(',')
                      .map(pair => pair.trim())
                      .filter(pair => pair.length > 0)
                      .reduce((acc, pair) => {
                        const [platform, handle] = pair.split(':').map(s => s.trim());
                        if (platform && handle) {
                          acc[platform] = handle;
                        }
                        return acc;
                      }, {} as Record<string, string>);
                    setAddForm(prev => ({
                      ...prev,
                      values: { ...prev.values, social_handles: pairs },
                      errors: { ...prev.errors, social_handles: validateFormField('social_handles', pairs, false) },
                      isValid: validateForm({ ...prev.values, social_handles: pairs }, false).isValid
                    }));
                  }}
                  className={`w-full bg-zinc-900 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none ${
                    addForm.errors.social_handles
                      ? 'border-red-300 focus:border-red-500'
                      : Object.keys(addForm.values.social_handles).length > 0
                      ? 'border-green-300 focus:border-green-500'
                      : 'border-zinc-300'
                  }`}
                  placeholder="twitter:username, instagram:handle, youtube:channel"
                />
                {!addForm.errors.social_handles && Object.keys(addForm.values.social_handles).length > 0 ? (
                  <p className="text-xs text-green-500 mt-1">Redes sociais válidas</p>
                ) : (
                  !addForm.errors.social_handles && Object.keys(addForm.values.social_handles).length === 0 ? (
                    <p className="text-xs text-zinc-500 mt-1">Opcional</p>
                  ) : (
                    <p className="text-xs text-red-500 mt-1">{addForm.errors.social_handles}</p>
                  )
                )}
              </div>
              
              {/* Previous Episodes */}
              <div>
                <label className="block text-xs text-zinc-300 mb-1">Episódios Anteriores</label>
                <input
                  type="text"
                  value={addForm.values.previous_episodes.join(', ')}
                  onChange={(e) => {
                    const value = e.target.value;
                    const episodesArray = value
                      .split(',')
                      .map(ep => ep.trim())
                      .filter(ep => ep.length > 0);
                    setAddForm(prev => ({
                      ...prev,
                      values: { ...prev.values, previous_episodes: episodesArray },
                      errors: { ...prev.errors, previous_episodes: validateFormField('previous_episodes', episodesArray, false) },
                      isValid: validateForm({ ...prev.values, previous_episodes: episodesArray }, false).isValid
                    }));
                  }}
                  className={`w-full bg-zinc-900 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none ${
                    addForm.errors.previous_episodes
                      ? 'border-red-300 focus:border-red-500'
                      : addForm.values.previous_episodes.length > 0
                      ? 'border-green-300 focus:border-green-500'
                      : 'border-zinc-300'
                  }`}
                  placeholder="Ep 1, Ep 2, Ep 3, ..."
                />
                {!addForm.errors.previous_episodes && addForm.values.previous_episodes.length > 0 ? (
                  <p className="text-xs text-green-500 mt-1">Episódios válidos</p>
                ) : (
                  !addForm.errors.previous_episodes && addForm.values.previous_episodes.length === 0 ? (
                    <p className="text-xs text-zinc-500 mt-1">Opcional</p>
                  ) : (
                    <p className="text-xs text-red-500 mt-1">{addForm.errors.previous_episodes}</p>
                  )
                )}
              </div>
              
              {/* Previous Research Summary */}
              <div>
                <label className="block text-xs text-zinc-300 mb-1">Resumo da Pesquisa Anterior</label>
                <textarea
                  value={addForm.values.previous_research_summary ?? ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setAddForm(prev => ({
                      ...prev,
                      values: { ...prev.values, previous_research_summary: value === '' ? null : value },
                      errors: { ...prev.errors, previous_research_summary: validateFormField('previous_research_summary', value === '' ? null : value, false) },
                      isValid: validateForm({ ...prev.values, previous_research_summary: value === '' ? null : value }, false).isValid
                    }));
                  }}
                  rows={3}
                  className={`w-full bg-zinc-900 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none ${
                    addForm.errors.previous_research_summary
                      ? 'border-red-300 focus:border-red-500'
                      : addForm.values.previous_research_summary !== null
                      ? 'border-green-300 focus:border-green-500'
                      : 'border-zinc-300'
                  }`}
                  placeholder="Resumo de pesquisas ou trabalhos anteriores relevantes"
                />
                {!addForm.errors.previous_research_summary && addForm.values.previous_research_summary !== null ? (
                  <p className="text-xs text-green-500 mt-1">Resumo válido</p>
                ) : (
                  !addForm.errors.previous_research_summary && addForm.values.previous_research_summary === null ? (
                    <p className="text-xs text-zinc-500 mt-1">Opcional</p>
                  ) : (
                    <p className="text-xs text-red-500 mt-1">{addForm.errors.previous_research_summary}</p>
                  )
                )}
              </div>
            </div>
            
            {/* Form Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  // Reset validation states when cancelling
                  setAddForm({
                    values: {
                      name: '',
                      type: 'individual' as ParticipantType,
                      group_type: null as GroupType | null,
                      role: '',
                      company: '',
                      company_or_group: null as string | null,
                      bio: '',
                      contacts: '',
                      notes: '',
                      links: [] as string[],
                      members: [] as string[],
                      entity_type: 'individual' as EntityType,
                      social_handles: {} as Record<string, string>,
                      previous_episodes: [] as string[],
                      previous_research_summary: null as string | null,
                    },
                    errors: {
                      name: '',
                      role: '',
                      company: '',
                      bio: '',
                      contacts: '',
                      notes: '',
                      type: '',
                      group_type: '',
                      company_or_group: '',
                      entity_type: '',
                      links: '',
                      members: '',
                      social_handles: '',
                      previous_episodes: '',
                      previous_research_summary: '',
                    },
                    isValid: false
                  });
                }}
                className="px-3 py-1.5 bg-zinc-800 text-zinc-300 text-xs rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!(addForm.isValid || isSaving)}
                className={`px-4 py-1.5 bg-amber-500 text-zinc-950 font-bold text-xs rounded-lg cursor-pointer ${
                  !(addForm.isValid || isSaving) ? 'opacity-50' : ''
                }`}
              >
                {isSaving ? 'Salvando...' : 'Salvar Participante'}
              </button>
            </div>
          </form>
        </div>
      </div>
      
      {/* Edit Participant Modal (Inline - handled via table rows) */}
    </div>
  );
}
