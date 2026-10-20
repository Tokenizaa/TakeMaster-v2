import { expect, test } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL?.trim();

test.beforeEach(async ({}, testInfo) => {
  testInfo.annotations.push({ type: 'suite', description: 'TakeMaster V2 E2E replacement suite' });
  testInfo.annotations.push({ type: 'target', description: baseURL ? new URL(baseURL).origin : 'E2E_BASE_URL ausente' });
});

test.describe('PLATFORM — saúde e interface pública', () => {
  test('PLATFORM-001 endpoint de saúde responde sem fallback local', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status(), await response.text()).toBe(200);
    const body = await response.json();
    expect(['ok', 'degraded']).toContain(body.status);
    expect(body.service).toBe('rsplay-tv-takemaster-v2');
    expect(typeof body.timestamp).toBe('string');
  });

  test('PLATFORM-002 endpoint de saúde expõe estado operacional estruturado', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('database');
    expect(body).toHaveProperty('ai');
    expect(body).toHaveProperty('metrics');
  });

  test('PLATFORM-003 a entrada da aplicação carrega HTML', async ({ page }) => {
    const response = await page.goto('/');
    expect(response).not.toBeNull();
    expect(response!.status()).toBeLessThan(400);
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('PLATFORM-004 shell inicial não lança erro JavaScript de página', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    expect(errors).toEqual([]);
  });
});

test.describe('AUTH — sessão, login e troca de organização sem credenciais válidas', () => {
  test('AUTH-001 sessão não aceita ausência de bearer token', async ({ request }) => {
    const response = await request.get('/api/auth/session');
    expect(response.status()).toBe(401);
    expect((await response.json()).code).toBe('UNAUTHORIZED');
  });

  test('AUTH-002 sessão rejeita token adulterado', async ({ request }) => {
    const response = await request.get('/api/auth/session', {
      headers: { authorization: 'Bearer tmv2.invalid.invalid' },
    });
    expect(response.status()).toBe(401);
  });

  test('AUTH-003 login vazio falha com erro de credenciais e sem stack trace', async ({ request }) => {
    const response = await request.post('/api/auth/login', { data: {} });
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.code).toBe('UNAUTHORIZED');
    expect(JSON.stringify(body)).not.toMatch(/stack|service.role.key|SUPABASE_SERVICE_ROLE_KEY/i);
  });

  test('AUTH-004 login com senha ausente não cria sessão', async ({ request }) => {
    const response = await request.post('/api/auth/login', { data: { emailOrUserId: 'e2e-invalid@example.invalid' } });
    expect(response.status()).toBe(401);
    expect((await response.json()).code).toBe('UNAUTHORIZED');
  });

  test('AUTH-005 troca de organização sem autenticação é bloqueada', async ({ request }) => {
    const response = await request.post('/api/auth/switch-org', { data: { organizationId: 'org-e2e-invalid' } });
    expect(response.status()).toBe(401);
  });

  test('AUTH-006 troca de organização rejeita token inválido', async ({ request }) => {
    const response = await request.post('/api/auth/switch-org', {
      headers: { authorization: 'Bearer invalid-token' },
      data: { organizationId: 'org-e2e-invalid' },
    });
    expect(response.status()).toBe(401);
  });
});

test.describe('AUTHZ — limites anônimos para rotas protegidas', () => {
  const protectedReads = [
    ['AUTHZ-STATE-001', '/api/state'],
    ['AUTHZ-METRICS-001', '/api/metrics'],
    ['AUTHZ-SHOWS-001', '/api/shows'],
    ['AUTHZ-EPISODES-001', '/api/episodes'],
    ['AUTHZ-PRODUCTIONS-001', '/api/productions'],
    ['AUTHZ-GUESTS-001', '/api/guests'],
    ['AUTHZ-SCHEDULE-001', '/api/schedule'],
    ['AUTHZ-LIBRARY-001', '/api/library'],
    ['AUTHZ-BILLING-001', '/api/billing/overview'],
    ['AUTHZ-ADMIN-001', '/api/admin/overview'],
    ['AUTHZ-KNOWLEDGE-001', '/api/knowledge-base/shows/e2e-no-show/knowledge'],
  ] as const;

  for (const [id, path] of protectedReads) {
    test(`${id} ${path} rejeita acesso anônimo`, async ({ request }) => {
      const response = await request.get(path);
      expect(response.status(), `Rota protegida ${path} não deve permitir acesso anônimo`).toBe(401);
      const body = await response.json();
      expect(body.code).toBe('UNAUTHORIZED');
    });
  }

  const protectedMutations = [
    ['AUTHZ-SHOWS-WRITE-001', 'post', '/api/shows', { title: 'Não persistir', format: 'Entrevista' }],
    ['AUTHZ-EPISODES-WRITE-001', 'post', '/api/episodes', { title: 'Não persistir', showId: 'invalid' }],
    ['AUTHZ-PRODUCTIONS-WRITE-001', 'post', '/api/productions', { title: 'Não persistir', showId: 'invalid' }],
    ['AUTHZ-GUESTS-WRITE-001', 'post', '/api/guests', { name: 'Não persistir' }],
    ['AUTHZ-SCHEDULE-WRITE-001', 'post', '/api/schedule', { title: 'Não persistir', showId: 'invalid' }],
    ['AUTHZ-LIBRARY-WRITE-001', 'post', '/api/library', { title: 'Não persistir' }],
    ['AUTHZ-ADMIN-WRITE-001', 'post', '/api/admin/users', { name: 'Não persistir', email: 'e2e-no-write@example.invalid' }],
    ['AUTHZ-BILLING-WRITE-001', 'post', '/api/billing/subscribe', { planId: 'e2e-no-write', paymentMethodType: 'mock' }],
    ['AUTHZ-SEED-WRITE-001', 'post', '/api/seed/reset', {}],
  ] as const;

  for (const [id, method, path, data] of protectedMutations) {
    test(`${id} ${method.toUpperCase()} ${path} bloqueia antes de mutar dados`, async ({ request }) => {
      const response = await request[method](path, { data });
      expect(response.status(), `A mutação ${path} deve ser bloqueada sem autenticação`).toBe(401);
      expect((await response.json()).code).toBe('UNAUTHORIZED');
    });
  }
});

test.describe('VENOPAG — bloqueios sem autenticação; nenhuma cobrança real', () => {
  test('VENOPAG-001 assinatura bloqueia chamada anônima', async ({ request }) => {
    const response = await request.post('/api/billing/subscribe', {
      data: { planId: 'e2e-no-write', paymentMethodType: 'pix_automatico' },
    });
    expect(response.status()).toBe(401);
  });

  test('VENOPAG-002 alteração de renovação bloqueia chamada anônima', async ({ request }) => {
    const response = await request.post('/api/billing/subscriptions/e2e-no-write/auto-renew', { data: { autoRenew: false } });
    expect(response.status()).toBe(401);
  });

  test('VENOPAG-003 renovação manual bloqueia chamada anônima', async ({ request }) => {
    const response = await request.post('/api/billing/subscriptions/e2e-no-write/renew-now', { data: { simulateFailure: true } });
    expect(response.status()).toBe(401);
  });
});

test.describe('AI — fronteira de autenticação', () => {
  for (const action of ['diagnosis', 'research', 'outline', 'script', 'repiques', 'shorts', 'editor-script', 'assist']) {
    test(`AI-${action.toUpperCase()}-001 /api/ai/${action} exige sessão`, async ({ request }) => {
      const response = await request.post(`/api/ai/${action}`, { data: {} });
      expect(response.status()).toBe(401);
      expect((await response.json()).code).toBe('UNAUTHORIZED');
    });
  }
});

test.describe('ADMIN — bloqueios anônimos de gestão', () => {
  test('ADMIN-001 alteração de permissões exige sessão', async ({ request }) => {
    const response = await request.put('/api/admin/users/e2e-invalid/permissions', { data: { permissions: [] } });
    expect(response.status()).toBe(401);
  });

  test('ADMIN-002 alteração de função/estado exige sessão', async ({ request }) => {
    const response = await request.put('/api/admin/users/e2e-invalid/status', { data: { status: 'suspended' } });
    expect(response.status()).toBe(401);
  });
});
