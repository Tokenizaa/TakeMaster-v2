/**
 * TakeMaster V2 / RSPlay TV SaaS — Canonical Domain Contracts (Shared Kernel)
 * 
 * This is the SINGLE SOURCE OF TRUTH for all domain types.
 * Domain-specific extensions go in src/domain/types/<domain>.ts
 * 
 * Hierarchy: User -> Organization -> Show (Program-Level RBAC) -> Production -> Episode
 */

// ============================================
// IDENTITY & AUTH
// ============================================

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

export type PlatformRole = 'platform_admin' | 'platform_operator' | 'none';

export type UserAccountStatus = 'active' | 'suspended' | 'invited';

export interface User {
  id: string;
  email: string;
  name: string;
  jobTitle?: string;
  status?: UserAccountStatus;
  loginCode?: string;
  avatarUrl?: string;
  role?: OrganizationRole;
  platformRole?: PlatformRole;
  showPermissions?: UserShowPermission[];
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

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

export interface OrganizationMembership {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  role: OrganizationRole;
}

export interface AuthSession {
  token: string;
  user: User;
  activeOrganization: Organization;
  role: OrganizationRole;
  platformRole: PlatformRole;
  memberships: OrganizationMembership[];
  showPermissions: UserShowPermission[];
  allowedShowIds: string[];
  isFullAccessAdmin: boolean;
  isPlatformAdmin: boolean;
  activeSubscription?: SaaSSubscription;
}

// ============================================
// CATALOG
// ============================================

export type CatalogStatus = 'development' | 'active' | 'hiatus' | 'archived';

export type ShowFormat =
  | 'Entrevista'
  | 'Programa Solo'
  | 'Mesa Redonda'
  | 'Podcast/Videocast'
  | 'Debate'
  | 'Reportagem'
  | 'Especial'
  | 'Outro';

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
  defaultCameras?: CameraConfig[];
  name?: string;
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

// ============================================
// PRODUCTION (Season-level)
// ============================================

export type ProductionStatus =
  | 'planning'
  | 'pre_production'
  | 'in_production'
  | 'post_production'
  | 'completed';

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

// ============================================
// EPISODE
// ============================================

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
  segments?: Segment[];
  checklist?: ChecklistItem[];
  plannedShorts?: PlannedShort[];
  materials?: ProductionMaterial[];
  editorialNotesForPost?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// TALENT / GUEST
// ============================================

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
  previousEpisodes: string[] | number;
  previousResearchSummary?: string;
  createdAt: string;
  updatedAt?: string;
}

export type Participant = Guest;

export type ParticipantType = string;

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

// ============================================
// EDITORIAL & RESEARCH
// ============================================

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

// ============================================
// OUTLINE & QUESTIONS
// ============================================

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

export type Segment = OutlineBlock;

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

// ============================================
// SCRIPT
// ============================================

export type ScriptItemType =
  | 'cold_open'
  | 'opening'
  | 'vinheta'
  | 'transition'
  | 'question'
  | 'reaction'
  | 'closing'
  | 'b_roll_insert';

export interface ScriptItem {
  [key: string]: any;
  id: string;
  blockId?: string;
  timestamp: string;
  type: ScriptItemType;
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

// ============================================
// SHORTS
// ============================================

export type PlannedShortStatus = 'Planejado' | 'Capturado' | 'Excelente' | 'Não aconteceu';

export interface PlannedShort {
  [key: string]: any;
  id: string;
  title: string;
  hook: string;
  generatingQuestion: string;
  estimatedDuration: string;
  status: PlannedShortStatus;
  notes?: string;
  suggestedHook?: string;
  narrativeArc?: string;
  expectedDurationSeconds?: number;
  cameraFocus?: string;
  bRollNotes?: string;
  targetPlatform?: string[];
}

// ============================================
// ASSETS
// ============================================

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
  displayTime?: string;
  content?: string;
  notes?: string;
}

export type ProductionMaterial = ProductionAsset;

export interface LibraryAsset extends ProductionAsset {
  organizationId: string;
  showId?: string;
  episodeId?: string;
  episodeTitle?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// RECORDING & TECHNICAL
// ============================================

export type RecordingMarkerType = 'momento_forte' | 'corte' | 'nota' | 'estender' | 'erro';

export interface RecordingMarker {
  id: string;
  timestampSec: number;
  formattedTime: string;
  type: RecordingMarkerType;
  blockTitle: string;
  referenceText: string;
  comment?: string;
}

export interface TechnicalChecklistItem {
  [key: string]: any;
  id: string;
  task: string;
  category: string;
  completed: boolean;
  assignedTo?: string;
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

export type ChecklistItem = TechnicalChecklistItem;

// ============================================
// SCRIPT VERSIONS
// ============================================

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

// ============================================
// SCHEDULE
// ============================================

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
  | 'cancelled'
  | 'confirmado'
  | 'pendente'
  | 'concluido';

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

export interface AgendaEvent {
  id: string;
  title: string;
  type: 'recording' | 'rehearsal' | 'meeting' | 'deadline' | string;
  scheduledDate: string;
  scheduledTime: string;
  episodeId?: string;
  notes: string;
}

// ============================================
// BILLING
// ============================================

export type SubscriptionPlanId =
  | 'rsplay_programa_individual'
  | 'rsplay_studio_pro'
  | 'rsplay_broadcast_enterprise';

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'suspended'
  | 'pending_payment';

export type PaymentIntentStatus =
  | 'created'
  | 'pending_payment'
  | 'payment_confirmed'
  | 'payment_failed'
  | 'expired'
  | 'cancelled'
  | 'refunded'
  | 'reconciliation_needed';

export interface PaymentIntent {
  id: string;
  organizationId: string;
  programId?: string;
  subscriptionId?: string;
  planId: SubscriptionPlanId;
  amountCents: number;
  currency: string;
  status: PaymentIntentStatus;
  gatewayProvider: string;
  gatewayTransactionId?: string;
  gatewayPayload?: Record<string, any>;
  webhookReceivedAt?: string;
  reconciledAt?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export type PaymentMethodType =
  | 'credit_card'
  | 'pix_automatico'
  | 'boleto_corporativo';

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

export type SetupStatus =
  | 'not_started'
  | 'setup_pending'
  | 'setup_running'
  | 'setup_failed'
  | 'ready'
  | 'suspended'
  | 'cancelled';

export interface SetupState {
  id: string;
  organizationId: string;
  programId: string;
  status: SetupStatus;
  version: number;
  steps: Record<string, { status: 'pending' | 'completed' | 'failed'; completedAt?: string; error?: string }>;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  error?: string;
}

export interface SaaSRegistrationPayload {
  name: string;
  email: string;
  loginCode: string;
  jobTitle?: string;
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

// ============================================
// ADMIN & AUDIT
// ============================================

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

export interface DatabaseState {
  shows: Show[];
  episodes: Episode[];
  guests: Guest[];
}

// ============================================
// ERRORS
// ============================================

export type ApiErrorCode =
  | 'CONFIGURATION_ERROR'
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN_CONTEXT'
  | 'SUBSCRIPTION_INACTIVE'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'PERSISTENCE_ERROR'
  | 'AI_SCHEMA_ERROR'
  | 'PAYMENT_FAILED'
  | 'SETUP_IN_PROGRESS'
  | 'EMAIL_EXISTS';

export interface StandardizedApiError {
  code: ApiErrorCode;
  message: string;
  details?: string[];
  requestId?: string;
}

// ============================================
// PROGRAM KNOWLEDGE BASE (RSPlay)
// ============================================

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

// ============================================
// ALIASES (compatibilidade)
// ============================================

export type Program = Show;