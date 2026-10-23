/**
 * Media Library Domain Types — Strict Internal Types
 */

import type {
  AssetType,
  AssetStatus,
  ProductionAsset,
  ProductionMaterial,
  LibraryAsset,
} from '../contracts';

export type { AssetType, AssetStatus, ProductionAsset, ProductionMaterial, LibraryAsset };

// ============================================
// STRICT VERSIONS
// ============================================

export interface StrictProductionAsset {
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

export type StrictProductionMaterial = StrictProductionAsset;

export interface StrictLibraryAsset extends StrictProductionAsset {
  organizationId: string;
  showId?: string;
  episodeId?: string;
  episodeTitle?: string;
  createdAt: string;
  updatedAt: string;
  license?: LicenseInfo;
  version?: number;
  previousVersions?: LibraryAssetVersion[];
}

export interface LicenseInfo {
  type: 'royalty_free' | 'licensed' | 'custom' | 'public_domain' | 'cc_by' | 'cc_by_sa' | 'cc0';
  holder?: string;
  expiresAt?: string;
  restrictions?: string[];
  sourceUrl?: string;
}

export interface LibraryAssetVersion {
  version: number;
  fileUrl: string;
  updatedAt: string;
  updatedBy: string;
  changelog?: string;
}

// ============================================
// SEARCH & FILTER
// ============================================

export interface LibraryAssetFilters {
  types?: AssetType[];
  statuses?: AssetStatus[];
  tags?: string[];
  showId?: string;
  organizationId?: string;
  reusable?: boolean;
  dateFrom?: string;
  dateTo?: string;
  searchQuery?: string;
}

export interface LibraryAssetSort {
  field: 'createdAt' | 'updatedAt' | 'title' | 'type' | 'status';
  direction: 'asc' | 'desc';
}

// ============================================
// VIEW MODELS
// ============================================

export interface LibraryAssetListItem {
  id: string;
  title: string;
  type: AssetType;
  status: AssetStatus;
  tags: string[];
  thumbnailUrl?: string;
  showTitle?: string;
  episodeTitle?: string;
  reusable: boolean;
  updatedAt: string;
}

export interface LibraryAssetDetail extends StrictLibraryAsset {
  usages: AssetUsage[];
}

export interface AssetUsage {
  episodeId: string;
  episodeTitle: string;
  episodeNumber: number;
  blockId?: string;
  moment: string;
}