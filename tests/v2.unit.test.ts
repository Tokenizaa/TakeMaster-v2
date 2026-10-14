import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  AppError,
  validateEpisodePayload,
  validateProductionPayload,
  validateShowPayload,
} from '../src/domain/validation';
import { NimProviderError, withNimCredentialFailover } from '../src/server/nimCredentials';
import { getServerConfig } from '../src/server/config';

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

describe('NVIDIA NIM credential failover', () => {
  it('uses a distinct legacy NVIDIA_API_KEY as the secondary credential', () => {
    const names = ['NIM_API_KEY', 'NVIDIA_API_KEY', 'NIM_API_KEY_SECONDARY'] as const;
    const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
    process.env.NIM_API_KEY = 'primary-test-key';
    process.env.NVIDIA_API_KEY = 'secondary-test-key';
    delete process.env.NIM_API_KEY_SECONDARY;

    try {
      assert.deepEqual(getServerConfig().nimApiKeys, ['primary-test-key', 'secondary-test-key']);
    } finally {
      for (const name of names) {
        const value = previous[name];
        if (value === undefined) delete process.env[name];
        else process.env[name] = value;
      }
    }
  });

  it('tries the secondary credential only after primary authentication is rejected', async () => {
    const attempts: string[] = [];
    const result = await withNimCredentialFailover(['primary', 'secondary'], async (key) => {
      attempts.push(key);
      if (key === 'primary') throw new NimProviderError(401);
      return 'ok';
    });

    assert.equal(result, 'ok');
    assert.deepEqual(attempts, ['primary', 'secondary']);
  });

  it('does not rotate credentials on rate limits or provider errors', async () => {
    const attempts: string[] = [];
    await assert.rejects(
      withNimCredentialFailover(['primary', 'secondary'], async (key) => {
        attempts.push(key);
        throw new NimProviderError(429);
      }),
      (error: unknown) => error instanceof NimProviderError && error.status === 429
    );
    assert.deepEqual(attempts, ['primary']);
  });
});
