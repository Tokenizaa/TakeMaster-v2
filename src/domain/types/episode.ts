/**
 * Episode Domain Types — Strict Internal Types
 * 
 * Extends Shared Kernel types with stricter definitions for internal use.
 * Components should NOT import from here — use contracts.ts via types/index.ts
 */

import type {
  Episode,
  EpisodeStatus,
  ShowFormat,
  CameraConfig,
  AssetType,
  AssetStatus,
  EditorialDiagnosis,
  ResearchData,
  ResearchSource,
  OutlineBlock,
  Segment,
  QuestionItem,
  FollowUpItem,
  ScriptItem,
  ScriptItemType,
  PlannedShort,
  PlannedShortStatus,
  ProductionAsset,
  ProductionMaterial,
  RecordingMarker,
  RecordingMarkerType,
  TechnicalChecklistItem,
  TechnicalChecklist,
  ChecklistItem,
  ScriptVersion,
  EpisodeParticipant,
} from '../contracts';

// Re-export shared kernel types for internal use
export type {
  Episode,
  EpisodeStatus,
  ShowFormat,
  CameraConfig,
  AssetType,
  AssetStatus,
  EditorialDiagnosis,
  ResearchData,
  ResearchSource,
  OutlineBlock,
  Segment,
  QuestionItem,
  FollowUpItem,
  ScriptItem,
  ScriptItemType,
  PlannedShort,
  PlannedShortStatus,
  ProductionAsset,
  ProductionMaterial,
  RecordingMarker,
  RecordingMarkerType,
  TechnicalChecklistItem,
  TechnicalChecklist,
  ChecklistItem,
  ScriptVersion,
  EpisodeParticipant,
};

// Re-export from talent (avoid duplicate)
export type { StrictGuest, StrictEpisodeParticipant } from './talent';
// Re-export from media
export type { StrictProductionAsset } from './media';
// Re-export from technical
export type { StrictTechnicalChecklistItem } from './technical';

// ============================================
// INTERNAL EXTENSIONS (stricter versions)
// ============================================

// Strict Episode without index signature
export interface StrictEpisode extends Omit<Episode, '[key: string]'> {
  // All properties explicitly defined
  participants: EpisodeParticipant[];  // required, not optional
}

// Strict OutlineBlock without index signature
export interface StrictOutlineBlock extends Omit<OutlineBlock, '[key: string]'> {}

// Strict ScriptItem without index signature
export interface StrictScriptItem extends Omit<ScriptItem, '[key: string]'> {}

// Strict PlannedShort without index signature
export interface StrictPlannedShort extends Omit<PlannedShort, '[key: string]'> {}

// Strict types are re-exported from their respective domains:
// - StrictGuest, StrictEpisodeParticipant from ./talent
// - StrictProductionAsset from ./media
// - StrictTechnicalChecklistItem from ./technical

// ============================================
// VIEW MODELS (used by production, scheduling)
// ============================================

export interface EpisodeSummary {
  id: string;
  episodeNumber: number;
  title: string;
  status: string;
  scheduledDate?: string;
  recordedDate?: string;
}

export interface ScheduleEventSummary {
  id: string;
  title: string;
  type: string;
  status: string;
  scheduledStart: string;
  scheduledEnd: string;
}

// ============================================
// DTOs for AI API (Content Intelligence)
// ============================================

export interface EpisodeAIDTO {
  showId: string;
  showFormat: ShowFormat;
  showEditorialStyle: string;
  episodeIdea: string;
  guestName: string;
  guestBio?: string;
  targetDurationMin: number;
  existingOutline?: OutlineBlock[];
  existingResearch?: ResearchData;
}

export interface AIJobRequest<T = EpisodeAIDTO> {
  dto: T;
  options?: AIOptions;
}

export interface AIOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  fallbackEnabled?: boolean;
}

export interface AIJobResponse {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  estimatedDurationMs?: number;
}

import type { AIValidationMeta } from '../aiContracts';

export interface AIJobResult<T = unknown> {
  jobId: string;
  status: 'completed' | 'failed' | 'processing';
  result?: T;
  error?: string;
  meta?: AIValidationMeta;
}