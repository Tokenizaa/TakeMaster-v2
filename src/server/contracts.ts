import { AppError } from './errors';

export type RecordInput = Record<string, unknown>;

function object(value: unknown, name: string): RecordInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new AppError(`${name} deve ser um objeto`, 'INVALID_REQUEST', 400);
  }
  return value as RecordInput;
}

function stringField(input: RecordInput, key: string, required = true): string | undefined {
  const value = input[key];
  if (value === undefined || value === null || value === '') {
    if (required) throw new AppError(`Campo obrigatório: ${key}`, 'VALIDATION_ERROR', 422);
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new AppError(`Campo inválido: ${key}`, 'VALIDATION_ERROR', 422);
  }
  return value.trim();
}

function numberField(input: RecordInput, key: string, required = true): number | undefined {
  const value = input[key];
  if (value === undefined || value === null) {
    if (required) throw new AppError(`Campo obrigatório: ${key}`, 'VALIDATION_ERROR', 422);
    return undefined;
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new AppError(`Campo inválido: ${key}`, 'VALIDATION_ERROR', 422);
  }
  return value;
}

export function validateShowInput(value: unknown, partial = false): RecordInput {
  const input = object(value, 'show');
  stringField(input, 'title', !partial);
  stringField(input, 'description', !partial);
  stringField(input, 'host', !partial);
  stringField(input, 'format', !partial);
  numberField(input, 'defaultDurationMin', !partial);
  return input;
}

export function validateEpisodeInput(value: unknown, partial = false): RecordInput {
  const input = object(value, 'episode');
  stringField(input, 'showId', !partial);
  stringField(input, 'title', !partial);
  stringField(input, 'idea', !partial);
  stringField(input, 'guestName', !partial);
  stringField(input, 'host', !partial);
  stringField(input, 'format', !partial);
  stringField(input, 'status', !partial);
  numberField(input, 'episodeNumber', !partial);
  numberField(input, 'targetDurationMin', !partial);
  return input;
}

export function validateGuestInput(value: unknown, partial = false): RecordInput {
  const input = object(value, 'guest');
  stringField(input, 'name', !partial);
  stringField(input, 'role', !partial);
  stringField(input, 'company', !partial);
  return input;
}
