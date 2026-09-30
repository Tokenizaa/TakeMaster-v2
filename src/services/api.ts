import {
  Show,
  Episode,
  Guest,
  EditorialDiagnosis,
  ResearchData,
  OutlineBlock,
  QuestionItem,
  ScriptItem,
  FollowUpItem,
  PlannedShort,
} from '../types';

export const api = {
  // Shows
  async getShows(): Promise<Show[]> {
    const res = await fetch('/api/shows');
    if (!res.ok) throw new Error('Falha ao carregar programas');
    return res.json();
  },

  async getShow(id: string): Promise<Show> {
    const res = await fetch(`/api/shows/${id}`);
    if (!res.ok) throw new Error('Programa não encontrado');
    return res.json();
  },

  async createShow(show: Partial<Show>): Promise<Show> {
    const res = await fetch('/api/shows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(show),
    });
    if (!res.ok) throw new Error('Falha ao criar programa');
    return res.json();
  },

  async updateShow(id: string, show: Partial<Show>): Promise<Show> {
    const res = await fetch(`/api/shows/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(show),
    });
    if (!res.ok) throw new Error('Falha ao atualizar programa');
    return res.json();
  },

  async deleteShow(id: string): Promise<boolean> {
    const res = await fetch(`/api/shows/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Falha ao excluir programa');
    const data = await res.json();
    return data.success;
  },

  // Episodes
  async getEpisodes(): Promise<Episode[]> {
    const res = await fetch('/api/episodes');
    if (!res.ok) throw new Error('Falha ao carregar episódios');
    return res.json();
  },

  async getEpisode(id: string): Promise<Episode> {
    const res = await fetch(`/api/episodes/${id}`);
    if (!res.ok) throw new Error('Episódio não encontrado');
    return res.json();
  },

  async createEpisode(episode: Partial<Episode>): Promise<Episode> {
    const res = await fetch('/api/episodes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(episode),
    });
    if (!res.ok) throw new Error('Falha ao criar episódio');
    return res.json();
  },

  async updateEpisode(id: string, episode: Partial<Episode>): Promise<Episode> {
    const res = await fetch(`/api/episodes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(episode),
    });
    if (!res.ok) throw new Error('Falha ao salvar episódio');
    return res.json();
  },

  async deleteEpisode(id: string): Promise<boolean> {
    const res = await fetch(`/api/episodes/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Falha ao excluir episódio');
    const data = await res.json();
    return data.success;
  },

  // Guests
  async getGuests(): Promise<Guest[]> {
    const res = await fetch('/api/guests');
    if (!res.ok) throw new Error('Falha ao carregar convidados');
    return res.json();
  },

  async createGuest(guest: Partial<Guest>): Promise<Guest> {
    const res = await fetch('/api/guests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(guest),
    });
    if (!res.ok) throw new Error('Falha ao cadastrar convidado');
    return res.json();
  },

  async updateGuest(id: string, guest: Partial<Guest>): Promise<Guest> {
    const res = await fetch(`/api/guests/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(guest),
    });
    if (!res.ok) throw new Error('Falha ao atualizar convidado');
    return res.json();
  },

  // AI Generation Endpoints
  async aiDiagnose(params: {
    idea: string;
    guestName?: string;
    format?: string;
    durationMin?: number;
    objective?: string;
    additionalInfo?: string;
  }): Promise<EditorialDiagnosis> {
    const res = await fetch('/api/ai/diagnose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error('Falha na análise editorial da IA');
    return res.json();
  },

  async aiResearch(params: {
    guestName: string;
    company?: string;
    idea: string;
    diagnosis?: EditorialDiagnosis;
  }): Promise<ResearchData> {
    const res = await fetch('/api/ai/research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error('Falha ao gerar pesquisa');
    return res.json();
  },

  async aiOutline(params: {
    idea: string;
    guestName: string;
    targetDurationMin: number;
    diagnosis: EditorialDiagnosis;
    research?: ResearchData;
  }): Promise<{ outline: OutlineBlock[]; questions: QuestionItem[] }> {
    const res = await fetch('/api/ai/outline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error('Falha ao gerar pauta inteligente');
    return res.json();
  },

  async aiScript(episode: Episode): Promise<{ script: ScriptItem[] }> {
    const res = await fetch('/api/ai/script', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ episode }),
    });
    if (!res.ok) throw new Error('Falha ao escrever roteiro completo');
    return res.json();
  },

  async aiRepiques(params: {
    questionText: string;
    context?: string;
    guestName?: string;
  }): Promise<{ followUps: FollowUpItem[] }> {
    const res = await fetch('/api/ai/repiques', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error('Falha ao gerar repiques');
    return res.json();
  },

  async aiShorts(episode: Episode): Promise<{ shorts: PlannedShort[] }> {
    const res = await fetch('/api/ai/shorts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ episode }),
    });
    if (!res.ok) throw new Error('Falha ao planejar cortes e shorts');
    return res.json();
  },

  async aiAssist(params: {
    episode: Episode;
    userPrompt: string;
    currentTab: string;
    activeBlockId?: string;
    activeQuestionId?: string;
  }): Promise<{
    actionType: string;
    summary: string;
    targetField: string;
    updatedData: any;
  }> {
    const res = await fetch('/api/ai/assist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error('Falha no assistente de IA');
    return res.json();
  },

  async aiEditorScript(episode: Episode): Promise<{ editorScript: string }> {
    const res = await fetch('/api/ai/editor-script', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ episode }),
    });
    if (!res.ok) throw new Error('Falha ao sintetizar roteiro de edição');
    return res.json();
  },
};
