import { createHmac } from 'node:crypto';
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
import { verifyVenoPagWebhook } from '../src/server/venopag';

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


describe('VenoPag webhook signature verification', () => {
  const envNames = ['VENOPAG_CLIENT_ID', 'VENOPAG_CLIENT_SECRET', 'VENOPAG_WEBHOOK_SECRET', 'VENOPAG_WEBHOOK_URL'] as const;
  const previous = Object.fromEntries(envNames.map((name) => [name, process.env[name]]));

  function signatureFor(body: Buffer, secret: string, timestamp: number) {
    const digest = createHmac('sha256', secret).update(`${timestamp}.`).update(body).digest('hex');
    return `t=${timestamp},v1=${digest}`;
  }

  it('accepts a valid signature for the exact raw request body', () => {
    process.env.VENOPAG_CLIENT_ID = 'test-client';
    process.env.VENOPAG_CLIENT_SECRET = 'test-secret';
    process.env.VENOPAG_WEBHOOK_SECRET = 'webhook-test-secret';
    process.env.VENOPAG_WEBHOOK_URL = 'https://example.test/api/webhooks/venopag';
    const body = Buffer.from('{"type":"cashin","status":"confirmed","request_number":"req-1"}');
    const timestamp = Math.floor(Date.now() / 1000);
    try {
      assert.equal(verifyVenoPagWebhook(signatureFor(body, process.env.VENOPAG_WEBHOOK_SECRET!, timestamp), body), true);
      assert.equal(verifyVenoPagWebhook(signatureFor(body, process.env.VENOPAG_WEBHOOK_SECRET!, timestamp), Buffer.from(body.toString() + ' ')), false);
    } finally {
      for (const name of envNames) {
        const value = previous[name];
        if (value === undefined) delete process.env[name];
        else process.env[name] = value;
      }
    }
  });

  it('rejects stale webhook timestamps', () => {
    process.env.VENOPAG_CLIENT_ID = 'test-client';
    process.env.VENOPAG_CLIENT_SECRET = 'test-secret';
    process.env.VENOPAG_WEBHOOK_SECRET = 'webhook-test-secret';
    process.env.VENOPAG_WEBHOOK_URL = 'https://example.test/api/webhooks/venopag';
    const body = Buffer.from('{"type":"cashin","status":"confirmed","request_number":"req-2"}');
    const staleTimestamp = Math.floor(Date.now() / 1000) - 600;
    try {
      assert.equal(verifyVenoPagWebhook(signatureFor(body, process.env.VENOPAG_WEBHOOK_SECRET!, staleTimestamp), body), false);
    } finally {
      for (const name of envNames) {
        const value = previous[name];
        if (value === undefined) delete process.env[name];
        else process.env[name] = value;
      }
    }
  });
});
