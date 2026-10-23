/**
 * Talent Domain Types — Strict Internal Types
 */

import type {
  Guest,
  Participant,
  ParticipantType,
  EpisodeParticipant,
  UserShowPermission,
} from '../contracts';

export type { Guest, Participant, ParticipantType, EpisodeParticipant, UserShowPermission };

// ============================================
// STRICT VERSIONS
// ============================================

export interface StrictGuest {
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

export type StrictParticipant = StrictGuest;

export type StrictParticipantType =
  | 'apresentador'
  | 'convidado'
  | 'especialista'
  | 'artista'
  | 'banda'
  | 'coro'
  | 'outro';

export interface StrictEpisodeParticipant {
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
// VIEW MODELS (for UI)
// ============================================

export interface TalentListItem {
  id: string;
  name: string;
  role: string;
  company: string;
  avatarUrl?: string;
  previousEpisodesCount: number;
  shows: string[];
  lastParticipation?: string;
}

export interface TalentDetail extends StrictGuest {
  episodes: StrictEpisodeParticipant[];
  programs: string[];
  permissions?: UserShowPermission[];
}