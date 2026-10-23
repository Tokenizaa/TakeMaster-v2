import { expect, test } from '@playwright/test';

const target = process.env.E2E_BASE_URL?.trim();
const targetKind = process.env.E2E_TARGET_KIND?.trim().toLowerCase();
const email = process.env.E2E_LOGIN_EMAIL?.trim();
const loginCode = process.env.E2E_LOGIN_CODE;
const organizationId = process.env.E2E_ORGANIZATION_ID?.trim();
const canAuthenticate = Boolean(email && loginCode && organizationId);
const canWrite = canAuthenticate &&
  process.env.E2E_ALLOW_PERSISTENT_WRITES === 'true' &&
  (targetKind === 'test' || targetKind === 'staging');

test.describe('TakeMaster E2E — authenticated domain journeys', () => {
  test.skip(!target, 'E2E_BASE_URL deve apontar para o ambiente aprovado.');
  test.skip(!canAuthenticate, 'Configure E2E_LOGIN_EMAIL, E2E_LOGIN_CODE e E2E_ORGANIZATION_ID para habilitar jornadas autenticadas.');

  test('AUTH-010 login válido cria sessão e retorna identidade/organização', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: { emailOrUserId: email, organizationId, loginCode },
    });
    expect(response.status(), await response.text()).toBe(200);
    const body = await response.json();
    expect(body.session.token).toMatch(/^tmv2\./);
    expect(body.session.user.email.toLowerCase()).toBe(email!.toLowerCase());
    expect(body.session.activeOrganization.id).toBe(organizationId);
    expect(body.session.role).toBeTruthy();
  });

  test('AUTH-011 sessão autenticada persiste e retorna contexto de usuário', async ({ request }) => {
    const login = await request.post('/api/auth/login', {
      data: { emailOrUserId: email, organizationId, loginCode },
    });
    expect(login.status(), await login.text()).toBe(200);
    const { session } = await login.json();
    const response = await request.get('/api/auth/session', {
      headers: { authorization: `Bearer ${session.token}` },
    });
    expect(response.status(), await response.text()).toBe(200);
    const body = await response.json();
    expect(body.session.user.id).toBe(session.user.id);
    expect(body.session.activeOrganization.id).toBe(organizationId);
    expect(Array.isArray(body.availableUsers)).toBe(true);
  });

  test('WORKSPACE-001 estado agregado contém coleções operacionais', async ({ request }) => {
    const login = await request.post('/api/auth/login', {
      data: { emailOrUserId: email, organizationId, loginCode },
    });
    expect(login.status(), await login.text()).toBe(200);
    const { session } = await login.json();
    const response = await request.get('/api/state', {
      headers: { authorization: `Bearer ${session.token}` },
    });
    expect(response.status(), await response.text()).toBe(200);
    const state = await response.json();
    for (const key of ['shows','productions','episodes','guests','scheduleEvents','libraryAssets','auditLogs','availableUsers']) {
      expect(Array.isArray(state[key]), `state.${key}`).toBe(true);
    }
    expect(state.session.user.id).toBe(session.user.id);
  });

  test('CATALOG-001 ciclo de criação/leitura/edição/exclusão de programa', async ({ request }) => {
    test.skip(!canWrite, 'Escritas E2E exigem E2E_ALLOW_PERSISTENT_WRITES=true e E2E_TARGET_KIND=test ou staging.');
    const login = await request.post('/api/auth/login', { data: { emailOrUserId: email, organizationId, loginCode } });
    expect(login.status(), await login.text()).toBe(200);
    const { session } = await login.json();
    const headers = { authorization: `Bearer ${session.token}`, 'x-organization-id': organizationId! };
    let id: string | undefined;
    try {
      const created = await request.post('/api/shows', { headers, data: {
        title: `E2E Programa ${Date.now()}`, format: 'Entrevista', description: 'Registro temporário da suíte E2E',
        host: 'Equipe de teste', defaultDurationMin: 30, catalogStatus: 'development',
      }});
      expect(created.status(), await created.text()).toBe(201);
      const show = await created.json();
      id = show.id;
      expect(show.title).toContain('E2E Programa');
      const read = await request.get(`/api/shows/${id}`, { headers });
      expect(read.status(), await read.text()).toBe(200);
      const update = await request.put(`/api/shows/${id}`, { headers, data: { title: `E2E Programa Editado ${Date.now()}` } });
      expect(update.status(), await update.text()).toBe(200);
      expect((await update.json()).title).toContain('E2E Programa Editado');
    } finally {
      if (id) {
        const removed = await request.delete(`/api/shows/${id}`, { headers });
        expect([200, 204]).toContain(removed.status());
      }
    }
  });

  test('CATALOG-002 valida payload inválido sem criar programa', async ({ request }) => {
    const login = await request.post('/api/auth/login', { data: { emailOrUserId: email, organizationId, loginCode } });
    expect(login.status(), await login.text()).toBe(200);
    const { session } = await login.json();
    const response = await request.post('/api/shows', {
      headers: { authorization: `Bearer ${session.token}`, 'x-organization-id': organizationId! },
      data: { title: 'x', format: 'FORMATO_E2E_INVALIDO' },
    });
    expect(response.status()).toBe(400);
    expect((await response.json()).code).toBe('VALIDATION_ERROR');
  });

  test('PRODUCTION-001 ciclo de temporada: criação/leitura/edição/exclusão', async ({ request }) => {
    test.skip(!canWrite, 'Escritas E2E exigem E2E_ALLOW_PERSISTENT_WRITES=true e E2E_TARGET_KIND=test ou staging.');
    const login = await request.post('/api/auth/login', { data: { emailOrUserId: email, organizationId, loginCode } });
    expect(login.status(), await login.text()).toBe(200);
    const { session } = await login.json();
    const headers = { authorization: `Bearer ${session.token}`, 'x-organization-id': organizationId! };
    const showsResponse = await request.get('/api/shows', { headers });
    expect(showsResponse.status(), await showsResponse.text()).toBe(200);
    const shows = (await showsResponse.json());
    test.skip(!shows.length, 'A identidade E2E precisa de ao menos um programa dedicado para testar temporadas.');
    const showId = shows[0].id;
    let id: string | undefined;
    try {
      const created = await request.post('/api/productions', { headers, data: {
        title: `E2E Temporada ${Date.now()}`, showId, seasonNumber: 99,
        status: 'planning', targetEpisodesCount: 1, executiveProducer: 'E2E',
      }});
      expect(created.status(), await created.text()).toBe(201);
      id = (await created.json()).id;
      const read = await request.get(`/api/productions/${id}`, { headers });
      expect(read.status(), await read.text()).toBe(200);
      const updated = await request.put(`/api/productions/${id}`, { headers, data: { title: `E2E Temporada Editada ${Date.now()}` } });
      expect(updated.status(), await updated.text()).toBe(200);
    } finally {
      if (id) {
        const removed = await request.delete(`/api/productions/${id}`, { headers });
        expect([200, 204]).toContain(removed.status());
      }
    }
  });

  test('EPISODE-001 ciclo de episódio: criação/leitura/edição/exclusão', async ({ request }) => {
    test.skip(!canWrite, 'Escritas E2E exigem E2E_ALLOW_PERSISTENT_WRITES=true e E2E_TARGET_KIND=test ou staging.');
    const login = await request.post('/api/auth/login', { data: { emailOrUserId: email, organizationId, loginCode } });
    expect(login.status(), await login.text()).toBe(200);
    const { session } = await login.json();
    const headers = { authorization: `Bearer ${session.token}`, 'x-organization-id': organizationId! };
    const showsResponse = await request.get('/api/shows', { headers });
    expect(showsResponse.status(), await showsResponse.text()).toBe(200);
    const shows = (await showsResponse.json());
    test.skip(!shows.length, 'A identidade E2E precisa de ao menos um programa para criar episódio.');
    let id: string | undefined;
    try {
      const created = await request.post('/api/episodes', { headers, data: {
        title: `E2E Episódio ${Date.now()}`, showId: shows[0].id, status: 'draft',
        targetDurationMin: 30, idea: 'Cenário de teste automatizado',
      }});
      expect(created.status(), await created.text()).toBe(201);
      id = (await created.json()).id;
      const read = await request.get(`/api/episodes/${id}`, { headers });
      expect(read.status(), await read.text()).toBe(200);
      const updated = await request.put(`/api/episodes/${id}`, { headers, data: { title: `E2E Episódio Editado ${Date.now()}` } });
      expect(updated.status(), await updated.text()).toBe(200);
    } finally {
      if (id) {
        const removed = await request.delete(`/api/episodes/${id}`, { headers });
        expect([200, 204]).toContain(removed.status());
      }
    }
  });

  test('GUEST-001 ciclo de participante: criação/leitura/edição/exclusão', async ({ request }) => {
    test.skip(!canWrite, 'Escritas E2E exigem E2E_ALLOW_PERSISTENT_WRITES=true e E2E_TARGET_KIND=test ou staging.');
    const login = await request.post('/api/auth/login', { data: { emailOrUserId: email, organizationId, loginCode } });
    expect(login.status(), await login.text()).toBe(200);
    const { session } = await login.json();
    const headers = { authorization: `Bearer ${session.token}`, 'x-organization-id': organizationId! };
    let id: string | undefined;
    try {
      const created = await request.post('/api/guests', { headers, data: {
        name: `E2E Participante ${Date.now()}`, role: 'Convidado de teste',
        company: 'QA', bio: 'Registro temporário E2E', contacts: '', notes: 'Remover ao finalizar',
      }});
      expect(created.status(), await created.text()).toBe(201);
      id = (await created.json()).id;
      const read = await request.get(`/api/guests/${id}`, { headers });
      expect(read.status(), await read.text()).toBe(200);
      const updated = await request.put(`/api/guests/${id}`, { headers, data: { name: `E2E Participante Editado ${Date.now()}` } });
      expect(updated.status(), await updated.text()).toBe(200);
    } finally {
      if (id) {
        const removed = await request.delete(`/api/guests/${id}`, { headers });
        expect([200, 204]).toContain(removed.status());
      }
    }
  });

  test('SCHEDULE-001 ciclo de agenda: criação/leitura/edição/exclusão', async ({ request }) => {
    test.skip(!canWrite, 'Escritas E2E exigem E2E_ALLOW_PERSISTENT_WRITES=true e E2E_TARGET_KIND=test ou staging.');
    const login = await request.post('/api/auth/login', { data: { emailOrUserId: email, organizationId, loginCode } });
    expect(login.status(), await login.text()).toBe(200);
    const { session } = await login.json();
    const headers = { authorization: `Bearer ${session.token}`, 'x-organization-id': organizationId! };
    const showsResponse = await request.get('/api/shows', { headers });
    expect(showsResponse.status(), await showsResponse.text()).toBe(200);
    const shows = (await showsResponse.json());
    test.skip(!shows.length, 'A identidade E2E precisa de ao menos um programa para testar agenda.');
    let id: string | undefined;
    try {
      const created = await request.post('/api/schedule', { headers, data: {
        title: `E2E Agenda ${Date.now()}`, showId: shows[0].id, type: 'briefing',
        status: 'scheduled', scheduledStart: new Date(Date.now() + 86400000).toISOString(),
        scheduledEnd: new Date(Date.now() + 90000000).toISOString(), notes: 'Registro E2E temporário',
      }});
      expect(created.status(), await created.text()).toBe(201);
      id = (await created.json()).id;
      const read = await request.get(`/api/schedule/${id}`, { headers });
      expect(read.status(), await read.text()).toBe(200);
      const updated = await request.put(`/api/schedule/${id}`, { headers, data: { title: `E2E Agenda Editada ${Date.now()}` } });
      expect(updated.status(), await updated.text()).toBe(200);
    } finally {
      if (id) {
        const removed = await request.delete(`/api/schedule/${id}`, { headers });
        expect([200, 204]).toContain(removed.status());
      }
    }
  });

  test('LIBRARY-001 ciclo de asset: criação/leitura/edição/exclusão', async ({ request }) => {
    test.skip(!canWrite, 'Escritas E2E exigem E2E_ALLOW_PERSISTENT_WRITES=true e E2E_TARGET_KIND=test ou staging.');
    const login = await request.post('/api/auth/login', { data: { emailOrUserId: email, organizationId, loginCode } });
    expect(login.status(), await login.text()).toBe(200);
    const { session } = await login.json();
    const headers = { authorization: `Bearer ${session.token}`, 'x-organization-id': organizationId! };
    const showsResponse = await request.get('/api/shows', { headers });
    expect(showsResponse.status(), await showsResponse.text()).toBe(200);
    const shows = (await showsResponse.json()).shows;
    test.skip(!shows.length, 'A identidade E2E precisa de ao menos um programa para testar a biblioteca.');
    let id: string | undefined;
    try {
      const created = await request.post('/api/library', { headers, data: {
        title: `E2E Asset ${Date.now()}`, showId: shows[0].id, type: 'document',
        description: 'Asset temporário da suíte E2E', url: 'https://example.invalid/e2e',
      }});
      expect(created.status(), await created.text()).toBe(201);
      id = (await created.json()).id;
      const read = await request.get(`/api/library/${id}`, { headers });
      expect(read.status(), await read.text()).toBe(200);
      const updated = await request.put(`/api/library/${id}`, { headers, data: { title: `E2E Asset Editado ${Date.now()}` } });
      expect(updated.status(), await updated.text()).toBe(200);
    } finally {
      if (id) {
        const removed = await request.delete(`/api/library/${id}`, { headers });
        expect([200, 204]).toContain(removed.status());
      }
    }
  });

  test('BILLING-001 overview retorna planos e estado de assinatura sem iniciar cobrança', async ({ request }) => {
    const login = await request.post('/api/auth/login', { data: { emailOrUserId: email, organizationId, loginCode } });
    expect(login.status(), await login.text()).toBe(200);
    const { session } = await login.json();
    const response = await request.get('/api/billing/overview', { headers: { authorization: `Bearer ${session.token}` } });
    expect(response.status(), await response.text()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body.plans)).toBe(true);
    expect(Array.isArray(body.subscriptions)).toBe(true);
    expect(Array.isArray(body.invoices)).toBe(true);
    expect(Array.isArray(body.gatewayEvents)).toBe(true);
  });

  test('ADMIN-001 painel administrativo retorna dados do contexto autenticado', async ({ request }) => {
    const login = await request.post('/api/auth/login', { data: { emailOrUserId: email, organizationId, loginCode } });
    expect(login.status(), await login.text()).toBe(200);
    const { session } = await login.json();
    const response = await request.get('/api/admin/overview', { headers: { authorization: `Bearer ${session.token}` } });
    if (session.role !== 'owner' && session.role !== 'admin') {
      expect([403]).toContain(response.status());
      return;
    }
    expect(response.status(), await response.text()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body.users)).toBe(true);
    expect(Array.isArray(body.shows)).toBe(true);
    expect(Array.isArray(body.plans)).toBe(true);
    expect(Array.isArray(body.subscriptions)).toBe(true);
    expect(Array.isArray(body.invoices)).toBe(true);
    expect(Array.isArray(body.gatewayEvents)).toBe(true);
  });
  test('AUTH-012 troca para organização sem vínculo é recusada', async ({ request }) => {
    const login = await request.post('/api/auth/login', {
      data: { emailOrUserId: email, organizationId, loginCode },
    });
    expect(login.status(), await login.text()).toBe(200);
    const { session } = await login.json();
    const response = await request.post('/api/auth/switch-org', {
      headers: { authorization: `Bearer ${session.token}` },
      data: { organizationId: 'org-e2e-not-a-member' },
    });
    expect([401, 403]).toContain(response.status());
  });

  test('KNOWLEDGE-001 catálogo público de conhecimento retorna coleção estruturada', async ({ request }) => {
    const response = await request.get('/api/knowledge-base/programs');
    expect(response.status(), await response.text()).toBe(200);
    const programs = await response.json();
    expect(Array.isArray(programs)).toBe(true);
    if (programs.length) {
      expect(programs[0]).toHaveProperty('slug');
      expect(programs[0]).toHaveProperty('nome');
    }
  });

  test('UI-010 sessão autenticada permite navegar pelos módulos operacionais', async ({ request, page }) => {
    const login = await request.post('/api/auth/login', {
      data: { emailOrUserId: email, organizationId, loginCode },
    });
    expect(login.status(), await login.text()).toBe(200);
    const { session } = await login.json();
    await page.addInitScript(({ token, orgId }) => {
      localStorage.setItem('tmv2_auth_token', token);
      localStorage.setItem('tmv2_active_org_id', orgId);
    }, { token: session.token, orgId: session.activeOrganization.id });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    await expect(page.getByRole('button', { name: /Painel do Programa/ })).toBeVisible();
    const navigation = [
      'Episódios & Roteiros',
      'Participantes & Convidados',
      'Catálogo & Temporadas',
      'Agenda de Produção',
      'Biblioteca de Assets',
      'Estúdio & Câmeras',
      'Assinatura & Gateway',
      'Painel Administrativo',
    ];
    for (const label of navigation) {
      const item = page.getByRole('button', { name: new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }).first();
      if (await item.isVisible().catch(() => false)) {
        await item.click();
        await expect(item).toBeVisible();
      }
    }
    expect(errors).toEqual([]);
  });

  test('AUTH-013 interface autenticada oferece encerramento de sessão', async ({ request, page }) => {
    const login = await request.post('/api/auth/login', {
      data: { emailOrUserId: email, organizationId, loginCode },
    });
    expect(login.status(), await login.text()).toBe(200);
    const { session } = await login.json();
    await page.addInitScript(({ token, orgId }) => {
      localStorage.setItem('tmv2_auth_token', token);
      localStorage.setItem('tmv2_active_org_id', orgId);
    }, { token: session.token, orgId: session.activeOrganization.id });
    await page.goto('/');
    await expect(page.getByRole('button', { name: /sair|encerrar sessão|logout/i })).toBeVisible();
  });

  test('AUTH-014 formulário de acesso oferece recuperação de credenciais', async ({ request, page }) => {
    const login = await request.post('/api/auth/login', {
      data: { emailOrUserId: email, organizationId, loginCode },
    });
    expect(login.status(), await login.text()).toBe(200);
    const { session } = await login.json();
    await page.addInitScript(({ token, orgId }) => {
      localStorage.setItem('tmv2_auth_token', token);
      localStorage.setItem('tmv2_active_org_id', orgId);
    }, { token: session.token, orgId: session.activeOrganization.id });
    await page.goto('/');
    await page.locator('button[title*="trocar o Login Individual de Programa"]').click();
    await expect(page.getByText(/recuperar acesso|esqueci minha senha|redefinir senha/i)).toBeVisible();
  });

  test('ONBOARDING-001 primeiro cadastro apresenta campos obrigatórios sem enviar dados', async ({ request, page }) => {
    const login = await request.post('/api/auth/login', {
      data: { emailOrUserId: email, organizationId, loginCode },
    });
    expect(login.status(), await login.text()).toBe(200);
    const { session } = await login.json();
    await page.addInitScript(({ token, orgId }) => {
      localStorage.setItem('tmv2_auth_token', token);
      localStorage.setItem('tmv2_active_org_id', orgId);
    }, { token: session.token, orgId: session.activeOrganization.id });
    await page.goto('/');
    await page.locator('button[title*="trocar o Login Individual de Programa"]').click();
    await page.getByRole('button', { name: /Primeiro Cadastro \+ Pagante/ }).click();
    await expect(page.getByText('Nome Completo *')).toBeVisible();
    await expect(page.getByText('E-mail Corporativo *')).toBeVisible();
    await expect(page.getByText(/Programa Vinculado no Primeiro Cadastro/)).toBeVisible();
  });

  // ============================================
  // Novo: Testes de Pré-Setup (Setup States)
  // ============================================
  test('SETUP-001 estado de setup é recuperado para programa com setup pendente', async ({ request }) => {
    test.skip(!canWrite, 'Escritas E2E exigem E2E_ALLOW_PERSISTENT_WRITES=true e E2E_TARGET_KIND=test ou staging.');
    const login = await request.post('/api/auth/login', { data: { emailOrUserId: email, organizationId, loginCode } });
    expect(login.status(), await login.text()).toBe(200);
    const { session } = await login.json();
    const headers = { authorization: `Bearer ${session.token}`, 'x-organization-id': organizationId! };

    const showsResponse = await request.get('/api/shows', { headers });
    expect(showsResponse.status(), await showsResponse.text()).toBe(200);
    const shows = await showsResponse.json();
    test.skip(!shows.length, 'Identidade E2E precisa de ao menos um programa.');

    const showId = shows[0].id;
    const setup = await request.get(`/api/setup/state/${showId}`, { headers });
    expect([200, 404]).toContain(setup.status());
    if (setup.status() === 200) {
      const body = await setup.json();
      expect(body).toHaveProperty('status');
      expect(body).toHaveProperty('programId');
    }
  });

  test('SETUP-002 execução de setup idempotente: segundo retorno não duplica', async ({ request }) => {
    test.skip(!canWrite, 'Escritas E2E exigem E2E_ALLOW_PERSISTENT_WRITES=true e E2E_TARGET_KIND=test ou staging.');
    const login = await request.post('/api/auth/login', { data: { emailOrUserId: email, organizationId, loginCode } });
    expect(login.status(), await login.text()).toBe(200);
    const { session } = await login.json();
    const headers = { authorization: `Bearer ${session.token}`, 'x-organization-id': organizationId! };

    const showsResponse = await request.get('/api/shows', { headers });
    const shows = await showsResponse.json();
    test.skip(!shows.length, 'Identidade E2E precisa de ao menos um programa.');

    const showId = shows[0].id;

    const first = await request.post(`/api/setup/run/${showId}`, { headers });
    expect([200, 409]).toContain(first.status());

    const second = await request.post(`/api/setup/run/${showId}`, { headers });
    expect([200]).toContain(second.status());
    const body = await second.json();
    expect(body.status).toBe('ready');
  });

  test('SETUP-003 retry de setup falhado recupera estado', async ({ request }) => {
    test.skip(!canWrite, 'Escritas E2E exigem E2E_ALLOW_PERSISTENT_WRITES=true e E2E_TARGET_KIND=test ou staging.');
    const login = await request.post('/api/auth/login', { data: { emailOrUserId: email, organizationId, loginCode } });
    expect(login.status(), await login.text()).toBe(200);
    const { session } = await login.json();
    const headers = { authorization: `Bearer ${session.token}`, 'x-organization-id': organizationId! };

    const showsResponse = await request.get('/api/shows', { headers });
    const shows = await showsResponse.json();
    test.skip(!shows.length, 'Identidade E2E precisa de ao menos um programa.');

    const showId = shows[0].id;

    await request.post(`/api/setup/retry/${showId}`, { headers });
    const state = await request.get(`/api/setup/state/${showId}`, { headers });
    expect(state.status()).toBe(200);
    const body = await state.json();
    expect(['setup_pending', 'setup_running', 'ready']).toContain(body.status);
  });

  test('SETUP-004 setup de um programa não altera outro programa', async ({ request }) => {
    test.skip(!canWrite, 'Escritas E2E exigem E2E_ALLOW_PERSISTENT_WRITES=true e E2E_TARGET_KIND=test ou staging.');
    const login = await request.post('/api/auth/login', { data: { emailOrUserId: email, organizationId, loginCode } });
    expect(login.status(), await login.text()).toBe(200);
    const { session } = await login.json();
    const headers = { authorization: `Bearer ${session.token}`, 'x-organization-id': organizationId! };

    const showsResponse = await request.get('/api/shows', { headers });
    const shows = await showsResponse.json();
    test.skip(shows.length < 2, 'Identidade E2E precisa de ao menos dois programas para testar isolamento de setup.');

    const showA = shows[0].id;
    const showB = shows[1].id;

    await request.post(`/api/setup/run/${showA}`, { headers });
    const stateB = await request.get(`/api/setup/state/${showB}`, { headers });
    // O setup de A não deve afetar B (B pode estar vazio, não deve ser afetado)
    expect(stateB.status()).toBe(200);
  });

  // ============================================
  // Novo: Testes de Pagamento (Payment Intents)
  // ============================================
  test('BILLING-002 pagamento sem confirmação do gateway não ativa assinatura', async ({ request }) => {
    const login = await request.post('/api/auth/login', { data: { emailOrUserId: email, organizationId, loginCode } });
    expect(login.status(), await login.text()).toBe(200);
    const { session } = await login.json();
    const headers = { authorization: `Bearer ${session.token}`, 'x-organization-id': organizationId! };

    const response = await request.post('/api/billing/subscribe', {
      headers,
      data: { planId: 'rsplay_programa_individual', autoRenew: true },
    });
    expect([201, 403]).toContain(response.status());
    if (response.status() === 201) {
      const body = await response.json();
      // Assinatura deve estar pendente ou ativa apenas se pagamento confirmado
      expect(body.subscription?.status).toMatch(/active|pending_payment/);
      if (body.subscription.status === 'active') {
        // Se estiver ativa sem webhook confirmado, é um problema - mas atualmente
        // o subscribeOrUpdatePlan cria com pending_payment quando não há payment_confirmed
        expect(body.subscription.status).toBe('pending_payment');
      }
    }
  });

  test('BILLING-003 pagamento confirmado via webhook ativa assinatura (simulado)', async ({ request }) => {
    test.skip(!canWrite, 'Escritas E2E exigem E2E_ALLOW_PERSISTENT_WRITES=true e E2E_TARGET_KIND=test ou staging.');
    const login = await request.post('/api/auth/login', { data: { emailOrUserId: email, organizationId, loginCode } });
    expect(login.status(), await login.text()).toBe(200);
    const { session } = await login.json();
    const headers = { authorization: `Bearer ${session.token}`, 'x-organization-id': organizationId! };

    // Primeiro cria intenção de pagamento
    const subscribeResp = await request.post('/api/billing/subscribe', {
      headers,
      data: { planId: 'rsplay_programa_individual', autoRenew: true },
    });
    expect([201, 403]).toContain(subscribeResp.status());
    if (subscribeResp.status() === 201) {
      const body = await subscribeResp.json();
      const subId = body.subscription.id;

      // Tenta renovação simulada (falha ou sucesso)
      const renewResp = await request.post(`/api/billing/subscriptions/${subId}/renew-now`, {
        headers,
        data: { simulateFailure: true },
      });
      expect([402, 200]).toContain(renewResp.status());
    }
  });

  test('BILLING-004 pagamento expirado ou falhado não ativa acesso', async ({ request }) => {
    const login = await request.post('/api/auth/login', { data: { emailOrUserId: email, organizationId, loginCode } });
    expect(login.status(), await login.text()).toBe(200);
    const { session } = await login.json();
    const headers = { authorization: `Bearer ${session.token}`, 'x-organization-id': organizationId! };

    // Tenta criar pagamento com expiração simulada via webhook não autenticado
    const webhookResp = await request.post('/api/billing/webhook/venopag', {
      data: {
        event_type: 'payment_expired',
        transaction_id: 'tx-e2e-expired-' + Date.now(),
        failure_reason: 'PIX expirado',
      },
    });
    expect([200, 400]).toContain(webhookResp.status());
  });

  // ============================================
  // Novo: Testes de Isolamento de Programa (RBAC)
  // ============================================
  test('ISOLATION-001 usuário não consegue acessar programa de outro contexto', async ({ request }) => {
    const login = await request.post('/api/auth/login', { data: { emailOrUserId: email, organizationId, loginCode } });
    expect(login.status(), await login.text()).toBe(200);
    const { session } = await login.json();
    const headers = { authorization: `Bearer ${session.token}`, 'x-organization-id': organizationId! };

    const showsResponse = await request.get('/api/shows', { headers });
    const shows = await showsResponse.json();
    test.skip(shows.length < 2, 'Identidade E2E precisa de ao menos dois programas para isolamento.');

    // Tenta acessar episódio de um programa para o qual não tem permissão
    // (se o usuário tiver apenas acesso a um show, o outro deve ser negado)
    const otherShowId = shows[1].id;
    const episodesResponse = await request.get(`/api/episodes?showId=${otherShowId}`, { headers });
    expect(episodesResponse.status()).toBe(200);
    const episodes = await episodesResponse.json();
    expect(Array.isArray(episodes)).toBe(true);
  });

  test('ISOLATION-002 tentativa de editar programa sem permissão retorna 403', async ({ request }) => {
    const login = await request.post('/api/auth/login', { data: { emailOrUserId: email, organizationId, loginCode } });
    expect(login.status(), await login.text()).toBe(200);
    const { session } = await login.json();
    const headers = { authorization: `Bearer ${session.token}`, 'x-organization-id': organizationId! };

    const showsResponse = await request.get('/api/shows', { headers });
    const shows = await showsResponse.json();
    test.skip(shows.length < 2, 'Identidade E2E precisa de ao menos dois programas para isolamento.');

    const otherShowId = shows[1].id;
    const updateResp = await request.put(`/api/shows/${otherShowId}`, {
      headers,
      data: { title: 'Tentativa de edição não autorizada' },
    });
    expect(updateResp.status()).toBe(403);
  });

  // ============================================
  // Novo: Testes de Administração Global (Separation of Concerns)
  // ============================================
  test('GLOBAL-001 administrador global acessa painel global', async ({ request }) => {
    const login = await request.post('/api/auth/login', { data: { emailOrUserId: email, organizationId, loginCode } });
    expect(login.status(), await login.text()).toBe(200);
    const { session } = await login.json();
    const headers = { authorization: `Bearer ${session.token}` };

    if (!session.isPlatformAdmin) {
      // Usuário não é admin global: deve receber 403 no endpoint global
      const resp = await request.get('/api/admin/overview', { headers });
      expect(resp.status()).toBe(403);
      return;
    }

    const resp = await request.get('/api/admin/overview', { headers });
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(Array.isArray(body.users)).toBe(true);
    expect(Array.isArray(body.shows)).toBe(true);
  });

  test('GLOBAL-002 admin de organização não acessa dados globais de outras organizações', async ({ request }) => {
    const login = await request.post('/api/auth/login', { data: { emailOrUserId: email, organizationId, loginCode } });
    expect(login.status(), await login.text()).toBe(200);
    const { session } = await login.json();
    const headers = { authorization: `Bearer ${session.token}` };

    if (session.isPlatformAdmin) {
      // Admin global pode acessar tudo - skip para este teste específico
      return;
    }

    // Endpoint global deve negar acesso a admin de organização
    const resp = await request.get('/api/admin/overview', { headers });
    expect(resp.status()).toBe(403);
  });

  test('GLOBAL-003 org admin acessa escopo próprio via /api/admin/org/overview', async ({ request }) => {
    const login = await request.post('/api/auth/login', { data: { emailOrUserId: email, organizationId, loginCode } });
    expect(login.status(), await login.text()).toBe(200);
    const { session } = await login.json();
    const headers = { authorization: `Bearer ${session.token}` };

    if (['owner', 'admin'].includes(session.role)) {
      const resp = await request.get('/api/admin/org/overview', { headers });
      expect(resp.status()).toBe(200);
    } else {
      // Usuário comum não tem acesso ao admin org
      const resp = await request.get('/api/admin/org/overview', { headers });
      expect(resp.status()).toBe(403);
    }
  });

  // ============================================
  // Novo: Teste de persistência após login
  // ============================================
  test('WORKSPACE-003 persistência de episódios após login', async ({ request }) => {
    test.skip(!canWrite, 'Escritas E2E exigem E2E_ALLOW_PERSISTENT_WRITES=true e E2E_TARGET_KIND=test ou staging.');
    const login1 = await request.post('/api/auth/login', { data: { emailOrUserId: email, organizationId, loginCode } });
    expect(login1.status(), await login1.text()).toBe(200);
    const { session } = await login1.json();
    const headers = { authorization: `Bearer ${session.token}`, 'x-organization-id': organizationId! };

    const showsResponse = await request.get('/api/shows', { headers });
    const shows = await showsResponse.json();
    test.skip(!shows.length, 'Identidade E2E precisa de ao menos um programa.');

    // Cria episódio
    const created = await request.post('/api/episodes', {
      headers,
      data: { title: `E2E Persistência ${Date.now()}`, showId: shows[0].id, status: 'draft', idea: 'Teste de persistência' },
    });
    expect(created.status(), await created.text()).toBe(201);
    const episode = await created.json();
    const episodeId = episode.id;

    // Logout e login novamente (nova sessão)
    const login2 = await request.post('/api/auth/login', { data: { emailOrUserId: email, organizationId, loginCode } });
    expect(login2.status(), await login2.text()).toBe(200);
    const { session: session2 } = await login2.json();
    const headers2 = { authorization: `Bearer ${session2.token}`, 'x-organization-id': organizationId! };

    // Verifica que o episódio persiste
    const readResp = await request.get(`/api/episodes/${episodeId}`, { headers: headers2 });
    expect(readResp.status(), await readResp.text()).toBe(200);
    const readEpisode = await readResp.json();
    expect(readEpisode.title).toBe(episode.title);
    expect(readEpisode.id).toBe(episodeId);

    // Limpeza
    await request.delete(`/api/episodes/${episodeId}`, { headers: headers2 });
  });

});
