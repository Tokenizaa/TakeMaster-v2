import { expect, test } from '@playwright/test';

/**
 * TakeMaster V2 — first replacement E2E certification layer.
 *
 * Safety contract:
 * - Targets only E2E_BASE_URL supplied by the environment.
 * - No localhost fallback and no local server auto-start.
 * - No persistent writes, registrations, subscription changes, or payment attempts.
 * - API cases are read-only or intentionally unauthenticated negative checks.
 *
 * Stable IDs are included in test titles so CI output and evidence can be traced.
 */
const baseURL = process.env.E2E_BASE_URL?.trim();

test.beforeEach(async ({}, testInfo) => {
  test.skip(!baseURL, 'E2E_BASE_URL must point to the explicitly configured test target.');
  testInfo.annotations.push({ type: 'suite', description: 'TakeMaster V2 replacement E2E' });
});

test.describe('PLATFORM-HEALTH — availability and public boundary', () => {
  test('PLATFORM-001 health endpoint returns a healthy response', async ({ request }) => {
    const response = await request.get('/health');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(typeof body.timestamp).toBe('string');
  });

  test('PLATFORM-002 health endpoint returns JSON', async ({ request }) => {
    const response = await request.get('/health');
    expect(response.headers()['content-type']).toContain('application/json');
  });
});

test.describe('AUTH — unauthenticated access and invalid credentials', () => {
  test('AUTH-001 session endpoint rejects a missing bearer token', async ({ request }) => {
    const response = await request.post('/api/auth/session', { data: {} });
    expect(response.status()).toBe(401);
    expect(await response.json()).toMatchObject({ code: 'UNAUTHORIZED' });
  });

  test('AUTH-002 organization switching rejects a missing bearer token', async ({ request }) => {
    const response = await request.post('/api/auth/switch-org', { data: { organizationId: 'org-invalid-test' } });
    expect(response.status()).toBe(401);
    expect(await response.json()).toMatchObject({ code: 'UNAUTHORIZED' });
  });

  test('AUTH-003 organization switching rejects a missing organization ID', async ({ request }) => {
    const response = await request.post('/api/auth/switch-org', {
      headers: { authorization: 'Bearer invalid-test-token' },
      data: {},
    });
    expect([400, 401]).toContain(response.status());
  });

  test('AUTH-004 login rejects an empty credential payload without exposing internals', async ({ request }) => {
    const response = await request.post('/api/auth/login', { data: {} });
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);
    const body = await response.json();
    expect(body).toHaveProperty('code');
    expect(JSON.stringify(body)).not.toMatch(/stack|secret|service.role.key/i);
  });
});

test.describe('AUTHZ — protected domain endpoints reject anonymous access', () => {
  const protectedReadEndpoints = [
    ['/api/shows', 'shows'],
    ['/api/episodes', 'episodes'],
    ['/api/productions', 'productions'],
    ['/api/guests', 'guests'],
    ['/api/schedule', 'schedule'],
    ['/api/library', 'library'],
    ['/api/billing/overview', 'billing'],
    ['/api/admin/overview', 'admin'],
    ['/api/knowledge-base', 'knowledge-base'],
  ] as const;

  for (const [path, id] of protectedReadEndpoints) {
    test(`AUTHZ-${id.toUpperCase()}-001 ${path} rejects anonymous access`, async ({ request }) => {
      const response = await request.get(path);
      expect([401, 403]).toContain(response.status());
    });
  }
});

test.describe('BILLING / VenoPag — safety boundaries', () => {
  test('VENOPAG-001 billing overview rejects anonymous access', async ({ request }) => {
    const response = await request.get('/api/billing/overview');
    expect([401, 403]).toContain(response.status());
  });

  test('VENOPAG-002 subscription mutation rejects anonymous access without creating a subscription', async ({ request }) => {
    const response = await request.post('/api/billing/subscribe', {
      data: { planId: 'e2e-no-write', paymentMethodType: 'mock' },
    });
    expect([401, 403]).toContain(response.status());
  });

  test('VENOPAG-003 auto-renew mutation rejects anonymous access', async ({ request }) => {
    const response = await request.post('/api/billing/subscriptions/e2e-no-write/auto-renew', {
      data: { autoRenew: false },
    });
    expect([401, 403]).toContain(response.status());
  });

  test('VENOPAG-004 renewal mutation rejects anonymous access', async ({ request }) => {
    const response = await request.post('/api/billing/subscriptions/e2e-no-write/renew-now', {
      data: { simulateFailure: true },
    });
    expect([401, 403]).toContain(response.status());
  });
});

test.describe('ADMIN — authorization boundary', () => {
  test('ADMIN-GLOBAL-001 admin overview rejects anonymous access', async ({ request }) => {
    const response = await request.get('/api/admin/overview');
    expect([401, 403]).toContain(response.status());
  });

  test('ADMIN-GLOBAL-002 user creation rejects anonymous access', async ({ request }) => {
    const response = await request.post('/api/admin/users', {
      data: { name: 'E2E Must Not Persist', email: 'e2e-no-write@example.invalid', role: 'viewer' },
    });
    expect([401, 403]).toContain(response.status());
  });
});

test.describe('AI — authorization and request validation boundary', () => {
  test('AI-001 AI endpoints do not allow anonymous generation', async ({ request }) => {
    const response = await request.post('/api/ai/generate', { data: {} });
    expect([400, 401, 403, 404, 405]).toContain(response.status());
  });
});

test.describe('UI — configured deployment smoke', () => {
  test('UI-001 application entrypoint responds successfully', async ({ page }) => {
    const response = await page.goto('/');
    expect(response, 'The configured E2E target must serve the application entrypoint').not.toBeNull();
    expect(response!.status()).toBeLessThan(400);
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('UI-002 app shell renders without a browser page error', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    expect(pageErrors).toEqual([]);
  });
});
