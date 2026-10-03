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

// Participant/Guest types
export type ParticipantType = 'individual' | 'group' | 'band';
export type GroupType = 'band' | 'duo' | 'group' | 'crew' | 'choir';
export type EntityType = 'individual' | 'group' | 'band';

export interface CameraConfig {
  id: string;
  name: string;
  label: string;
  purpose: string;
  framing: string;
  active: boolean;
}

export interface Program {
  id: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface Guest {
  id: string;
  legacy_id: string | null;
  program_id: string | null;
  name: string;
  type: ParticipantType;
  group_type: GroupType | null;
  role: string;
  company: string;
  company_or_group: string | null;
  bio: string;
  contacts: string;
  notes: string;
  links: string[];
  members: string[];
  entity_type: EntityType;
  social_handles: Record<string, string>; // JSONB object
  previous_episodes: string[]; // Array of episode IDs (text[] in DB)
  previous_research_summary: string | null;
  created_at: string;
  updated_at: string;
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
  category: 'guest' | 'trajectory' | 'company' | 'dates_numbers' | 'interviews' | 'contradictions' | 'stories';
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
  id: string;
  blockNumber: number;
  title: string;
  estimatedDurationMin: number;
  objective: string;
  keyThemes: string[];
  transitionText: string;
}

export interface FollowUpItem {
  id: string;
  triggerCondition: string;
  actionOrQuestion: string;
  tag: 'DINHEIRO' | 'FAMÍLIA' | 'MEDO' | 'CONFLITO' | 'APROFUNDAR' | 'NÃO INTERROMPER' | 'OUTRO';
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
  id: string;
  blockId?: string;
  timestamp: string;
  type: 'cold_open' | 'opening' | 'vinheta' | 'transition' | 'question' | 'reaction' | 'closing' | 'b_roll_insert';
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
  type: 'foto' | 'video' | 'documento' | 'grafico' | 'produto' | 'materia';
  title: string;
  description: string;
  moment: string;
  status: 'pendente' | 'em_busca' | 'obtido' | 'aprovado';
  fileUrl?: string;
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
  versionNumber: number;
  name: string;
  savedAt: string;
  description: string;
  snapshot: any;
}

  export interface Episode {
    id: string;
    legacy_id: string | null;
    program_id: string;
    episode_number: number;
    title: string;
    idea: string;
    topic: string;
    synopsis: string;
    format: ShowFormat;
    target_duration_min: number;
    target_duration_minutes: number;
    presenter_name: string;
    host: string;
    tone: string;
    objective: string | null;
    additional_info: string | null;
    status: EpisodeStatus;
    diagnosis: EditorialDiagnosis;
    research: ResearchData;
    technical_checklist: TechnicalChecklist;
    editorial_notes_for_post: string | null;
    editor_script_synthesis: string | null;
    recording_time_elapsed: number | null;
    scheduled_date: string | null;
    production_status: string;
    version: number;
    season_id: string | null;
    created_at: string;
    updated_at: string;
    checklist: any[];
    // Backward compatibility properties (not stored in database)
    guest_name?: string;
    guest_id?: string;
  }

export interface DatabaseState {
  programs: Program[];
  episodes: Episode[];
  guests: Guest[];
}
