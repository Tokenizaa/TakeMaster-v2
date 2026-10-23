/**
 * Production Management Domain Types — Strict Internal Types
 */

import type {
  Production,
  ProductionStatus,
  ShowFormat,
} from '../contracts';
import type { EpisodeSummary, ScheduleEventSummary } from './episode';

export type { Production, ProductionStatus, ShowFormat };
// EpisodeSummary, ScheduleEventSummary are imported from ./episode for internal use

// ============================================
// STRICT VERSIONS
// ============================================

export interface StrictProduction {
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
// VIEW MODELS
// ============================================

export interface ProductionListItem {
  id: string;
  showId: string;
  showTitle: string;
  showFormat: ShowFormat;
  title: string;
  seasonNumber: number;
  status: ProductionStatus;
  targetEpisodesCount: number;
  episodeCount: number;
  completedEpisodesCount: number;
  progressPercentage: number;
  executiveProducer: string;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductionDetail extends StrictProduction {
  episodes: EpisodeSummary[];
  schedule: ScheduleEventSummary[];
  team: ProductionTeamMember[];
  budget?: ProductionBudget;
}

export interface ProductionTeamMember {
  userId: string;
  name: string;
  role: string;
  email: string;
  permissions: string[];
}

export interface ProductionBudget {
  totalBudgetCents: number;
  spentCents: number;
  remainingCents: number;
  currency: string;
  lineItems: BudgetLineItem[];
}

export interface BudgetLineItem {
  id: string;
  category: string;
  description: string;
  budgetedCents: number;
  actualCents: number;
  status: 'planned' | 'approved' | 'spent' | 'over_budget';
}