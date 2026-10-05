import {
  AdminReportSummary,
  AuditLogEntry,
  AuthSession,
  BillingInvoice,
  EditorialDiagnosis,
  Episode,
  FollowUpItem,
  Guest,
  LibraryAsset,
  Organization,
  OrganizationRole,
  OutlineBlock,
  PaymentGatewayEvent,
  PaymentMethodType,
  PlannedShort,
  Production,
  ProgramEditorialIdentity,
  ProgramKnowledgeSummary,
  ProgramPitchCurationResponse,
  ProgramPitchRequestInput,
  QuestionItem,
  ResearchData,
  SaaSPlanDefinition,
  SaaSRegistrationPayload,
  SaaSSubscription,
  ScheduleEvent,
  ScriptItem,
  Show,
  SubscriptionPlanId,
  User,
  UserAccountStatus,
  UserShowPermission,
} from '../types';

const AUTH_TOKEN_KEY = 'tmv2_auth_token';
const ACTIVE_ORG_KEY = 'tmv2_active_org_id';

export function getStoredAuthToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getStoredOrganizationId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_ORG_KEY);
  } catch {
    return null;
  }
}

export function storeAuthSessionContext(session: AuthSession) {
  try {
    localStorage.setItem(AUTH_TOKEN_KEY, session.token);
    localStorage.setItem(ACTIVE_ORG_KEY, session.activeOrganization.id);
  } catch {
    // ignore storage quota errors
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const token = getStoredAuthToken();
  const orgId = getStoredOrganizationId();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options?.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (orgId) {
    headers['X-Organization-Id'] = orgId;
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errMessage = `Erro HTTP ${res.status}`;
    try {
      const parsed = await res.json();
      if (parsed && parsed.message) {
        errMessage = parsed.message;
      } else if (parsed && parsed.error) {
        errMessage = parsed.error;
      }
    } catch {
      const text = await res.text().catch(() => '');
      if (text) errMessage = text;
    }
    throw new Error(errMessage);
  }

  return res.json();
}

export interface WorkspaceStateResponse {
  session: AuthSession;
  availableUsers: User[];
  shows: Show[];
  productions: Production[];
  episodes: Episode[];
  guests: Guest[];
  scheduleEvents: ScheduleEvent[];
  libraryAssets: LibraryAsset[];
  auditLogs: AuditLogEntry[];
}

export interface BillingOverviewResponse {
  plans: SaaSPlanDefinition[];
  subscriptions: SaaSSubscription[];
  invoices: BillingInvoice[];
  gatewayEvents: PaymentGatewayEvent[];
}

export interface AdminOverviewResponse {
  users: User[];
  shows: Show[];
  plans: SaaSPlanDefinition[];
  subscriptions: SaaSSubscription[];
  invoices: BillingInvoice[];
  gatewayEvents: PaymentGatewayEvent[];
  reportSummary: AdminReportSummary;
  auditLogs: AuditLogEntry[];
}

export const api = {
  // Auth & Program-Level RBAC Session
  getSession: () =>
    request<{
      session: AuthSession;
      availableUsers: User[];
      availableOrganizations: Organization[];
    }>('/api/auth/session'),

  login: async (emailOrUserId: string, organizationId?: string, loginCode?: string) => {
    const res = await request<{ session: AuthSession }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ emailOrUserId, organizationId, loginCode }),
    });
    storeAuthSessionContext(res.session);
    return res.session;
  },

  registerAccount: async (payload: SaaSRegistrationPayload & { organizationId?: string }) => {
    const res = await request<{
      session: AuthSession;
      user: User;
      show: Show;
      subscription: SaaSSubscription;
      invoice: BillingInvoice;
      gatewayEvent: PaymentGatewayEvent;
    }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    storeAuthSessionContext(res.session);
    return res;
  },

  switchOrganization: async (organizationId: string) => {
    const res = await request<{ session: AuthSession }>('/api/auth/switch-org', {
      method: 'POST',
      body: JSON.stringify({ organizationId }),
    });
    storeAuthSessionContext(res.session);
    return res.session;
  },

  // Workspace State (Filtered by Program-Level RBAC)
  getState: async (): Promise<WorkspaceStateResponse> => {
    const res = await request<WorkspaceStateResponse>('/api/state');
    if (res.session) {
      storeAuthSessionContext(res.session);
    }
    return res;
  },

  // RSPlay TV SaaS Billing & Payment Gateway
  getBillingOverview: () => request<BillingOverviewResponse>('/api/billing/overview'),

  subscribePlan: (payload: {
    planId: SubscriptionPlanId;
    showId?: string;
    paymentMethodType?: PaymentMethodType;
    paymentMethodLast4?: string;
    paymentMethodBrand?: string;
    autoRenew?: boolean;
  }) =>
    request<{
      subscription: SaaSSubscription;
      invoice: BillingInvoice;
      gatewayEvent: PaymentGatewayEvent;
    }>('/api/billing/subscribe', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  toggleAutoRenew: (subscriptionId: string, autoRenew: boolean) =>
    request<SaaSSubscription>(`/api/billing/subscriptions/${subscriptionId}/auto-renew`, {
      method: 'POST',
      body: JSON.stringify({ autoRenew }),
    }),

  renewSubscriptionNow: (subscriptionId: string, simulateFailure = false) =>
    request<{
      subscription: SaaSSubscription;
      invoice: BillingInvoice;
      gatewayEvent: PaymentGatewayEvent;
    }>(`/api/billing/subscriptions/${subscriptionId}/renew-now`, {
      method: 'POST',
      body: JSON.stringify({ simulateFailure }),
    }),

  // RSPlay TV SaaS Admin Panel (Users, Program Logins, Permissions & Reports)
  getAdminOverview: () => request<AdminOverviewResponse>('/api/admin/overview'),

  createAdminUser: (payload: {
    name: string;
    email: string;
    jobTitle?: string;
    loginCode?: string;
    role?: OrganizationRole;
    showPermissions?: Partial<UserShowPermission>[];
  }) =>
    request<User>('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateUserShowPermissions: (userId: string, permissions: Partial<UserShowPermission>[]) =>
    request<User>(`/api/admin/users/${userId}/permissions`, {
      method: 'PUT',
      body: JSON.stringify({ permissions }),
    }),

  updateUserStatusOrRole: (
    userId: string,
    updates: {
      role?: OrganizationRole;
      status?: UserAccountStatus;
      jobTitle?: string;
      loginCode?: string;
    }
  ) =>
    request<User>(`/api/admin/users/${userId}/status`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  // Shows & Catalog
  createShow: (show: Partial<Show>) =>
    request<Show>('/api/shows', { method: 'POST', body: JSON.stringify(show) }),
  updateShow: (id: string, show: Partial<Show>) =>
    request<Show>(`/api/shows/${id}`, { method: 'PUT', body: JSON.stringify(show) }),
  deleteShow: (id: string) =>
    request<{ success: boolean }>(`/api/shows/${id}`, { method: 'DELETE' }),

  // RS Play Knowledge Base, Program Editorial Identity & Pautas Curation (FASES 1 a 8)
  listKnowledgeBasePrograms: () =>
    request<
      {
        slug: string;
        nome: string;
        apresentador: string;
        descricao: string;
        hasMediaKitHtml: boolean;
        secoesCount: number;
      }[]
    >('/api/knowledge-base/programs'),

  getShowKnowledge: (showId: string) =>
    request<ProgramKnowledgeSummary>(`/api/shows/${encodeURIComponent(showId)}/knowledge`),

  generateShowEditorialIdentity: (showId: string) =>
    request<ProgramEditorialIdentity>(
      `/api/shows/${encodeURIComponent(showId)}/editorial-identity`,
      {
        method: 'POST',
        body: JSON.stringify({}),
      }
    ),

  suggestShowPautas: (showId: string, input: ProgramPitchRequestInput) =>
    request<ProgramPitchCurationResponse>(
      `/api/shows/${encodeURIComponent(showId)}/suggest-pautas`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      }
    ),

  // Productions / Seasons
  getProductions: (showId?: string) =>
    request<Production[]>(
      showId ? `/api/productions?showId=${encodeURIComponent(showId)}` : '/api/productions'
    ),
  createProduction: (production: Partial<Production>) =>
    request<Production>('/api/productions', {
      method: 'POST',
      body: JSON.stringify(production),
    }),
  updateProduction: (id: string, production: Partial<Production>) =>
    request<Production>(`/api/productions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(production),
    }),
  deleteProduction: (id: string) =>
    request<{ success: boolean }>(`/api/productions/${id}`, { method: 'DELETE' }),

  // Episodes & Editorial Core
  getEpisode: (id: string) => request<Episode>(`/api/episodes/${id}`),
  createEpisode: (episode: Partial<Episode>) =>
    request<Episode>('/api/episodes', { method: 'POST', body: JSON.stringify(episode) }),
  updateEpisode: (id: string, episode: Partial<Episode>) =>
    request<Episode>(`/api/episodes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(episode),
    }),
  deleteEpisode: (id: string) =>
    request<{ success: boolean }>(`/api/episodes/${id}`, { method: 'DELETE' }),

  // Guests / Participants
  createGuest: (guest: Partial<Guest>) =>
    request<Guest>('/api/guests', { method: 'POST', body: JSON.stringify(guest) }),
  updateGuest: (id: string, guest: Partial<Guest>) =>
    request<Guest>(`/api/guests/${id}`, { method: 'PUT', body: JSON.stringify(guest) }),
  deleteGuest: (id: string) =>
    request<{ success: boolean }>(`/api/guests/${id}`, { method: 'DELETE' }),

  // Production Schedule (Agenda Operacional)
  getScheduleEvents: (showId?: string) =>
    request<ScheduleEvent[]>(
      showId ? `/api/schedule?showId=${encodeURIComponent(showId)}` : '/api/schedule'
    ),
  createScheduleEvent: (event: Partial<ScheduleEvent>) =>
    request<ScheduleEvent>('/api/schedule', {
      method: 'POST',
      body: JSON.stringify(event),
    }),
  updateScheduleEvent: (id: string, event: Partial<ScheduleEvent>) =>
    request<ScheduleEvent>(`/api/schedule/${id}`, {
      method: 'PUT',
      body: JSON.stringify(event),
    }),
  deleteScheduleEvent: (id: string) =>
    request<{ success: boolean }>(`/api/schedule/${id}`, { method: 'DELETE' }),

  // Library Assets (Biblioteca de Produção)
  getLibraryAssets: (showId?: string) =>
    request<LibraryAsset[]>(
      showId ? `/api/library?showId=${encodeURIComponent(showId)}` : '/api/library'
    ),
  createLibraryAsset: (asset: Partial<LibraryAsset>) =>
    request<LibraryAsset>('/api/library', {
      method: 'POST',
      body: JSON.stringify(asset),
    }),
  updateLibraryAsset: (id: string, asset: Partial<LibraryAsset>) =>
    request<LibraryAsset>(`/api/library/${id}`, {
      method: 'PUT',
      body: JSON.stringify(asset),
    }),
  deleteLibraryAsset: (id: string) =>
    request<{ success: boolean }>(`/api/library/${id}`, { method: 'DELETE' }),

  // Explicit Seed Reset
  resetSeedWorkspace: () =>
    request<{
      success: boolean;
      session: AuthSession;
      shows: Show[];
      productions: Production[];
      episodes: Episode[];
      guests: Guest[];
      scheduleEvents: ScheduleEvent[];
      libraryAssets: LibraryAsset[];
    }>('/api/seed/reset', { method: 'POST' }),

  // Validated AI Co-Producer Services (Canonical V2 + Tab Helper Signatures)
  generateDiagnosis: (params: {
    showTitle?: string;
    showStyle?: string;
    episodeTitle?: string;
    guestName?: string;
    idea: string;
    format?: string;
    durationMin?: number;
    objective?: string;
    additionalInfo?: string;
  }) =>
    request<EditorialDiagnosis>('/api/ai/diagnosis', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  aiDiagnose: (params: {
    idea: string;
    guestName?: string;
    format?: string;
    durationMin?: number;
    objective?: string;
    additionalInfo?: string;
  }) =>
    request<EditorialDiagnosis>('/api/ai/diagnosis', {
      method: 'POST',
      body: JSON.stringify({
        showTitle: 'RSPlay TV Studio',
        showStyle: params.format || 'Entrevista',
        episodeTitle: params.idea.slice(0, 80),
        guestName: params.guestName || 'Convidado',
        idea: params.idea,
        objective: params.objective,
        additionalInfo: params.additionalInfo,
      }),
    }),

  generateResearch: (params: {
    episodeTitle?: string;
    guestName: string;
    guestBio?: string;
    guestCompany?: string;
    company?: string;
    idea?: string;
    diagnosis?: EditorialDiagnosis;
  }) =>
    request<ResearchData>('/api/ai/research', {
      method: 'POST',
      body: JSON.stringify({
        episodeTitle: params.episodeTitle || params.idea || '',
        guestName: params.guestName,
        guestBio: params.guestBio,
        guestCompany: params.guestCompany || params.company,
        idea: params.idea || '',
        diagnosis: params.diagnosis,
      }),
    }),

  aiResearch: (params: {
    guestName: string;
    company?: string;
    idea?: string;
    diagnosis?: EditorialDiagnosis;
  }) =>
    request<ResearchData>('/api/ai/research', {
      method: 'POST',
      body: JSON.stringify({
        episodeTitle: params.idea || '',
        guestName: params.guestName,
        guestCompany: params.company,
        idea: params.idea || '',
        diagnosis: params.diagnosis,
      }),
    }),

  aiOutline: (params: {
    idea: string;
    guestName: string;
    targetDurationMin: number;
    diagnosis?: EditorialDiagnosis;
    research?: ResearchData;
  }) =>
    request<{ outline: OutlineBlock[]; questions: QuestionItem[]; segments?: OutlineBlock[] }>('/api/ai/outline', {
      method: 'POST',
      body: JSON.stringify({
        episode: {
          title: params.idea.slice(0, 80),
          idea: params.idea,
          guestName: params.guestName,
          targetDurationMin: params.targetDurationMin,
          diagnosis: params.diagnosis,
          research: params.research,
        },
      }),
    }),

  aiScript: (episode: Episode | { episode: Episode }) =>
    request<{ script: ScriptItem[] }>('/api/ai/script', {
      method: 'POST',
      body: JSON.stringify({ episode: 'episode' in episode ? episode.episode : episode }),
    }),

  aiRepiques: (params: {
    questionText: string;
    context?: string;
    guestName?: string;
  }) =>
    request<{ followUps: FollowUpItem[] }>('/api/ai/repiques', {
      method: 'POST',
      body: JSON.stringify({
        questionText: params.questionText,
        guestName: params.guestName || 'Convidado',
        episodeContext: params.context || '',
      }),
    }),

  aiShorts: (episode: Episode | { episode: Episode }) =>
    request<{ shorts: PlannedShort[] }>('/api/ai/shorts', {
      method: 'POST',
      body: JSON.stringify({ episode: 'episode' in episode ? episode.episode : episode }),
    }),

  aiEditorScript: async (episode: Episode | { episode: Episode }): Promise<{ editorScript: string }> => {
    const res = await request<{ synthesis: string }>('/api/ai/editor-script', {
      method: 'POST',
      body: JSON.stringify({ episode: 'episode' in episode ? episode.episode : episode }),
    });
    return { editorScript: res.synthesis };
  },

  aiAssist: async (params: {
    episode: Episode;
    userPrompt: string;
    currentTab: string;
  }): Promise<{
    actionType: string;
    summary: string;
    explanation: string;
    targetField: string;
    updatedData: any;
  }> => {
    const res = await request<{ suggestion: string }>('/api/ai/assist', {
      method: 'POST',
      body: JSON.stringify({
        action: `[Aba: ${params.currentTab}] ${params.userPrompt}`,
        selectedText: params.episode.idea || params.episode.title,
        episodeContext: params.episode,
      }),
    });
    return {
      actionType: 'Sugestão Editorial Validada (V2)',
      summary: res.suggestion,
      explanation:
        'A IA gerou uma recomendação contextualizada sob contrato validado. Revise antes de incorporar à pauta.',
      targetField: params.currentTab,
      updatedData: null,
    };
  },
};
