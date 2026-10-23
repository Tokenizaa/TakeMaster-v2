/**
 * Program Catalog Domain Types — Strict Internal Types
 * 
 * Most base types are in Shared Kernel (contracts.ts).
 * This file contains view models and extensions specific to the catalog.
 */

import type {
  Show,
  ShowFormat,
  CameraConfig,
  CatalogStatus,
} from '../contracts';
import type { EpisodeSummary, ScheduleEventSummary } from './episode';

export type { Show, ShowFormat, CameraConfig, CatalogStatus };

// ============================================
// CATALOG EXTENSIONS
// ============================================

export interface ProgramDefaultSegment {
  id: string;
  showId: string;
  name: string;
  order: number;
  estimatedDurationMin: number;
  description?: string;
  isRequired: boolean;
  defaultCameraConfig?: CameraConfig;
}

export interface ShowWithRelations extends Show {
  defaultSegments: ProgramDefaultSegment[];
  productionsCount: number;
  episodesCount: number;
  lastEpisodeDate?: string;
  activeProductionId?: string;
}

// ============================================
// FORMAT CONFIGURATIONS
// ============================================

export interface ShowFormatConfig {
  format: ShowFormat;
  label: string;
  description: string;
  defaultStructure: string[];
  defaultDurationMin: number;
  recommendedSegments: RecommendedSegment[];
  defaultCameras: CameraConfig[];
}

export interface RecommendedSegment {
  name: string;
  description: string;
  estimatedDurationMin: number;
  isRequired: boolean;
  order: number;
}

// ============================================
// VIEW MODELS
// ============================================

export interface ShowListItem {
  id: string;
  title: string;
  host: string;
  format: ShowFormat;
  catalogStatus: CatalogStatus;
  category?: string;
  defaultDurationMin: number;
  episodeCount: number;
  lastEpisodeDate?: string;
  organizationId: string;
  organizationName: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShowDetail extends ShowWithRelations {
  recentEpisodes: EpisodeSummary[];
  upcomingSchedule: ScheduleEventSummary[];
  team: ShowTeamMember[];
  assets: AssetSummary[];
}

// EpisodeSummary and ScheduleEventSummary are imported from ./episode

export interface ShowTeamMember {
  userId: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
}

export interface AssetSummary {
  id: string;
  title: string;
  type: string;
  status: string;
  reusable: boolean;
}

// ============================================
// OPERATIONS
// ============================================

export interface CreateShowInput {
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
  category?: string;
  targetAudience?: string;
  distributionChannels?: string[];
  organizationId: string;
  createdBy: string;
}

export interface UpdateShowInput {
  title?: string;
  description?: string;
  host?: string;
  format?: ShowFormat;
  defaultDurationMin?: number;
  editorialStyle?: string;
  scenario?: string;
  cameras?: CameraConfig[];
  standardStructure?: string[];
  defaultOpening?: string;
  defaultClosing?: string;
  catalogStatus?: CatalogStatus;
  category?: string;
  targetAudience?: string;
  distributionChannels?: string[];
  updatedBy: string;
}

// ============================================
// FORMAT REGISTRY
// ============================================

export const SHOW_FORMAT_CONFIGS: Record<ShowFormat, ShowFormatConfig> = {
  Entrevista: {
    format: 'Entrevista',
    label: 'Entrevista',
    description: 'Formato clássico de entrevista one-on-one',
    defaultDurationMin: 45,
    defaultStructure: ['Abertura', 'Bloco 1', 'Bloco 2', 'Encerramento'],
    recommendedSegments: [
      { name: 'Abertura', description: 'Apresentação do convidado e tema', estimatedDurationMin: 3, isRequired: true, order: 1 },
      { name: 'Bloco 1', description: 'Primeira parte da entrevista', estimatedDurationMin: 15, isRequired: true, order: 2 },
      { name: 'Bloco 2', description: 'Segunda parte / aprofundamento', estimatedDurationMin: 15, isRequired: false, order: 3 },
      { name: 'Encerramento', description: 'Despedida e call-to-action', estimatedDurationMin: 3, isRequired: true, order: 4 },
    ],
    defaultCameras: [
      { id: 'cam1', name: 'Câmera 1', label: 'Principal', purpose: 'Host + Guest wide', framing: 'Medium wide', active: true },
      { id: 'cam2', name: 'Câmera 2', label: 'Close Host', purpose: 'Host close-up', framing: 'Close up', active: true },
      { id: 'cam3', name: 'Câmera 3', label: 'Close Guest', purpose: 'Guest close-up', framing: 'Close up', active: true },
    ],
  },
  'Programa Solo': {
    format: 'Programa Solo',
    label: 'Programa Solo',
    description: 'Apresentador solo, sem convidado fixo',
    defaultDurationMin: 30,
    defaultStructure: ['Abertura', 'Desenvolvimento', 'Encerramento'],
    recommendedSegments: [
      { name: 'Abertura', description: 'Apresentação do tema do dia', estimatedDurationMin: 3, isRequired: true, order: 1 },
      { name: 'Desenvolvimento', description: 'Conteúdo principal', estimatedDurationMin: 20, isRequired: true, order: 2 },
      { name: 'Encerramento', description: 'Resumo e despedida', estimatedDurationMin: 3, isRequired: true, order: 3 },
    ],
    defaultCameras: [
      { id: 'cam1', name: 'Câmera 1', label: 'Principal', purpose: 'Host wide', framing: 'Medium', active: true },
      { id: 'cam2', name: 'Câmera 2', label: 'Close', purpose: 'Host close-up', framing: 'Close up', active: true },
    ],
  },
  'Mesa Redonda': {
    format: 'Mesa Redonda',
    label: 'Mesa Redonda',
    description: 'Múltiplos participantes debatendo um tema',
    defaultDurationMin: 60,
    defaultStructure: ['Abertura', 'Apresentação Participantes', 'Bloco 1', 'Bloco 2', 'Perguntas Público', 'Encerramento'],
    recommendedSegments: [
      { name: 'Abertura', description: 'Apresentação do tema e mediador', estimatedDurationMin: 5, isRequired: true, order: 1 },
      { name: 'Apresentação Participantes', description: 'Cada participante se apresenta', estimatedDurationMin: 10, isRequired: true, order: 2 },
      { name: 'Bloco 1', description: 'Primeira rodada de debate', estimatedDurationMin: 15, isRequired: true, order: 3 },
      { name: 'Bloco 2', description: 'Segunda rodada / aprofundamento', estimatedDurationMin: 15, isRequired: false, order: 4 },
      { name: 'Perguntas Público', description: 'Interação com público', estimatedDurationMin: 10, isRequired: false, order: 5 },
      { name: 'Encerramento', description: 'Síntese e despedida', estimatedDurationMin: 5, isRequired: true, order: 6 },
    ],
    defaultCameras: [
      { id: 'cam1', name: 'Câmera 1', label: 'Wide Mesa', purpose: 'Todos participantes', framing: 'Wide', active: true },
      { id: 'cam2', name: 'Câmera 2', label: 'Mediador', purpose: 'Mediador close', framing: 'Medium', active: true },
      { id: 'cam3', name: 'Câmera 3', label: 'Participantes', purpose: 'Participantes individuais', framing: 'Close up', active: true },
      { id: 'cam4', name: 'Câmera 4', label: 'Reação', purpose: 'Reações cruzadas', framing: 'Medium close', active: false },
    ],
  },
  'Podcast/Videocast': {
    format: 'Podcast/Videocast',
    label: 'Podcast/Videocast',
    description: 'Formato conversacional, pode ter vídeo',
    defaultDurationMin: 50,
    defaultStructure: ['Intro', 'Conversa', 'Segmento Especial', 'Outro'],
    recommendedSegments: [
      { name: 'Intro', description: 'Vinheta + apresentação', estimatedDurationMin: 2, isRequired: true, order: 1 },
      { name: 'Conversa', description: 'Entrevista/bate-papo principal', estimatedDurationMin: 35, isRequired: true, order: 2 },
      { name: 'Segmento Especial', description: 'Quadro fixo / game / rapid fire', estimatedDurationMin: 10, isRequired: false, order: 3 },
      { name: 'Outro', description: 'Encerramento + CTA', estimatedDurationMin: 3, isRequired: true, order: 4 },
    ],
    defaultCameras: [
      { id: 'cam1', name: 'Câmera 1', label: 'Wide', purpose: 'Todos participantes', framing: 'Medium wide', active: true },
      { id: 'cam2', name: 'Câmera 2', label: 'Host', purpose: 'Host close', framing: 'Close up', active: true },
      { id: 'cam3', name: 'Câmera 3', label: 'Guest', purpose: 'Guest close', framing: 'Close up', active: true },
    ],
  },
  Debate: {
    format: 'Debate',
    label: 'Debate',
    description: 'Confronto de ideias entre lados opostos',
    defaultDurationMin: 45,
    defaultStructure: ['Abertura', 'Tese A', 'Tese B', 'Réplicas', 'Tréplica', 'Encerramento'],
    recommendedSegments: [
      { name: 'Abertura', description: 'Apresentação do tema e debatedores', estimatedDurationMin: 3, isRequired: true, order: 1 },
      { name: 'Tese A', description: 'Argumentação do lado A', estimatedDurationMin: 10, isRequired: true, order: 2 },
      { name: 'Tese B', description: 'Argumentação do lado B', estimatedDurationMin: 10, isRequired: true, order: 3 },
      { name: 'Réplicas', description: 'Respostas cruzadas', estimatedDurationMin: 10, isRequired: true, order: 4 },
      { name: 'Tréplica', description: 'Considerações finais', estimatedDurationMin: 5, isRequired: true, order: 5 },
      { name: 'Encerramento', description: 'Síntese do mediador', estimatedDurationMin: 3, isRequired: true, order: 6 },
    ],
    defaultCameras: [
      { id: 'cam1', name: 'Câmera 1', label: 'Wide Debate', purpose: 'Todos', framing: 'Wide', active: true },
      { id: 'cam2', name: 'Câmera 2', label: 'Lado A', purpose: 'Debatedor A', framing: 'Close up', active: true },
      { id: 'cam3', name: 'Câmera 3', label: 'Lado B', purpose: 'Debatedor B', framing: 'Close up', active: true },
      { id: 'cam4', name: 'Câmera 4', label: 'Mediador', purpose: 'Mediador', framing: 'Medium', active: true },
    ],
  },
  Reportagem: {
    format: 'Reportagem',
    label: 'Reportagem',
    description: 'Reportagem jornalística com inserts',
    defaultDurationMin: 20,
    defaultStructure: ['Lead', 'Corpo', 'Entrevistas', 'Encerramento'],
    recommendedSegments: [
      { name: 'Lead', description: 'Abertura com gancho', estimatedDurationMin: 1, isRequired: true, order: 1 },
      { name: 'Corpo', description: 'Desenvolvimento da reportagem', estimatedDurationMin: 10, isRequired: true, order: 2 },
      { name: 'Entrevistas', description: 'Depoimentos', estimatedDurationMin: 7, isRequired: false, order: 3 },
      { name: 'Encerramento', description: 'Fechamento', estimatedDurationMin: 2, isRequired: true, order: 4 },
    ],
    defaultCameras: [
      { id: 'cam1', name: 'Câmera 1', label: 'Repórter', purpose: 'Repórter em cena', framing: 'Medium', active: true },
      { id: 'cam2', name: 'Câmera 2', label: 'B-Roll', purpose: 'Imagens de apoio', framing: 'Variado', active: true },
    ],
  },
  Especial: {
    format: 'Especial',
    label: 'Especial',
    description: 'Formato livre para programas especiais',
    defaultDurationMin: 60,
    defaultStructure: ['Personalizado'],
    recommendedSegments: [],
    defaultCameras: [
      { id: 'cam1', name: 'Câmera 1', label: 'Principal', purpose: 'Principal', framing: 'Medium', active: true },
    ],
  },
  Outro: {
    format: 'Outro',
    label: 'Outro',
    description: 'Formato não categorizado',
    defaultDurationMin: 30,
    defaultStructure: ['Personalizado'],
    recommendedSegments: [],
    defaultCameras: [
      { id: 'cam1', name: 'Câmera 1', label: 'Principal', purpose: 'Principal', framing: 'Medium', active: true },
    ],
  },
};

export function getShowFormatConfig(format: ShowFormat): ShowFormatConfig {
  return SHOW_FORMAT_CONFIGS[format] ?? SHOW_FORMAT_CONFIGS.Outro;
}