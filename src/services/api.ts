import {
  Program,
  Episode,
  Guest,
  EditorialDiagnosis,
  ResearchData,
  OutlineBlock,
  QuestionItem,
  ScriptItem,
  FollowUpItem,
  PlannedShort,
  EpisodeStatus,
  ShowFormat,
  ParticipantType,
  GroupType,
  EntityType,
} from '../types';
import { apiFetch } from '../lib/apiFetch';

export interface PaginatedResult<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CatalogStats {
  totalPrograms: number;
  totalEpisodes: number;
  totalParticipants: number;
  totalAssets: number;
  totalShorts: number;
  totalSegments: number;
  episodesByStatus: Record<string, number>;
  programsWithEpisodes: number;
}

export interface SearchCatalogResult {
  programs: Program[];
  episodes: Episode[];
  participants: Guest[];
  totalCount: number;
}

// List endpoints return a { data, count } envelope — unwrap to match the declared array type.
// Module-level (not a method on `api`) because these fns are passed detached, e.g. onGetParticipants={api.getGuests}
async function unwrapList(res: Response, label: string): Promise<any[]> {
  if (!res.ok) throw new Error(label);
  const body = await res.json();
  return Array.isArray(body) ? body : body?.data ?? [];
}

export const api = {
  // Programs
  async getPrograms(): Promise<Program[]> {
    return unwrapList(await apiFetch('/api/programs'), 'Falha ao carregar programas');
  },

  async getProgram(id: string): Promise<Program> {
    const res = await apiFetch(`/api/programs/${id}`);
    if (!res.ok) throw new Error('Programa não encontrado');
    return res.json();
  },

  async createProgram(program: Partial<Program>): Promise<Program> {
    const res = await apiFetch('/api/programs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(program),
    });
    if (!res.ok) throw new Error('Falha ao criar programa');
    return res.json();
  },

  async updateProgram(id: string, program: Partial<Program>): Promise<Program> {
    const res = await apiFetch(`/api/programs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(program),
    });
    if (!res.ok) throw new Error('Falha ao atualizar programa');
    return res.json();
  },

  async deleteProgram(id: string): Promise<boolean> {
    const res = await apiFetch(`/api/programs/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Falha ao excluir programa');
    const data = await res.json();
    return data.success;
  },

  // Episodes
  async getEpisodes(): Promise<Episode[]> {
    return unwrapList(await apiFetch('/api/episodes'), 'Falha ao carregar episódios');
  },

  async getEpisode(id: string): Promise<Episode> {
    const res = await apiFetch(`/api/episodes/${id}`);
    if (!res.ok) throw new Error('Episódio não encontrado');
    return res.json();
  },

  async createEpisode(episode: Partial<Episode>): Promise<Episode> {
    const res = await apiFetch('/api/episodes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(episode),
    });
    if (!res.ok) throw new Error('Falha ao criar episódio');
    return res.json();
  },

  async updateEpisode(id: string, episode: Partial<Episode>): Promise<Episode> {
    const res = await apiFetch(`/api/episodes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(episode),
    });
    if (!res.ok) throw new Error('Falha ao salvar episódio');
    return res.json();
  },

  async deleteEpisode(id: string): Promise<boolean> {
    const res = await apiFetch(`/api/episodes/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Falha ao excluir episódio');
    const data = await res.json();
    return data.success;
  },

  // Guests
  async getGuests(): Promise<Guest[]> {
    return unwrapList(await apiFetch('/api/guests'), 'Falha ao carregar convidados');
  },

  async createGuest(guest: Partial<Guest>): Promise<Guest> {
    const res = await apiFetch('/api/guests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(guest),
    });
    if (!res.ok) throw new Error('Falha ao cadastrar convidado');
    return res.json();
  },

  async updateGuest(id: string, guest: Partial<Guest>): Promise<Guest> {
    const res = await apiFetch(`/api/guests/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(guest),
    });
    if (!res.ok) throw new Error('Falha ao atualizar convidado');
    return res.json();
  },

  // AI Generation Endpoints
   async aiDiagnose(params: { idea: string; format?: string; durationMin?: number; objective?: string; additionalInfo?: string }): Promise<EditorialDiagnosis> {
    const res = await apiFetch('/api/ai/diagnose', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(params) });
    if (!res.ok) throw new Error('Falha na análise editorial da IA');
    return res.json();
  },

   async aiResearch(params: { company?: string; idea: string; diagnosis?: EditorialDiagnosis }): Promise<ResearchData> {
    const res = await apiFetch('/api/ai/research', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(params) });
    if (!res.ok) throw new Error('Falha ao gerar pesquisa');
    return res.json();
  },

   async aiOutline(params: { idea: string; targetDurationMin: number; diagnosis: EditorialDiagnosis; research?: ResearchData }): Promise<{ outline: OutlineBlock[]; questions: QuestionItem[] }> {
    const res = await apiFetch('/api/ai/outline', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(params) });
    if (!res.ok) throw new Error('Falha ao gerar pauta inteligente');
    return res.json();
  },

  async aiScript(episode: Episode): Promise<{ script: ScriptItem[] }> {
    const res = await apiFetch('/api/ai/script', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ episode }) });
    if (!res.ok) throw new Error('Falha ao escrever roteiro completo');
    return res.json();
  },

   async aiRepiques(params: { questionText: string; context?: string }): Promise<{ followUps: FollowUpItem[] }> {
    const res = await apiFetch('/api/ai/repiques', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(params) });
    if (!res.ok) throw new Error('Falha ao gerar repiques');
    return res.json();
  },

  async aiShorts(episode: Episode): Promise<{ shorts: PlannedShort[] }> {
    const res = await apiFetch('/api/ai/shorts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ episode }) });
    if (!res.ok) throw new Error('Falha ao planejar cortes e shorts');
    return res.json();
  },

  async aiAssist(params: { episode: Episode; userPrompt: string; currentTab: string; activeBlockId?: string; activeQuestionId?: string }): Promise<{ actionType: string; summary: string; targetField: string; updatedData: any }> {
    const res = await apiFetch('/api/ai/assist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(params) });
    if (!res.ok) throw new Error('Falha no assistente de IA');
    return res.json();
  },

  async aiEditorScript(episode: Episode): Promise<{ editorScript: string }> {
    const res = await apiFetch('/api/ai/editor-script', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ episode }) });
    if (!res.ok) throw new Error('Falha ao sintetizar roteiro de edição');
    return res.json();
  },

  // Catalog
  async getCatalogStats(): Promise<CatalogStats> {
    const res = await apiFetch('/api/catalog/stats');
    if (!res.ok) throw new Error('Falha ao carregar estatísticas do catálogo');
    const body = await res.json();
    return body.data;
  },

  async searchCatalog(query: string, limit: number = 10): Promise<SearchCatalogResult> {
    const res = await apiFetch(`/api/catalog/search?q=${encodeURIComponent(query)}&limit=${limit}`);
    if (!res.ok) throw new Error('Falha na busca do catálogo');
    const body = await res.json();
    return body.data;
  },

  async listProgramsCatalog(filters?: {
    search?: string;
    format?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResult<Program>> {
    const params = new URLSearchParams();
    if (filters?.search) params.set('search', filters.search);
    if (filters?.format) params.set('format', filters.format);
    if (filters?.limit) params.set('limit', String(filters.limit));
    if (filters?.offset) params.set('offset', String(filters.offset));
    const res = await apiFetch(`/api/catalog/programs?${params.toString()}`);
    if (!res.ok) throw new Error('Falha ao listar programas');
    const body = await res.json();
    return { data: body.data, count: body.count, page: body.page, pageSize: body.pageSize, totalPages: body.totalPages };
  },

  async listEpisodesCatalog(filters?: {
    search?: string;
    program_id?: string;
    status?: EpisodeStatus;
    limit?: number;
    offset?: number;
    order_by?: string;
    ascending?: boolean;
  }): Promise<PaginatedResult<Episode>> {
    const params = new URLSearchParams();
    if (filters?.search) params.set('search', filters.search);
    if (filters?.program_id) params.set('program_id', filters.program_id);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.limit) params.set('limit', String(filters.limit));
    if (filters?.offset) params.set('offset', String(filters.offset));
    if (filters?.order_by) params.set('order_by', filters.order_by);
    if (filters?.ascending !== undefined) params.set('ascending', String(filters.ascending));
    const res = await apiFetch(`/api/catalog/episodes?${params.toString()}`);
    if (!res.ok) throw new Error('Falha ao listar episódios');
    const body = await res.json();
    return { data: body.data, count: body.count, page: body.page, pageSize: body.pageSize, totalPages: body.totalPages };
  },

  async listParticipantsCatalog(filters?: {
    search?: string;
    type?: ParticipantType;
    group_type?: GroupType;
    role?: string;
    entity_type?: EntityType;
    company?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResult<Guest>> {
    const params = new URLSearchParams();
    if (filters?.search) params.set('search', filters.search);
    if (filters?.type) params.set('type', filters.type);
    if (filters?.group_type) params.set('group_type', filters.group_type);
    if (filters?.role) params.set('role', filters.role);
    if (filters?.entity_type) params.set('entity_type', filters.entity_type);
    if (filters?.company) params.set('company', filters.company);
    if (filters?.limit) params.set('limit', String(filters.limit));
    if (filters?.offset) params.set('offset', String(filters.offset));
    const res = await apiFetch(`/api/catalog/participants?${params.toString()}`);
    if (!res.ok) throw new Error('Falha ao listar participantes');
    const body = await res.json();
    return { data: body.data, count: body.count, page: body.page, pageSize: body.pageSize, totalPages: body.totalPages };
  },

   // Library: Assets catalog
   async listAssetsCatalog(filters?: {
     search?: string;
     type?: string;
     status?: string;
     limit?: number;
     offset?: number;
   }): Promise<PaginatedResult<ProductionAsset>> {
     const params = new URLSearchParams();
     if (filters?.search) params.set('search', filters.search);
     if (filters?.type) params.set('type', filters.type);
     if (filters?.status) params.set('status', filters.status);
     if (filters?.limit) params.set('limit', String(filters.limit));
     if (filters?.offset) params.set('offset', String(filters.offset));
     const res = await apiFetch(`/api/catalog/assets?${params.toString()}`);
     if (!res.ok) throw new Error('Falha ao listar assets');
     const body = await res.json();
     return { data: body.data, count: body.count, page: body.page, pageSize: body.pageSize, totalPages: body.totalPages };
   },

   // Library: Asset details with folder/tag information
   async getAssetDetails(id: string): Promise<ProductionAsset & { folder?: AssetFolder; tags?: AssetTag[] }> {
     const res = await apiFetch(`/api/library/assets/${id}`);
     if (!res.ok) throw new Error('Falha ao buscar detalhes do asset');
     const body = await res.json();
     return body.data;
   },

   // Library: Search assets with advanced filters
   async searchAssets(filters: {
     query?: string;
     episode_id?: string;
     program_id?: string;
     folder_id?: string;
     tags?: string[];
     type?: string;
     status?: string;
     mime_type?: string;
     is_favorite?: boolean;
     date_from?: string;
     date_to?: string;
     limit?: number;
     offset?: number;
     order_by?: string;
     ascending?: boolean;
   }): Promise<PaginatedResult<ProductionAsset>> {
     const params = new URLSearchParams();
     if (filters?.query) params.set('q', filters.query);
     if (filters?.episode_id) params.set('episode_id', filters.episode_id);
     if (filters?.program_id) params.set('program_id', filters.program_id);
     if (filters?.folder_id) params.set('folder_id', filters.folder_id);
     if (filters?.tags?.length) params.set('tags', filters.tags.join(','));
     if (filters?.type) params.set('type', filters.type);
     if (filters?.status) params.set('status', filters.status);
     if (filters?.mime_type) params.set('mime_type', filters.mime_type);
     if (filters?.is_favorite !== undefined) params.set('is_favorite', String(filters.is_favorite));
     if (filters?.date_from) params.set('date_from', filters.date_from);
     if (filters?.date_to) params.set('date_to', filters.date_to);
     if (filters?.limit) params.set('limit', String(filters.limit));
     if (filters?.offset) params.set('offset', String(filters.offset));
     if (filters?.order_by) params.set('order_by', filters.order_by);
     if (filters?.ascending !== undefined) params.set('ascending', String(filters.ascending));
     const res = await apiFetch(`/api/library/assets?${params.toString()}`);
     if (!res.ok) throw new Error('Falha ao buscar assets');
     const body = await res.json();
     return { data: body.data, count: body.count, page: body.page, pageSize: body.pageSize, totalPages: body.totalPages };
   },

   // Library: Create asset
   async createAsset(asset: Omit<ProductionAsset, 'id' | 'created_at' | 'updated_at'> & { folder_id?: string; tags?: string[] }): Promise<ProductionAsset> {
     const res = await apiFetch(`/api/library/assets`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify(asset),
     });
     if (!res.ok) throw new Error('Falha ao criar asset');
     const body = await res.json();
     return body.data;
   },

   // Library: Update asset
   async updateAsset(id: string, asset: Partial<ProductionAsset> & { folder_id?: string; tags?: string[] }): Promise<ProductionAsset> {
     const res = await apiFetch(`/api/library/assets/${id}`, {
       method: 'PUT',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify(asset),
     });
     if (!res.ok) throw new Error('Falha ao atualizar asset');
     const body = await res.json();
     return body.data;
   },

   // Library: Delete asset
   async deleteAsset(id: string): Promise<boolean> {
     const res = await apiFetch(`/api/library/assets/${id}`, { method: 'DELETE' });
     if (!res.ok) throw new Error('Falha ao excluir asset');
     const body = await res.json();
     return body.data.success;
   },

   // Generic GET method for catalog endpoints
   async get<T>(endpoint: string, params?: Record<string, any>): Promise<{ data: any; success: boolean }> {
     const queryParams = new URLSearchParams();
     if (params) {
       for (const [key, value] of Object.entries(params)) {
         if (value !== undefined && value !== null) {
           queryParams.set(key, String(value));
         }
       }
     }
     const url = queryParams.toString() ? `${endpoint}?${queryParams}` : endpoint;
     const res = await apiFetch(url);
     if (!res.ok) throw new Error("Falha ao fazer requisicao para " + endpoint);
     const body = await res.json();
     return body;
   }
};