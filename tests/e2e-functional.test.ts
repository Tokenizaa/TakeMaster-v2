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
        status: 'scheduled', startAt: new Date(Date.now() + 86400000).toISOString(),
        endAt: new Date(Date.now() + 90000000).toISOString(), notes: 'Registro E2E temporário',
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
    expect(Array.isArray(body.organizations)).toBe(true);
  });
});
