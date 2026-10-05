import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkDatabaseHealth,
  createEpisode,
  createProduction,
  createShow,
  deleteEpisode,
  deleteProduction,
  deleteShow,
  getEpisodeById,
  getShowById,
  listEpisodes,
  listProductions,
  listShows,
  updateEpisode,
  verifyUserOrganizationAccess,
} from '../src/server/persistence';
import { AppError, validateEpisodePayload, validateProductionPayload, validateShowPayload } from '../src/domain/validation';

const ORG = process.env.TAKE_MASTER_TEST_ORG_ID || 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

describe('TakeMaster V2 — canonical Supabase persistence', () => {
  it('connects to the canonical Supabase database', async () => {
    const health = await checkDatabaseHealth();
    assert.equal(health.connected, true);
    assert.equal(health.driver, 'supabase');
  });

  it('validates the existing API contracts', () => {
    assert.throws(() => validateShowPayload({ title: 'A' }, false), (err:any) => err instanceof AppError && err.code === 'VALIDATION_ERROR');
    assert.throws(() => validateEpisodePayload({ title: 'Episódio' }, false), (err:any) => err instanceof AppError && err.code === 'VALIDATION_ERROR');
    assert.throws(() => validateProductionPayload({ title: 'Temporada', showId:'show-1', status:'invalid_status' }, false), (err:any) => err instanceof AppError && err.code === 'VALIDATION_ERROR');
  });

  it('enforces organization isolation', async () => {
    const allowed = await verifyUserOrganizationAccess('33333333-3333-3333-3333-333333333333', ORG);
    assert.equal(allowed.organization.id, ORG);
    await assert.rejects(
      () => verifyUserOrganizationAccess('33333333-3333-3333-3333-333333333333', '1007f204-6eef-49bc-a31f-2040a4fcebcb'),
      (err:any) => err instanceof AppError && err.code === 'FORBIDDEN_CONTEXT'
    );
  });

  it('persists the program → production → episode lifecycle and removes test data', async () => {
    const suffix = Date.now();
    const show = await createShow(ORG, {
      id: `p0-check-${suffix}`,
      title: `P0 Check ${suffix}`,
      host: 'P0 validation',
      format: 'Entrevista',
      defaultDurationMin: 30,
    });
    try {
      const production = await createProduction(ORG, {
        showId: show.id,
        title: `P0 Season ${suffix}`,
        seasonNumber: 1,
        status: 'planning',
      });
      const episode = await createEpisode(ORG, {
        showId: show.id,
        productionId: production.id,
        title: `P0 Episode ${suffix}`,
        idea: 'Canonical persistence check',
        guestName: 'P0 Check',
        status: 'draft',
      });
      assert.equal((await getShowById(ORG, show.id))?.id, show.id);
      assert.equal((await listProductions(ORG, show.id)).some(x => x.id === production.id), true);
      assert.equal((await getEpisodeById(ORG, episode.id))?.id, episode.id);

      const updated = await updateEpisode(ORG, episode.id, { status: 'ready' });
      assert.equal(updated.status, 'ready');
      assert.equal((await listEpisodes(ORG, show.id)).some(x => x.id === episode.id), true);

      await deleteEpisode(ORG, episode.id);
      await deleteProduction(ORG, production.id);
    } finally {
      await deleteShow(ORG, show.id);
      assert.equal(await getShowById(ORG, show.id), undefined);
    }
  });
});
