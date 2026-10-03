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

export type QuestionFollowUpTag =
  | 'DINHEIRO'
  | 'FAMÍLIA'
  | 'MEDO'
  | 'CONFLITO'
  | 'APROFUNDAR'
  | 'NÃO INTERROMPER'
  | 'OUTRO';

export type FollowUp = {
  id: string;
  legacy_id: string | null;
  question_id: string;
  order_pos: number;
  triggerCondition?: string;
  trigger_condition?: string;
  condition?: string;
  actionOrQuestion?: string;
  action_or_question?: string;
  action?: string;
  cameraCue?: string;
  camera_cue?: string;
  targetParticipant?: string;
  target_participant?: string;
  tag?: QuestionFollowUpTag;
  created_at: string;
  updated_at: string;
};

export type Segment = {
  id: string;
  legacy_id: string | null;
  episode_id: string;
  order_pos: number;
  block_number: number | null;
  title: string;
  type: string | null;
  estimated_duration_min: number | null;
  estimated_duration_minutes: number | null;
  description: string | null;
  key_themes: string[];
  suggested_camera_id: string | null;
  primary_camera: string | null;
  transition_text: string | null;
  b_roll_notes: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  planned_start_sec: number | null;
  actual_start_sec: number | null;
  actual_duration_min: number | null;
  status: string;
};

export type Question = {
  id: string;
  legacy_id: string | null;
  episode_id: string;
  segment_id: string | null;
  participant_id: string | null;
  target_participant_name: string | null;
  order_pos: number;
  speaker: string | null;
  text: string;
  objective: string | null;
  suggested_camera: string | null;
  recommended_camera: string | null;
  eye_direction: string | null;
  status: string | null;
  block_id: string | null;
  created_at: string;
  updated_at: string;
  followUps?: FollowUp[];
};

export type ScriptItem = {
  id: string;
  legacy_id: string | null;
  episode_id: string;
  segment_id: string | null;
  question_id: string | null;
  order_pos: number;
  timestamp: string | null;
  type: ScriptItemType | null;
  camera: string | null;
  camera_instruction: string | null;
  alternative_camera: string | null;
  speaker: string;
  target_person: string | null;
  eye_direction: string | null;
  shot_type: string | null;
  content: string | null;
  directional_markers: string[];
  is_teleprompter: boolean;
  estimated_duration_seconds: number | null;
  notes: string | null;
  transition: string | null;
  block_id: string | null;
  created_at: string;
  updated_at: string;
};

export type PlannedShort = {
  id: string;
  legacy_id: string | null;
  episode_id: string;
  segment_id: string | null;
  title: string;
  hook: string | null;
  suggested_hook: string | null;
  narrative_arc: string | null;
  generating_question: string | null;
  estimated_duration: string | null;
  expected_duration_seconds: number | null;
  camera_focus: string | null;
  b_roll_notes: string | null;
  target_platform: string[];
  status: PlannedShortStatus | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ProductionAsset = {
  id: string;
  legacy_id: string | null;
  episode_id: string;
  segment_id: string | null;
  type: ProductionAssetType;
  title: string;
  description: string | null;
  content: string | null;
  display_time: string | null;
  moment: string | null;
  status: ProductionAssetStatus | null;
  file_url: string | null;
  notes: string | null;
  block_id: string | null;
  created_at: string;
  updated_at: string;
  // Library enhancements
  folder_id?: string | null;
  tags?: string[];
  mime_type?: string | null;
  file_size?: number | null;
  thumbnail_url?: string | null;
  is_favorite?: boolean;
};

export type AssetFolder = {
  id: string;
  name: string;
  parent_id: string | null;
  episode_id: string | null; // null = program-level folder
  program_id: string | null; // null = global folder
  color: string | null;
  created_at: string;
  updated_at: string;
  children?: AssetFolder[];
};

export type AssetTag = {
  id: string;
  name: string;
  color: string | null;
  episode_id: string | null; // null = global tag
  program_id: string | null; // null = global tag
  created_at: string;
  usage_count: number;
};

export type LibrarySearchFilters = {
  query?: string;
  episode_id?: string;
  program_id?: string;
  folder_id?: string;
  tags?: string[];
  type?: ProductionAssetType;
  status?: ProductionAssetStatus;
  mime_type?: string;
  is_favorite?: boolean;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
  order_by?: string;
  ascending?: boolean;
};

export type RecordingMarker = {
  id: string;
  legacy_id: string | null;
  episode_id: string;
  timestamp_sec: number;
  formatted_time: string;
  type: RecordingMarkerType;
  block_title: string;
  reference_text: string;
  comment: string | null;
  created_at: string;
  updated_at: string;
};

export type RecordingSession = {
  id: string;
  episode_id: string;
  status: RecordingSessionStatus;
  scheduled_start: string | null;
  actual_start: string | null;
  actual_end: string | null;
  location: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type RecordingSessionStatus =
  | 'planned'
  | 'setup'
  | 'rehearsal'
  | 'recording'
  | 'paused'
  | 'finished'
  | 'cancelled';

export type ProductionAssetStatus =
  | 'pendente'
  | 'em_busca'
  | 'obtido'
  | 'aprovado';

export type ProductionAssetType =
  | 'foto'
  | 'video'
  | 'documento'
  | 'grafico'
  | 'produto'
  | 'materia';

export type PlannedShortStatus =
  | 'Planejado'
  | 'Capturado'
  | 'Excelente'
  | 'Não aconteceu';

export type RecordingMarkerType =
  | 'momento_forte'
  | 'corte'
  | 'nota'
  | 'estender'
  | 'erro';

export type ScriptItemType =
  | 'cold_open'
  | 'opening'
  | 'vinheta'
  | 'transition'
  | 'question'
  | 'reaction'
  | 'closing'
  | 'b_roll_insert';

export type TechnicalChecklistItemLabel = string;

// Json type from Supabase (we re-export it for convenience)
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Table row types (camelCase properties)

// Programs table
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
  
  // Additional fields for Supabase programs table mapping
  defaultEpisodeDurationMinutes?: number;
  defaultPresenterName?: string;
  defaultSegments?: Json;
  standardSegments?: Json;
  targetAudience?: string | null;
  tone?: string | null;
}

// Cameras table
export interface CameraConfig {
  id: string;
  name: string;
  label: string;
  purpose: string;
  framing: string;
  active: boolean;
}

// Participants table (Guests)
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

  // Episodes table
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
    // Related tables (joined via Supabase)
    segments?: Segment[];
    questions?: Question[];
    question_follow_ups?: FollowUp[];
    script_items?: ScriptItem[];
    assets?: ProductionAsset[];
    shorts?: PlannedShort[];
    recordingMarkers?: RecordingMarker[];
    versions?: ScriptVersion[];
    // Backward compatibility properties (not stored in database)
    guest_name?: string;
    guest_id?: string;
  }

// Additional types needed for Episode
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
  version?: number;
  changed_by?: string;
  change_summary?: string;
  created_at?: string;
}

export interface DatabaseState {
  programs: Program[];
  episodes: Episode[];
  guests: Guest[];
}