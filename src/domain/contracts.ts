/**
 * TakeMaster V2 / RSPlay TV SaaS — Canonical Domain Contracts
 * Hierarchy: User -> Organization -> Show (Program-Level RBAC) -> Production -> Episode
 */

export type OrganizationPlan =
  | 'starter'
  | 'studio_pro'
  | 'enterprise'
  | 'rsplay_programa_individual'
  | 'rsplay_studio_pro'
  | 'rsplay_broadcast_enterprise';

export type OrganizationRole =
  | 'owner'
  | 'admin'
  | 'producer'
  | 'editor'
  | 'host'
  | 'viewer';

export type UserAccountStatus = 'active' | 'suspended' | 'invited';

export type CatalogStatus = 'development' | 'active' | 'hiatus' | 'archived';

export type ProductionStatus =
  | 'planning'
  | 'pre_production'
  | 'in_production'
  | 'post_production'
  | 'completed';

export type EpisodeStatus =
  | 'draft'
  | 'diagnosis'
  | 'research'
  | 'outline'
  | 'scripting'
  | 'ready'
  | 'recording'
  | 'recorded'
  | 'editing'
  | 'published';

export type ShowFormat =
  | 'Entrevista'
  | 'Programa Solo'
  | 'Mesa Redonda'
  | 'Podcast/Videocast'
  | 'Debate'
  | 'Reportagem'
  | 'Especial'
  | 'Outro';

export type ScheduleEventType =
  | 'pre_interview'
  | 'briefing'
  | 'rehearsal'
  | 'recording'
  | 'editing'
  | 'review'
  | 'release';

export type ScheduleEventStatus =
  | 'scheduled'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type AssetType =
  | 'foto'
  | 'video'
  | 'documento'
  | 'grafico'
  | 'produto'
  | 'materia'
  | 'trilha'
  | 'vinheta';

export type AssetStatus = 'pendente' | 'em_busca' | 'obtido' | 'aprovado';

export type SubscriptionPlanId =
  | 'rsplay_programa_individual'
  | 'rsplay_studio_pro'
  | 'rsplay_broadcast_enterprise';

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'suspended';

export type PaymentMethodType =
  | 'credit_card'
  | 'pix_automatico'
  | 'boleto_corporativo';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: OrganizationPlan;
  createdAt: string;
  updatedAt: string;
}

export interface UserShowPermission {
  id: string;
  organizationId: string;
  userId: string;
  showId: string;
  showTitle?: string;
  canView: boolean;
  canEditEditorial: boolean;
  canEditScript: boolean;
  canOperateStudio: boolean;
  canManageSchedule: boolean;
  canManageAssets: boolean;
  canExport: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  jobTitle?: string;
  status?: UserAccountStatus;
  loginCode?: string;
  avatarUrl?: string;
  role?: OrganizationRole;
  showPermissions?: UserShowPermission[];
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMembership {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  role: OrganizationRole;
}

export interface SaaSPlanDefinition {
  id: SubscriptionPlanId;
  name: string;
  tagline: string;
  monthlyPriceCents: number;
  maxShows: number;
  maxUsers: number;
  features: string[];
  highlighted?: boolean;
}

export interface SaaSSubscription {
  id: string;
  organizationId: string;
  showId?: string;
  showTitle?: string;
  planId: SubscriptionPlanId;
  planName: string;
  billingCycle: 'monthly' | 'annual';
  amountCents: number;
  currency: string;
  status: SubscriptionStatus;
  autoRenew: boolean;
  paymentGateway: string;
  paymentMethodType: PaymentMethodType;
  paymentMethodLast4: string;
  paymentMethodBrand: string;
  gatewayCustomerId: string;
  gatewaySubscriptionId: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  lastRenewalAt?: string;
  canceledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BillingInvoice {
  id: string;
  organizationId: string;
  subscriptionId: string;
  invoiceNumber: string;
  description: string;
  amountCents: number;
  currency: string;
  status: 'paid' | 'open' | 'failed' | 'refunded';
  paymentMethod: PaymentMethodType;
  gatewayTransactionId: string;
  autoRenewalCycle: boolean;
  dueDate: string;
  paidAt?: string;
  createdAt: string;
}

export interface PaymentGatewayEvent {
  id: string;
  organizationId: string;
  subscriptionId?: string;
  provider: string;
  eventType: string;
  status: string;
  payload: Record<string, any>;
  createdAt: string;
}

export interface AuthSession {
  token: string;
  user: User;
  activeOrganization: Organization;
  role: OrganizationRole;
  memberships: OrganizationMembership[];
  showPermissions: UserShowPermission[];
  allowedShowIds: string[];
  isFullAccessAdmin: boolean;
  activeSubscription?: SaaSSubscription;
}

export interface CameraConfig {
  [key: string]: any;
  id: string;
  name: string;
  label: string;
  purpose: string;
  framing: string;
  active: boolean;
}

export interface Show {
  id: string;
  organizationId?: string;
  title: string;
  description: string;
  host: string;
  format: ShowFormat;
  defaultDurationMin: number;
  editorialStyle: string;
  scenario: string;
  cameras: CameraConfig[];
  standardStructure: string[];
  defaultOpening: string;
  defaultClosing: string;
  catalogStatus?: CatalogStatus;
  category?: string;
  targetAudience?: string;
  distributionChannels?: string[];
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Production {
  id: string;
  organizationId: string;
  showId: string;
  title: string;
  seasonNumber: number;
  status: ProductionStatus;
  targetEpisodesCount: number;
  executiveProducer: string;
  startDate?: string;
  endDate?: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Guest {
  [key: string]: any;
  id: string;
  organizationId?: string;
  name: string;
  role: string;
  company: string;
  bio: string;
  contacts: string;
  links: string[];
  notes: string;
  previousEpisodes: string[];
  previousResearchSummary?: string;
  createdAt: string;
  updatedAt?: string;
}

export type Participant = Guest;

export type Program = Show;
export type ParticipantType = string;
export type ProductionMaterial = ProductionAsset;
export interface ChecklistItem {
  [key: string]: any;
  id: string;
  task: string;
  category: string;
  completed: boolean;
  assignedTo?: string;
}
export type Segment = OutlineBlock;
export interface AgendaEvent {
  id: string;
  title: string;
  type: 'recording' | 'rehearsal' | 'meeting' | 'deadline' | string;
  scheduledDate: string;
  scheduledTime: string;
  episodeId?: string;
  notes: string;
}

export interface EpisodeParticipant {
  [key: string]: any;
  id: string;
  organizationId: string;
  episodeId: string;
  participantId: string;
  participantName?: string;
  participantRole?: string;
  participantCompany?: string;
  roleInEpisode: 'main_guest' | 'co_guest' | 'panelist' | 'specialist';
  confirmationStatus: 'invited' | 'confirmed' | 'recorded' | 'declined';
  notes: string;
  createdAt: string;
}

export interface EditorialDiagnosis {
  centralTheme: string;
  potentialStory: string;
  primaryConflict: string;
  primaryTransformation: string;
  whyWatch: string;
  whatToDiscover: string;
  researchPoints: string[];
  highImpactMoments: string[];
  approved: boolean;
}

export interface ResearchSource {
  id: string;
  title: string;
  url?: string;
  detail: string;
  status: 'CONFIRMADO' | 'NÃO CONFIRMADO' | 'PERGUNTAR AO CONVIDADO';
  category:
    | 'guest'
    | 'trajectory'
    | 'company'
    | 'dates_numbers'
    | 'interviews'
    | 'contradictions'
    | 'stories';
}

export interface ResearchData {
  aboutGuest: string;
  trajectory: string;
  company: string;
  keyDatesAndNumbers: string;
  previousInterviews: string;
  recurringThemes: string;
  contradictionsAndClarifications: string;
  compellingStories: string;
  sources: ResearchSource[];
}

export interface OutlineBlock {
  [key: string]: any;
  id: string;
  blockNumber: number;
  title: string;
  estimatedDurationMin: number;
  objective: string;
  keyThemes: string[];
  transitionText: string;
}

export interface FollowUpItem {
  [key: string]: any;
  id: string;
  triggerCondition: string;
  actionOrQuestion: string;
  tag:
    | 'DINHEIRO'
    | 'FAMÍLIA'
    | 'MEDO'
    | 'CONFLITO'
    | 'APROFUNDAR'
    | 'NÃO INTERROMPER'
    | 'OUTRO';
}

export interface QuestionItem {
  id: string;
  blockId: string;
  order: number;
  text: string;
  objective: string;
  suggestedCamera: string;
  eyeDirection: string;
  followUps: FollowUpItem[];
}

export interface ScriptItem {
  [key: string]: any;
  id: string;
  blockId?: string;
  timestamp: string;
  type:
    | 'cold_open'
    | 'opening'
    | 'vinheta'
    | 'transition'
    | 'question'
    | 'reaction'
    | 'closing'
    | 'b_roll_insert';
  camera: string;
  alternativeCamera?: string;
  speaker: string;
  targetPerson?: string;
  eyeDirection: string;
  shotType: string;
  content: string;
  directionalMarkers: string[];
  isTeleprompter: boolean;
  questionRefId?: string;
}

export interface PlannedShort {
  [key: string]: any;
  id: string;
  title: string;
  hook: string;
  generatingQuestion: string;
  estimatedDuration: string;
  status: 'Planejado' | 'Capturado' | 'Excelente' | 'Não aconteceu';
  notes?: string;
}

export interface ProductionAsset {
  id: string;
  blockId?: string;
  type: AssetType;
  title: string;
  description: string;
  moment: string;
  status: AssetStatus;
  fileUrl?: string;
  tags?: string[];
  reusable?: boolean;
}

export interface LibraryAsset extends ProductionAsset {
  organizationId: string;
  showId?: string;
  episodeId?: string;
  episodeTitle?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecordingMarker {
  id: string;
  timestampSec: number;
  formattedTime: string;
  type: 'momento_forte' | 'corte' | 'nota' | 'estender' | 'erro';
  blockTitle: string;
  referenceText: string;
  comment?: string;
}

export interface TechnicalChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export interface TechnicalChecklist {
  cam1Recording: boolean;
  cam2Recording: boolean;
  cam3Recording: boolean;
  micHost: boolean;
  micGuest: boolean;
  audioMonitored: boolean;
  lighting: boolean;
  memoryCardsStorage: boolean;
  batteries: boolean;
  syncClap: boolean;
  waterReady: boolean;
  silentPhones: boolean;
  customItems: TechnicalChecklistItem[];
}

export interface ScriptVersion {
  id: string;
  episodeId?: string;
  organizationId?: string;
  versionNumber: number;
  name: string;
  savedAt: string;
  description: string;
  snapshot: {
    outline?: OutlineBlock[];
    questions?: QuestionItem[];
    script?: ScriptItem[];
    diagnosis?: EditorialDiagnosis;
  };
}

export interface Episode {
  [key: string]: any;
  id: string;
  organizationId?: string;
  showId: string;
  productionId?: string;
  episodeNumber: number;
  title: string;
  idea: string;
  guestName: string;
  guestId?: string;
  participants?: EpisodeParticipant[];
  host: string;
  format: ShowFormat;
  targetDurationMin: number;
  objective?: string;
  additionalInfo?: string;
  status: EpisodeStatus;
  diagnosis: EditorialDiagnosis;
  research: ResearchData;
  outline: OutlineBlock[];
  questions: QuestionItem[];
  script: ScriptItem[];
  cameras: CameraConfig[];
  assets: ProductionAsset[];
  shorts: PlannedShort[];
  recordingMarkers: RecordingMarker[];
  technicalChecklist: TechnicalChecklist;
  versions: ScriptVersion[];
  editorScriptSynthesis?: string;
  recordingTimeElapsed?: number;
  topic?: string;
  synopsis?: string;
  presenterName?: string;
  tone?: string;
  targetDurationMinutes?: number;
  segments?: any[];
  checklist?: ChecklistItem[];
  plannedShorts?: PlannedShort[];
  materials?: ProductionMaterial[];
  editorialNotesForPost?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleEvent {
  id: string;
  organizationId: string;
  showId: string;
  productionId?: string;
  episodeId?: string;
  episodeTitle?: string;
  episodeNumber?: number;
  title: string;
  type: ScheduleEventType;
  status: ScheduleEventStatus;
  scheduledStart: string;
  scheduledEnd: string;
  studioLocation: string;
  assignedTeam: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  organizationId: string;
  userId?: string;
  entityType: string;
  entityId: string;
  action: string;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface AdminReportSummary {
  mrrCents: number;
  activeSubscriptionsCount: number;
  autoRenewEnabledCount: number;
  paidInvoicesTotalCents: number;
  pendingInvoicesTotalCents: number;
  usersCount: number;
  showsReport: {
    showId: string;
    showTitle: string;
    format: string;
    host: string;
    episodesCount: number;
    publishedOrReadyCount: number;
    totalPlannedMinutes: number;
    scheduledSessionsCount: number;
    authorizedUsersCount: number;
  }[];
}

export interface DatabaseState {
  shows: Show[];
  episodes: Episode[];
  guests: Guest[];
}

export type ApiErrorCode =
  | 'CONFIGURATION_ERROR'
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN_CONTEXT'
  | 'SUBSCRIPTION_INACTIVE'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'PERSISTENCE_ERROR'
  | 'AI_SCHEMA_ERROR';

export interface StandardizedApiError {
  code: ApiErrorCode;
  message: string;
  details?: string[];
  requestId?: string;
}

// --- PROGRAM IDENTITY & PAUTAS CURATION LAYER (RS PLAY KNOWLEDGE BASE) ---

export interface ProgramKnowledgeSource {
  urlOriginal: string;
  urlCanonica: string;
  tituloDaPagina: string;
  tipoDePagina: string;
  statusHttp: number;
  dataHoraScrape: string;
  trechosCount: number;
  resumoTrecho?: string;
}

export interface ProgramKnowledgeSummary {
  slug: string;
  showId?: string;
  foundInKnowledgeBase: boolean;
  coverageLevel: 'completa' | 'parcial' | 'cadastro_interno';
  coverageLabel: string;
  nome: string;
  apresentador: string;
  descricao: string;
  proposta: string;
  conceito: string;
  publico: string;
  temasPrincipais: string[];
  quadros: string[];
  formato: string;
  duracao: string;
  horario: string;
  canalPlataforma: string;
  caracteristicasEditoriais: string[];
  informacoesComerciais: string[];
  redesSociais: string[];
  imagensCount: number;
  secoesExtraidasCount: number;
  fontes: ProgramKnowledgeSource[];
  editorialSynthesis: ProgramEditorialIdentity;
}

export interface ProgramEditorialIdentity {
  essencia: string;
  publico: string;
  tom: string;
  temas: string[];
  formatos: string[];
  forcas: string[];
  abordagens_recomendadas: string[];
  abordagens_a_evitar: string[];
  diferenciais: string[];
  fontes: ProgramKnowledgeSource[];
  modelUsed?: string;
  usedFallback?: boolean;
  generatedAt?: string;
}

export type EditorialFitLevel = 'alto' | 'medio' | 'baixo';

export interface ProgramPitchSuggestion {
  score: number;
  fit: EditorialFitLevel;
  reason: string;
  angle: string;
  suggestedGuest: string;
  questions: string[];
  title: string;
  hook: string;
}

export interface ProgramPitchRequestInput {
  prompt?: string;
  tema?: string;
  noticia?: string;
  convidado?: string;
  acontecimento?: string;
  produto?: string;
  cidade?: string;
}

export interface ProgramPitchCurationResponse {
  showId: string;
  showTitle: string;
  slug: string;
  queryUsed: string;
  pautas: ProgramPitchSuggestion[];
  fontes: ProgramKnowledgeSource[];
  modelUsed: string;
  usedFallback: boolean;
  generatedAt: string;
}

export interface SaaSRegistrationPayload {
  name: string;
  email: string;
  loginCode: string;
  jobTitle?: string;
  role?: OrganizationRole;
  showMode: 'existing' | 'new' | 'knowledge_base';
  existingShowId?: string;
  knowledgeBaseSlug?: string;
  newShowTitle?: string;
  newShowHost?: string;
  newShowFormat?: ShowFormat;
  planId: SubscriptionPlanId;
  paymentMethodType: PaymentMethodType;
  paymentMethodBrand?: string;
  paymentMethodLast4?: string;
  autoRenew?: boolean;
}

