import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  AppError,
  validateEpisodePayload,
  validateProductionPayload,
  validateShowPayload,
} from '../src/domain/validation';

describe('TakeMaster V2 — API contract validation', () => {
  it('rejects invalid show, episode, and production payloads', () => {
    assert.throws(
      () => validateShowPayload({ title: 'A' }, false),
      (err: unknown) => err instanceof AppError && err.code === 'VALIDATION_ERROR'
    );
    assert.throws(
      () => validateEpisodePayload({ title: 'Episódio' }, false),
      (err: unknown) => err instanceof AppError && err.code === 'VALIDATION_ERROR'
    );
    assert.throws(
      () => validateProductionPayload({ title: 'Temporada', showId: 'show-1', status: 'invalid_status' }, false),
      (err: unknown) => err instanceof AppError && err.code === 'VALIDATION_ERROR'
    );
  });
});
