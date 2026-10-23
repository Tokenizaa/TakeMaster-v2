/**
 * Scheduling Calendar Domain Types — Strict Internal Types
 */

import type {
  ScheduleEvent,
  ScheduleEventType,
  ScheduleEventStatus,
  AgendaEvent,
  ShowFormat,
} from '../contracts';

export type { ScheduleEvent, ScheduleEventType, ScheduleEventStatus, AgendaEvent, ShowFormat };

// ============================================
// STRICT VERSIONS
// ============================================

export interface StrictScheduleEvent {
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
  
  durationMinutes?: number;
  conflicts?: ScheduleConflict[];
}

export interface ScheduleConflict {
  type: 'studio' | 'team' | 'equipment';
  conflictingEventId: string;
  conflictingEventTitle: string;
  severity: 'warning' | 'critical';
  description: string;
}

// Normalização de status (PT-BR → EN)
export function normalizeScheduleEventStatus(status: string): ScheduleEventStatus {
  const map: Record<string, ScheduleEventStatus> = {
    confirmado: 'confirmed',
    pendente: 'scheduled',
    concluido: 'completed',
  };
  return map[status] ?? (status as ScheduleEventStatus);
}

// ============================================
// CALENDAR VIEW MODELS
// ============================================

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  type: ScheduleEventType;
  status: ScheduleEventStatus;
  showId: string;
  showTitle: string;
  productionId?: string;
  episodeId?: string;
  episodeTitle?: string;
  location: string;
  team: string[];
  color: string;
  allDay: boolean;
}

export interface CalendarViewOptions {
  view: 'month' | 'week' | 'day' | 'agenda';
  date: string;
  showIds?: string[];
  productionIds?: string[];
  episodeIds?: string[];
  types?: ScheduleEventType[];
  statuses?: ScheduleEventStatus[];
}

export interface CalendarDay {
  date: string;
  events: CalendarEvent[];
  hasConflicts: boolean;
}

// ============================================
// RECURRING EVENTS
// ============================================

export interface RecurringEventRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
  interval: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  endDate?: string;
  occurrences?: number;
  exceptions?: string[];
}

// ============================================
// CONFLICT DETECTION
// ============================================

export interface ConflictCheckRequest {
  studioLocation: string;
  scheduledStart: string;
  scheduledEnd: string;
  assignedTeam: string[];
  excludeEventId?: string;
}

export interface ConflictCheckResult {
  hasConflicts: boolean;
  conflicts: ScheduleConflict[];
  suggestions: TimeSlotSuggestion[];
}

export interface TimeSlotSuggestion {
  start: string;
  end: string;
  confidence: number;
  reason: string;
}