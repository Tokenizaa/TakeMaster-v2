import {
  ApiErrorCode,
  CatalogStatus,
  Episode,
  EpisodeStatus,
  Guest,
  LibraryAsset,
  Production,
  ProductionStatus,
  ScheduleEvent,
  ScheduleEventStatus,
  ScheduleEventType,
  Show,
  ShowFormat,
} from './contracts';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ApiErrorCode;
  public readonly details?: string[];

  constructor(
    statusCode: number,
    code: ApiErrorCode,
    message: string,
    details?: string[]
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

const VALID_SHOW_FORMATS: ShowFormat[] = [
  'Entrevista',
  'Programa Solo',
  'Mesa Redonda',
  'Podcast/Videocast',
  'Debate',
  'Reportagem',
  'Especial',
  'Outro',
];

const VALID_EPISODE_STATUSES: EpisodeStatus[] = [
  'draft',
  'diagnosis',
  'research',
  'outline',
  'scripting',
  'ready',
  'recording',
  'recorded',
  'editing',
  'published',
];

const VALID_CATALOG_STATUSES: CatalogStatus[] = [
  'development',
  'active',
  'hiatus',
  'archived',
];

const VALID_PRODUCTION_STATUSES: ProductionStatus[] = [
  'planning',
  'pre_production',
  'in_production',
  'post_production',
  'completed',
];

const VALID_SCHEDULE_TYPES: ScheduleEventType[] = [
  'pre_interview',
  'briefing',
  'rehearsal',
  'recording',
  'editing',
  'review',
  'release',
];

const VALID_SCHEDULE_STATUSES: ScheduleEventStatus[] = [
  'scheduled',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
];

export function validateShowPayload(input: any, isUpdate = false): Partial<Show> {
  const errors: string[] = [];
  if (!input || typeof input !== 'object') {
    throw new AppError(400, 'VALIDATION_ERROR', 'Payload de programa inválido.');
  }

  if (!isUpdate || input.title !== undefined) {
    if (typeof input.title !== 'string' || input.title.trim().length < 2) {
      errors.push('O título do programa deve ter pelo menos 2 caracteres.');
    } else if (input.title.trim().length > 160) {
      errors.push('O título do programa não pode exceder 160 caracteres.');
    }
  }

  if (input.format !== undefined && !VALID_SHOW_FORMATS.includes(input.format)) {
    errors.push(`Formato de programa inválido: ${input.format}.`);
  }

  if (input.defaultDurationMin !== undefined) {
    const dur = Number(input.defaultDurationMin);
    if (!Number.isFinite(dur) || dur < 5 || dur > 360) {
      errors.push('A duração padrão do programa deve estar entre 5 e 360 minutos.');
    }
  }

  if (input.catalogStatus !== undefined && !VALID_CATALOG_STATUSES.includes(input.catalogStatus)) {
    errors.push(`Status de catálogo inválido: ${input.catalogStatus}.`);
  }

  if (errors.length > 0) {
    throw new AppError(400, 'VALIDATION_ERROR', errors[0], errors);
  }

  return {
    ...input,
    title: input.title !== undefined ? String(input.title).trim() : undefined,
    description: input.description !== undefined ? String(input.description) : undefined,
    host: input.host !== undefined ? String(input.host).trim() : undefined,
    format: input.format,
    defaultDurationMin:
      input.defaultDurationMin !== undefined ? Number(input.defaultDurationMin) : undefined,
    editorialStyle: input.editorialStyle !== undefined ? String(input.editorialStyle) : undefined,
    scenario: input.scenario !== undefined ? String(input.scenario) : undefined,
    catalogStatus: input.catalogStatus,
    category: input.category !== undefined ? String(input.category).trim() : undefined,
    targetAudience:
      input.targetAudience !== undefined ? String(input.targetAudience).trim() : undefined,
    distributionChannels: Array.isArray(input.distributionChannels)
      ? input.distributionChannels.map(String)
      : undefined,
  };
}

export function validateProductionPayload(
  input: any,
  isUpdate = false
): Partial<Production> {
  const errors: string[] = [];
  if (!input || typeof input !== 'object') {
    throw new AppError(400, 'VALIDATION_ERROR', 'Payload de produção/temporada inválido.');
  }

  if (!isUpdate || input.title !== undefined) {
    if (typeof input.title !== 'string' || input.title.trim().length < 2) {
      errors.push('O título da produção/temporada deve ter pelo menos 2 caracteres.');
    }
  }

  if (!isUpdate && (!input.showId || typeof input.showId !== 'string')) {
    errors.push('O vínculo com o programa (showId) é obrigatório para criar uma produção.');
  }

  if (input.status !== undefined && !VALID_PRODUCTION_STATUSES.includes(input.status)) {
    errors.push(`Status de produção inválido: ${input.status}.`);
  }

  if (errors.length > 0) {
    throw new AppError(400, 'VALIDATION_ERROR', errors[0], errors);
  }

  return {
    ...input,
    title: input.title !== undefined ? String(input.title).trim() : undefined,
    seasonNumber: input.seasonNumber !== undefined ? Number(input.seasonNumber) : undefined,
    targetEpisodesCount:
      input.targetEpisodesCount !== undefined ? Number(input.targetEpisodesCount) : undefined,
    executiveProducer:
      input.executiveProducer !== undefined ? String(input.executiveProducer).trim() : undefined,
    notes: input.notes !== undefined ? String(input.notes) : undefined,
  };
}

export function validateParticipantPayload(
  input: any,
  isUpdate = false
): Partial<Guest> {
  const errors: string[] = [];
  if (!input || typeof input !== 'object') {
    throw new AppError(400, 'VALIDATION_ERROR', 'Payload de convidado/participante inválido.');
  }

  if (!isUpdate || input.name !== undefined) {
    if (typeof input.name !== 'string' || input.name.trim().length < 2) {
      errors.push('O nome do participante/convidado deve ter pelo menos 2 caracteres.');
    }
  }

  if (errors.length > 0) {
    throw new AppError(400, 'VALIDATION_ERROR', errors[0], errors);
  }

  return {
    ...input,
    name: input.name !== undefined ? String(input.name).trim() : undefined,
    role: input.role !== undefined ? String(input.role).trim() : undefined,
    company: input.company !== undefined ? String(input.company).trim() : undefined,
    bio: input.bio !== undefined ? String(input.bio) : undefined,
    contacts: input.contacts !== undefined ? String(input.contacts) : undefined,
    notes: input.notes !== undefined ? String(input.notes) : undefined,
    links: Array.isArray(input.links) ? input.links.map(String) : undefined,
  };
}

export function validateEpisodePayload(
  input: any,
  isUpdate = false
): Partial<Episode> {
  const errors: string[] = [];
  if (!input || typeof input !== 'object') {
    throw new AppError(400, 'VALIDATION_ERROR', 'Payload de episódio inválido.');
  }

  if (!isUpdate || input.title !== undefined) {
    if (typeof input.title !== 'string' || input.title.trim().length < 2) {
      errors.push('O título do episódio deve ter pelo menos 2 caracteres.');
    }
  }

  if (!isUpdate && (!input.showId || typeof input.showId !== 'string')) {
    errors.push('O episódio deve pertencer a um programa válido (showId obrigatório).');
  }

  if (input.status !== undefined && !VALID_EPISODE_STATUSES.includes(input.status)) {
    errors.push(`Status de episódio inválido: ${input.status}.`);
  }

  if (input.targetDurationMin !== undefined) {
    const dur = Number(input.targetDurationMin);
    if (!Number.isFinite(dur) || dur < 5 || dur > 360) {
      errors.push('A duração alvo do episódio deve estar entre 5 e 360 minutos.');
    }
  }

  if (errors.length > 0) {
    throw new AppError(400, 'VALIDATION_ERROR', errors[0], errors);
  }

  return {
    ...input,
    title: input.title !== undefined ? String(input.title).trim() : undefined,
    targetDurationMin:
      input.targetDurationMin !== undefined ? Number(input.targetDurationMin) : undefined,
  };
}

export function validateScheduleEventPayload(
  input: any,
  isUpdate = false
): Partial<ScheduleEvent> {
  const errors: string[] = [];
  if (!input || typeof input !== 'object') {
    throw new AppError(400, 'VALIDATION_ERROR', 'Payload de evento de agenda inválido.');
  }

  if (!isUpdate || input.title !== undefined) {
    if (typeof input.title !== 'string' || input.title.trim().length < 2) {
      errors.push('O título do compromisso na agenda deve ter pelo menos 2 caracteres.');
    }
  }

  if (!isUpdate && (!input.showId || typeof input.showId !== 'string')) {
    errors.push('O compromisso na agenda deve estar vinculado a um programa (showId).');
  }

  if (input.type !== undefined && !VALID_SCHEDULE_TYPES.includes(input.type)) {
    errors.push(`Tipo de evento de agenda inválido: ${input.type}.`);
  }

  if (input.status !== undefined && !VALID_SCHEDULE_STATUSES.includes(input.status)) {
    errors.push(`Status de evento de agenda inválido: ${input.status}.`);
  }

  if (errors.length > 0) {
    throw new AppError(400, 'VALIDATION_ERROR', errors[0], errors);
  }

  return {
    ...input,
    title: input.title !== undefined ? String(input.title).trim() : undefined,
    studioLocation:
      input.studioLocation !== undefined ? String(input.studioLocation).trim() : undefined,
    assignedTeam: Array.isArray(input.assignedTeam)
      ? input.assignedTeam.map(String)
      : undefined,
  };
}

export function validateLibraryAssetPayload(
  input: any,
  isUpdate = false
): Partial<LibraryAsset> {
  const errors: string[] = [];
  if (!input || typeof input !== 'object') {
    throw new AppError(400, 'VALIDATION_ERROR', 'Payload de asset da biblioteca inválido.');
  }

  if (!isUpdate || input.title !== undefined) {
    if (typeof input.title !== 'string' || input.title.trim().length < 2) {
      errors.push('O título do material/asset deve ter pelo menos 2 caracteres.');
    }
  }

  if (errors.length > 0) {
    throw new AppError(400, 'VALIDATION_ERROR', errors[0], errors);
  }

  return {
    ...input,
    title: input.title !== undefined ? String(input.title).trim() : undefined,
    description: input.description !== undefined ? String(input.description) : undefined,
    moment: input.moment !== undefined ? String(input.moment) : undefined,
    reusable: input.reusable !== undefined ? Boolean(input.reusable) : undefined,
    tags: Array.isArray(input.tags) ? input.tags.map(String) : undefined,
  };
}
