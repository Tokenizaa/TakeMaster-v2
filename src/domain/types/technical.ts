/**
 * Technical Production Domain Types — Strict Internal Types
 */

import type {
  CameraConfig,
  TechnicalChecklistItem,
  TechnicalChecklist,
  RecordingMarker,
  RecordingMarkerType,
} from '../contracts';

export type { CameraConfig, TechnicalChecklistItem, TechnicalChecklist, RecordingMarker, RecordingMarkerType };

// ============================================
// STRICT VERSIONS
// ============================================

export interface StrictTechnicalChecklistItem {
  id: string;
  label: string;
  done: boolean;
  category: ChecklistCategory;
  assignedTo?: string;
  notes?: string;
  critical: boolean;
}

export type ChecklistCategory =
  | 'camera'
  | 'audio'
  | 'lighting'
  | 'media'
  | 'power'
  | 'communication'
  | 'safety'
  | 'custom';

export interface StrictTechnicalChecklist {
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
  customItems: StrictTechnicalChecklistItem[];
  
  allCriticalPassed: boolean;
  completionPercentage: number;
  failedCriticalItems: string[];
}

export interface StrictRecordingMarker {
  id: string;
  timestampSec: number;
  formattedTime: string;
  type: RecordingMarkerType;
  blockTitle: string;
  referenceText: string;
  comment?: string;
  cameraId?: string;
  audioLevel?: number;
  timecode?: string;
}

// ============================================
// EXTENSIONS (for technical production domain)
// ============================================

export interface TechnicalCameraConfig extends CameraConfig {
  resolution?: string;
  frameRate?: number;
  codec?: string;
  bitrate?: number;
  audioChannels?: number;
  timecodeSource?: 'internal' | 'external' | 'ltc' | 'vitc';
  genlock?: boolean;
  tallyLight?: boolean;
  position?: CameraPosition;
  lens?: LensConfig;
}

export interface CameraPosition {
  x: number;
  y: number;
  z: number;
  pan: number;
  tilt: number;
  roll: number;
  height: number;
}

export interface LensConfig {
  focalLength: number;
  aperture: number;
  focusMode: 'auto' | 'manual' | 'push_auto';
  zoomRange?: [number, number];
}

export interface TechnicalResource {
  id: string;
  type: ResourceType;
  name: string;
  model?: string;
  serialNumber?: string;
  status: ResourceStatus;
  location?: string;
  assignedTo?: string;
  lastMaintenance?: string;
  nextMaintenance?: string;
  specifications?: Record<string, unknown>;
}

export type ResourceType =
  | 'camera'
  | 'lens'
  | 'microphone'
  | 'light'
  | 'monitor'
  | 'recorder'
  | 'switcher'
  | 'intercom'
  | 'teleprompter'
  | 'battery'
  | 'media_card'
  | 'cable'
  | 'stand'
  | 'other';

export type ResourceStatus =
  | 'available'
  | 'in_use'
  | 'maintenance'
  | 'repair'
  | 'retired'
  | 'lost';

export interface RecordingSession {
  id: string;
  episodeId: string;
  startTime: string;
  endTime?: string;
  status: 'preparing' | 'recording' | 'paused' | 'completed' | 'aborted';
  cameras: RecordingCameraStatus[];
  audio: RecordingAudioStatus;
  storage: RecordingStorageStatus;
  markers: StrictRecordingMarker[];
  issues: TechnicalIssue[];
}

export interface RecordingCameraStatus {
  cameraId: string;
  config: TechnicalCameraConfig;
  recording: boolean;
  timecode: string;
  diskSpaceRemaining: number;
  batteryLevel?: number;
  temperature?: number;
  error?: string;
}

export interface RecordingAudioStatus {
  hostMic: boolean;
  guestMic: boolean;
  ambientMic?: boolean;
  levels: AudioLevels;
  monitoring: boolean;
  error?: string;
}

export interface AudioLevels {
  host: number;
  guest: number;
  ambient?: number;
  master: number;
}

export interface RecordingStorageStatus {
  totalSpace: number;
  usedSpace: number;
  remainingSpace: number;
  estimatedTimeRemaining: number;
  cards: MediaCardStatus[];
}

export interface MediaCardStatus {
  id: string;
  cameraId: string;
  capacity: number;
  used: number;
  remaining: number;
  writeSpeed: number;
  health: 'good' | 'warning' | 'critical';
}

export interface TechnicalIssue {
  id: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'critical';
  category: ChecklistCategory;
  description: string;
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
  relatedCameraId?: string;
}