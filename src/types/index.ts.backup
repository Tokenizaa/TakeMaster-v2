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

export interface CameraConfig {
  id: string;
  name: string;
  label: string;
  purpose: string;
  framing: string;
  active: boolean;
}

export interface Show {
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
  showId: string;
  episodeNumber: number;
  title: string;
  idea: string;
  guestName: string;
  guestId?: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface DatabaseState {
  shows: Show[];
  episodes: Episode[];
  guests: Guest[];
}
