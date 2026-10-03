import type { Episode, EpisodeStatus, ShowFormat } from '../../types/domain';

// Define the enums for validation
const VALID_FORMATS: ShowFormat[] = [
  'Entrevista',
  'Programa Solo',
  'Mesa Redonda',
  'Podcast/Videocast',
  'Debate',
  'Reportagem',
  'Especial',
  'Outro'
];

const VALID_STATUSES: EpisodeStatus[] = [
  'draft',
  'diagnosis',
  'research',
  'outline',
  'scripting',
  'ready',
  'recording',
  'recorded',
  'editing',
  'published'
];

export interface ValidationError {
  field: string;
  message: string;
}

export function validateEpisodeData(episode: Partial<Episode>, isUpdate: boolean = false): ValidationError[] {
  const errors: ValidationError[] = [];

  // Required fields (for create, all required; for update, only if present)
  const requiredFields = ['title', 'idea', 'host', 'format', 'status'];
  for (const field of requiredFields) {
    if (!isUpdate || (isUpdate && episode[field] !== undefined)) {
      const value = episode[field as keyof Partial<Episode>];
      if (value === undefined || value === null || value === '') {
        errors.push({ field, message: `${field} is required` });
      }
    }
  }

  // Validate format
  if (episode.format !== undefined && episode.format !== null) {
    if (!VALID_FORMATS.includes(episode.format as ShowFormat)) {
      errors.push({ field: 'format', message: `Invalid format. Must be one of: ${VALID_FORMATS.join(', ')}` });
    }
  }

  // Validate status
  if (episode.status !== undefined && episode.status !== null) {
    if (!VALID_STATUSES.includes(episode.status as EpisodeStatus)) {
      errors.push({ field: 'status', message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
    }
  }

  // Validate non-negative numbers
  const nonNegativeFields = ['episode_number', 'target_duration_min', 'target_duration_minutes', 'recording_time_elapsed', 'version'];
  for (const field of nonNegativeFields) {
    if (episode[field as keyof Partial<Episode>] !== undefined && episode[field as keyof Partial<Episode>] !== null) {
      const value = episode[field as keyof Partial<Episode>];
      if (typeof value === 'number' && value < 0) {
        errors.push({ field, message: `${field} must be a non-negative number` });
      }
    }
  }

  // Validate JSONB fields structure
  if (episode.diagnosis !== undefined && episode.diagnosis !== null) {
    if (typeof episode.diagnosis !== 'object' || Array.isArray(episode.diagnosis)) {
      errors.push({ field: 'diagnosis', message: 'diagnosis must be an object' });
    }
  }

  if (episode.research !== undefined && episode.research !== null) {
    if (typeof episode.research !== 'object' || Array.isArray(episode.research)) {
      errors.push({ field: 'research', message: 'research must be an object' });
    }
  }

  if (episode.technical_checklist !== undefined && episode.technical_checklist !== null) {
    if (typeof episode.technical_checklist !== 'object' || Array.isArray(episode.technical_checklist)) {
      errors.push({ field: 'technical_checklist', message: 'technical_checklist must be an object' });
    }
  }

  if (episode.checklist !== undefined && episode.checklist !== null) {
    if (!Array.isArray(episode.checklist)) {
      errors.push({ field: 'checklist', message: 'checklist must be an array' });
    }
  }

  // Validate string fields length (optional)
  const stringFields = ['title', 'idea', 'topic', 'synopsis', 'presenter_name', 'host', 'tone', 'objective', 'additional_info', 'editorial_notes_for_post', 'editor_script_synthesis', 'production_status'];
  for (const field of stringFields) {
    if (episode[field as keyof Partial<Episode>] !== undefined && episode[field as keyof Partial<Episode>] !== null) {
      const value = episode[field as keyof Partial<Episode>] as string;
      if (value.length > 1000) {
        errors.push({ field, message: `${field} must not exceed 1000 characters` });
      }
    }
  }

  // Validate program_id and season_id are strings (if provided)
  if (episode.program_id !== undefined && episode.program_id !== null) {
    if (typeof episode.program_id !== 'string' || episode.program_id.trim() === '') {
      errors.push({ field: 'program_id', message: 'program_id must be a non-empty string' });
    }
  }

  if (episode.season_id !== undefined && episode.season_id !== null) {
    if (typeof episode.season_id !== 'string' || episode.season_id.trim() === '') {
      errors.push({ field: 'season_id', message: 'season_id must be a non-empty string' });
    }
  }

  return errors;
}

export function validateEpisodeId(id: string): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!id || id.trim() === '') {
    errors.push({ field: 'id', message: 'Episode ID is required' });
  }
  return errors;
}