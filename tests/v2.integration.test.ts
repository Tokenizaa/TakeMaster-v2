import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkDatabaseHealth,
  createEpisode,
  createLibraryAsset,
  createProduction,
  createScheduleEvent,
  createShow,
  getEpisodeById,
  getShowById,
  listLibraryAssets,
  listProductions,
  listScheduleEvents,
  listShows,
  resetDbConnectionForTests,
  updateEpisode,
  verifyUserOrganizationAccess,
} from '../src/server/persistence';
import {
  AppError,
  validateEpisodePayload,
  validateProductionPayload,
  validateScheduleEventPayload,
  validateShowPayload,
} from '../src/domain/validation';
import {
  validateDiagnosisOutput,
  validateResearchOutput,
  validateScriptOutput,
  validateShortsOutput,
} from '../src/domain/aiContracts';
import { buildAuthSession, verifySessionToken } from '../src/server/auth';
import { evaluateShowPermissions } from '../src/hooks/usePermissions';
import { createApiApp } from '../server';

describe('TakeMaster V2 / RSPlay TV SaaS — Reconstruction, RBAC & Billing Suite', () => {
  before(() => {
    resetDbConnectionForTests(':memory:');
  });

  it('Phase 0 & 1: Bootstraps relational SQL schema, migrations, and onboarding seed data without db.json', () => {
    const health = checkDatabaseHealth();
    assert.equal(health.connected, true);
    assert.ok(health.migrationsApplied.includes('0001_v2_core_schema.sql'));
    assert.ok(health.migrationsApplied.includes('0002_v2_operations_and_rls.sql'));
    assert.ok(health.migrationsApplied.includes('0003_rsplay_saas_rbac_and_billing.sql'));
    assert.ok(health.stats.organizations >= 2);
    assert.ok(health.stats.shows >= 2);
    assert.ok(health.stats.episodes >= 2);
  });

  it('Phase 1 (Rule 6): Validates domain contracts and rejects invalid payloads with VALIDATION_ERROR', () => {
    assert.throws(
      () => validateShowPayload({ title: 'A' }, false),
      (err: any) => err instanceof AppError && err.code === 'VALIDATION_ERROR'
    );

    assert.throws(
      () => validateEpisodePayload({ title: 'Episódio Válido' }, false),
      (err: any) =>
        err instanceof AppError &&
        err.code === 'VALIDATION_ERROR' &&
        err.message.includes('showId')
    );

    assert.throws(
      () =>
        validateProductionPayload(
          { title: 'Temporada X', showId: 'show-1', status: 'invalid_status' },
          false
        ),
      (err: any) => err instanceof AppError && err.code === 'VALIDATION_ERROR'
    );

    assert.throws(
      () =>
        validateScheduleEventPayload(
          { title: 'Gravação', showId: 'show-1', type: 'invalid_type' },
          false
        ),
      (err: any) => err instanceof AppError && err.code === 'VALIDATION_ERROR'
    );
  });

  it('Phase 1 (Rule 3 & Rule 6): Enforces multi-tenant organization isolation and RBAC authorization', () => {
    const partnerAccess = verifyUserOrganizationAccess(
      'usr-partner-03',
      'org-horizonte-media'
    );
    assert.equal(partnerAccess.organization.id, 'org-horizonte-media');
    assert.equal(partnerAccess.role, 'owner');

    assert.throws(
      () => verifyUserOrganizationAccess('usr-partner-03', 'org-takemaster-studio'),
      (err: any) =>
        err instanceof AppError &&
        err.code === 'FORBIDDEN_CONTEXT' &&
        err.statusCode === 403
    );

    assert.throws(
      () => getShowById('org-horizonte-media', 'show-1'),
      (err: any) =>
        err instanceof AppError &&
        err.code === 'FORBIDDEN_CONTEXT' &&
        err.statusCode === 403
    );

    assert.throws(
      () => getEpisodeById('org-horizonte-media', 'ep-101'),
      (err: any) =>
        err instanceof AppError &&
        err.code === 'FORBIDDEN_CONTEXT' &&
        err.statusCode === 403
    );
  });

  it('Phase 1 & 2: Signs and verifies session tokens and persists full episode lifecycle across reloads', () => {
    const session = buildAuthSession('usr-producer-01', 'org-takemaster-studio');
    const verified = verifySessionToken(session.token);
    assert.ok(verified);
    assert.equal(verified?.userId, 'usr-producer-01');
    assert.equal(verified?.organizationId, 'org-takemaster-studio');

    const createdShow = createShow(
      'org-takemaster-studio',
      {
        title: 'Programa Investigativo V2',
        host: 'Helena Costa',
        format: 'Reportagem',
        defaultDurationMin: 60,
        catalogStatus: 'active',
      },
      'usr-producer-01'
    );

    const createdProd = createProduction(
      'org-takemaster-studio',
      {
        showId: createdShow.id,
        title: 'Temporada 1 — Infraestrutura Crítica',
        seasonNumber: 1,
        status: 'in_production',
        targetEpisodesCount: 6,
      },
      'usr-producer-01'
    );

    const createdEp = createEpisode(
      'org-takemaster-studio',
      {
        showId: createdShow.id,
        productionId: createdProd.id,
        title: 'Bastidores dos Cabos Submarinos',
        guestName: 'Roberto Prado',
        idea: 'Como funcionam as conexões intercontinentais.',
      },
      'usr-producer-01'
    );

    assert.equal(createdEp.productionId, createdProd.id);

    const updatedEp = updateEpisode(
      'org-takemaster-studio',
      createdEp.id,
      {
        status: 'recording',
        outline: [
          {
            id: 'blk-test-1',
            blockNumber: 1,
            title: 'O Ponto de Aterrissagem em Fortaleza',
            estimatedDurationMin: 20,
            objective: 'Explicar a geografia da internet no Atlântico Sul.',
            keyThemes: ['Cabos Submarinos', 'Latência'],
            transitionText: 'Vamos ver o mapa óptico.',
          },
        ],
        recordingMarkers: [
          {
            id: 'mk-test-1',
            timestampSec: 125,
            formattedTime: '02:05',
            type: 'momento_forte',
            blockTitle: 'O Ponto de Aterrissagem em Fortaleza',
            referenceText: 'Explicação sobre reparo em alto-mar.',
            comment: 'Ótimo corte para YouTube Shorts!',
          },
        ],
        assets: [
          {
            id: 'ast-cable-map',
            type: 'grafico',
            title: 'Mapa Óptico Atlântico Sul 4K',
            description: 'Infográfico das rotas submarinas.',
            moment: '02:05',
            status: 'aprovado',
            tags: ['mapa', 'cabos'],
            reusable: true,
          },
        ],
        versions: [
          {
            id: 'ver-test-1',
            versionNumber: 1,
            name: 'V1 — Roteiro de Estúdio Fechado',
            savedAt: new Date().toISOString(),
            description: 'Snapshot antes de entrar no estúdio.',
            snapshot: { outline: [], questions: [], script: [] },
          },
        ],
      },
      'usr-producer-01'
    );

    assert.equal(updatedEp.status, 'recording');
    assert.equal(updatedEp.outline.length, 1);
    assert.equal(updatedEp.recordingMarkers.length, 1);
    assert.equal(updatedEp.versions.length, 1);

    const reloaded = getEpisodeById('org-takemaster-studio', createdEp.id);
    assert.equal(reloaded.title, 'Bastidores dos Cabos Submarinos');
    assert.equal(reloaded.outline[0].title, 'O Ponto de Aterrissagem em Fortaleza');
    assert.equal(reloaded.recordingMarkers[0].formattedTime, '02:05');
    assert.equal(reloaded.versions[0].name, 'V1 — Roteiro de Estúdio Fechado');

    const library = listLibraryAssets('org-takemaster-studio', createdShow.id);
    assert.ok(library.some((a) => a.title === 'Mapa Óptico Atlântico Sul 4K'));
  });

  it('Phase 3: Manages operational Schedule Events and Library Assets linked to Shows and Episodes', () => {
    const shows = listShows('org-takemaster-studio');
    const prods = listProductions('org-takemaster-studio', shows[0].id);

    const ev = createScheduleEvent(
      'org-takemaster-studio',
      {
        showId: shows[0].id,
        productionId: prods[0]?.id,
        episodeId: 'ep-101',
        title: 'Ensaio Geral Multicâmera',
        type: 'rehearsal',
        status: 'confirmed',
        scheduledStart: '2026-10-10T10:00:00.000Z',
        scheduledEnd: '2026-10-10T11:30:00.000Z',
        studioLocation: 'Estúdio A',
        assignedTeam: ['Helena Costa', 'Diretor Técnico'],
      },
      'usr-producer-01'
    );

    const schedule = listScheduleEvents('org-takemaster-studio', shows[0].id);
    const found = schedule.find((s) => s.id === ev.id);
    assert.ok(found);
    assert.equal(found?.episodeTitle, 'A Queda do Protótipo VX-04 e os 18 Dias Antes da Falência');

    const libAsset = createLibraryAsset(
      'org-takemaster-studio',
      {
        showId: shows[0].id,
        type: 'trilha',
        title: 'Trilha de Encerramento — Master Stereo',
        status: 'aprovado',
        tags: ['trilha', 'master'],
      },
      'usr-producer-01'
    );
    assert.equal(libAsset.status, 'aprovado');
  });

  it('Phase 4: Validates AI outputs at runtime and prevents malformed AI payloads from corrupting state', () => {
    const fallbackDiag = {
      centralTheme: 'Tema Padrão Seguro',
      potentialStory: 'História Padrão',
      primaryConflict: 'Conflito Padrão',
      primaryTransformation: 'Transformação Padrão',
      whyWatch: 'Motivo Padrão',
      whatToDiscover: 'Descoberta Padrão',
      researchPoints: ['Ponto 1'],
      highImpactMoments: ['Momento 1'],
      approved: false,
    };

    const validatedDiag = validateDiagnosisOutput(null, fallbackDiag, 'gemini');
    assert.equal(validatedDiag.meta.validated, true);
    assert.ok(validatedDiag.meta.warnings.length > 0);
    assert.equal(validatedDiag.data.centralTheme, 'Tema Padrão Seguro');

    const validatedRes = validateResearchOutput(
      {
        aboutGuest: 'Bio válida',
        sources: [
          {
            id: 's1',
            title: 'Fonte 1',
            detail: 'Detalhe',
            status: 'STATUS_INEXISTENTE_ALUCINADO',
            category: 'CATEGORIA_INVALIDA',
          },
        ],
      },
      {
        aboutGuest: 'Fallback',
        trajectory: 'Fallback',
        company: 'Fallback',
        keyDatesAndNumbers: 'Fallback',
        previousInterviews: 'Fallback',
        recurringThemes: 'Fallback',
        contradictionsAndClarifications: 'Fallback',
        compellingStories: 'Fallback',
        sources: [],
      },
      'gemini'
    );
    assert.equal(validatedRes.data.sources[0].status, 'NÃO CONFIRMADO');
    assert.equal(validatedRes.data.sources[0].category, 'guest');

    const validatedScript = validateScriptOutput(
      {
        script: [
          {
            id: 'sc-bad',
            type: 'TIPO_INVALIDO',
            camera: 'CAM 99',
            speaker: 'Host',
            content: 'Fala teste',
          },
        ],
      },
      [],
      'gemini'
    );
    assert.equal(validatedScript.data.script[0].type, 'question');

    const validatedShorts = validateShortsOutput(
      {
        shorts: [
          {
            id: 'sh-bad',
            title: 'Corte 1',
            hook: 'Gancho',
            generatingQuestion: 'Pergunta',
            estimatedDuration: '50s',
            status: 'STATUS_ALUCINADO',
          },
        ],
      },
      [],
      'gemini'
    );
    assert.equal(validatedShorts.data.shorts[0].status, 'Planejado');
  });

  it('RSPlay TV SaaS: Enforces Individual Program Login RBAC, Monthly Subscriptions, Auto-Renew Gateway & Admin Panel', async () => {
    const app = createApiApp();
    const server = app.listen(0);
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 0;
    const baseUrl = `http://127.0.0.1:${port}`;

    try {
      // 1. Login as Rafael Mendes (Individual login restricted strictly to 'show-1': Bastidores do Poder)
      const rafaelLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailOrUserId: 'rafael.mendes@rsplaytv.com.br',
          loginCode: 'poder123',
        }),
      });
      assert.equal(rafaelLoginRes.status, 200);
      const { session: rafaelSession } = await rafaelLoginRes.json();
      assert.equal(rafaelSession.isFullAccessAdmin, false);
      assert.deepEqual(rafaelSession.allowedShowIds, ['show-1']);

      // 2. Verify Rafael ONLY receives show-1 and its episodes in /api/state
      const rafaelStateRes = await fetch(`${baseUrl}/api/state`, {
        headers: { Authorization: `Bearer ${rafaelSession.token}` },
      });
      assert.equal(rafaelStateRes.status, 200);
      const rafaelState = await rafaelStateRes.json();
      assert.equal(rafaelState.shows.length, 1);
      assert.equal(rafaelState.shows[0].id, 'show-1');
      assert.ok(rafaelState.episodes.every((ep: any) => ep.showId === 'show-1'));

      // 3. Verify Rafael is blocked (403 FORBIDDEN_CONTEXT) from accessing show-2's episode (ep-201)
      const rafaelForbiddenEp = await fetch(`${baseUrl}/api/episodes/ep-201`, {
        headers: { Authorization: `Bearer ${rafaelSession.token}` },
      });
      assert.equal(rafaelForbiddenEp.status, 403);

      // 4. Login as Clara Vasconcelos (Individual login restricted strictly to 'show-2': Anatomia Criativa)
      const claraLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailOrUserId: 'clara.vasconcelos@rsplaytv.com.br',
          loginCode: 'anatomia123',
        }),
      });
      assert.equal(claraLoginRes.status, 200);
      const { session: claraSession } = await claraLoginRes.json();
      assert.equal(claraSession.isFullAccessAdmin, false);
      assert.deepEqual(claraSession.allowedShowIds, ['show-2']);

      // 5. Login as Helena Costa (Admin Geral RSPlay TV) & test Billing + Admin Panel endpoints
      const adminLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailOrUserId: 'helena.costa@rsplaytv.com.br',
          loginCode: 'rsplay123',
        }),
      });
      assert.equal(adminLoginRes.status, 200);
      const { session: adminSession } = await adminLoginRes.json();
      assert.equal(adminSession.isFullAccessAdmin, true);

      // 6. Test Payment Gateway Automatic Renewal cycle
      const billingRes = await fetch(`${baseUrl}/api/billing/overview`, {
        headers: { Authorization: `Bearer ${adminSession.token}` },
      });
      assert.equal(billingRes.status, 200);
      const billingData = await billingRes.json();
      assert.ok(billingData.plans.length >= 3);
      assert.ok(billingData.subscriptions.length >= 1);

      const activeSubId = billingData.subscriptions[0].id;
      const renewRes = await fetch(
        `${baseUrl}/api/billing/subscriptions/${activeSubId}/renew-now`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminSession.token}`,
          },
          body: JSON.stringify({ simulateFailure: false }),
        }
      );
      assert.equal(renewRes.status, 200);
      const renewData = await renewRes.json();
      assert.equal(renewData.invoice.status, 'paid');
      assert.equal(renewData.invoice.autoRenewalCycle, true);
      assert.equal(renewData.gatewayEvent.eventType, 'invoice.auto_renewal_succeeded');

      // 7. Test Admin Panel Overview & Reports
      const adminOverviewRes = await fetch(`${baseUrl}/api/admin/overview`, {
        headers: { Authorization: `Bearer ${adminSession.token}` },
      });
      assert.equal(adminOverviewRes.status, 200);
      const adminOverview = await adminOverviewRes.json();
      assert.ok(adminOverview.reportSummary.mrrCents > 0);
      assert.ok(adminOverview.reportSummary.showsReport.length >= 2);

      // 8. Validate usePermissions / evaluateShowPermissions show-level RBAC isolation
      const rafaelShow1Perms = evaluateShowPermissions(rafaelSession, 'show-1');
      assert.equal(rafaelShow1Perms.hasShowAccess, true);
      assert.equal(rafaelShow1Perms.canView, true);
      assert.equal(rafaelShow1Perms.canEditEditorial, true);
      assert.equal(rafaelShow1Perms.source, 'explicit_show_permission');

      const rafaelShow2Perms = evaluateShowPermissions(rafaelSession, 'show-2');
      assert.equal(rafaelShow2Perms.hasShowAccess, false);
      assert.equal(rafaelShow2Perms.canView, false);
      assert.equal(rafaelShow2Perms.source, 'denied');

      const claraShow2Perms = evaluateShowPermissions(claraSession, 'show-2');
      assert.equal(claraShow2Perms.hasShowAccess, true);
      assert.equal(claraShow2Perms.canView, true);
      assert.equal(claraShow2Perms.canOperateStudio, true);

      const claraShow1Perms = evaluateShowPermissions(claraSession, 'show-1');
      assert.equal(claraShow1Perms.hasShowAccess, false);
      assert.equal(claraShow1Perms.canView, false);

      const adminShow2Perms = evaluateShowPermissions(adminSession, 'show-2');
      assert.equal(adminShow2Perms.hasShowAccess, true);
      assert.equal(adminShow2Perms.isFullAccessAdmin, true);
      assert.equal(adminShow2Perms.source, 'admin_master');

      // 9. FASE 1 a 10: Validação de Identidade Editorial + Curadoria de Pautas (3 programas)
      // 9.1 Programa 1: Advogada do Leque (Mídia Kit Completo)
      const advKnowledgeRes = await fetch(
        `${baseUrl}/api/shows/show-advogada-do-leque/knowledge`,
        {
          headers: { Authorization: `Bearer ${adminSession.token}` },
        }
      );
      assert.equal(advKnowledgeRes.status, 200);
      const advKnowledge = await advKnowledgeRes.json();
      assert.equal(advKnowledge.foundInKnowledgeBase, true);
      assert.equal(advKnowledge.coverageLevel, 'completa');
      assert.equal(advKnowledge.nome.toUpperCase(), 'ADVOGADA DO LEQUE');
      assert.equal(advKnowledge.apresentador, 'Taise Vielmo Côrtes');
      assert.ok(advKnowledge.temasPrincipais.length > 0);
      assert.ok(advKnowledge.fontes.length >= 2);

      const advIdentityRes = await fetch(
        `${baseUrl}/api/shows/show-advogada-do-leque/editorial-identity`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminSession.token}`,
          },
          body: JSON.stringify({}),
        }
      );
      assert.equal(advIdentityRes.status, 200);
      const advIdentity = await advIdentityRes.json();
      assert.ok(advIdentity.essencia.length > 10);
      assert.ok(Array.isArray(advIdentity.temas) && advIdentity.temas.length > 0);
      assert.ok(Array.isArray(advIdentity.forcas) && advIdentity.forcas.length > 0);
      assert.ok(
        Array.isArray(advIdentity.abordagens_recomendadas) &&
          advIdentity.abordagens_recomendadas.length > 0
      );
      assert.ok(
        Array.isArray(advIdentity.abordagens_a_evitar) &&
          advIdentity.abordagens_a_evitar.length > 0
      );
      assert.ok(Array.isArray(advIdentity.diferenciais) && advIdentity.diferenciais.length > 0);
      assert.ok(Array.isArray(advIdentity.fontes) && advIdentity.fontes.length > 0);

      // Sugestão de pautas SEM input ("Quero ideias de pautas para este programa.")
      const advPautasNoInputRes = await fetch(
        `${baseUrl}/api/shows/show-advogada-do-leque/suggest-pautas`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminSession.token}`,
          },
          body: JSON.stringify({}),
        }
      );
      assert.equal(advPautasNoInputRes.status, 200);
      const advPautasNoInput = await advPautasNoInputRes.json();
      assert.equal(advPautasNoInput.queryUsed, 'Quero ideias de pautas para este programa.');
      assert.ok(advPautasNoInput.pautas.length >= 3);
      assert.ok(advPautasNoInput.pautas[0].score >= 50 && advPautasNoInput.pautas[0].score <= 99);
      assert.ok(['alto', 'medio', 'baixo'].includes(advPautasNoInput.pautas[0].fit));
      assert.ok(advPautasNoInput.pautas[0].title.length > 5);
      assert.ok(advPautasNoInput.pautas[0].reason.length > 5);
      assert.ok(advPautasNoInput.pautas[0].angle.length > 5);
      assert.ok(advPautasNoInput.pautas[0].suggestedGuest.length > 3);
      assert.ok(Array.isArray(advPautasNoInput.pautas[0].questions));

      // Sugestão de pautas COM tema e cidade
      const advPautasThemeRes = await fetch(
        `${baseUrl}/api/shows/show-advogada-do-leque/suggest-pautas`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminSession.token}`,
          },
          body: JSON.stringify({
            tema: 'Direito do consumidor em compras online e golpes digitais',
            cidade: 'Porto Alegre',
          }),
        }
      );
      assert.equal(advPautasThemeRes.status, 200);
      const advPautasTheme = await advPautasThemeRes.json();
      assert.ok(advPautasTheme.queryUsed.includes('Direito do consumidor'));
      assert.ok(advPautasTheme.pautas.length >= 3);

      // Uso da pauta na produção (fluxo atual de criação de episódio)
      const chosenPitch = advPautasTheme.pautas[0];
      const useInProdRes = await fetch(`${baseUrl}/api/episodes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminSession.token}`,
        },
        body: JSON.stringify({
          showId: 'show-advogada-do-leque',
          title: chosenPitch.title,
          idea: `${chosenPitch.hook}\nAbordagem: ${chosenPitch.angle}`,
          guestName: chosenPitch.suggestedGuest,
          targetDurationMin: 45,
          status: 'diagnosis',
        }),
      });
      assert.equal(useInProdRes.status, 201);
      const createdFromPitch = await useInProdRes.json();
      assert.equal(createdFromPitch.showId, 'show-advogada-do-leque');
      assert.equal(createdFromPitch.title, chosenPitch.title);

      // 9.2 Programa 2: As Pessoas Inspiram (Mídia Kit Completo)
      const apiKnowledgeRes = await fetch(
        `${baseUrl}/api/shows/show-as-pessoas-inspiram/knowledge`,
        {
          headers: { Authorization: `Bearer ${adminSession.token}` },
        }
      );
      assert.equal(apiKnowledgeRes.status, 200);
      const apiKnowledge = await apiKnowledgeRes.json();
      assert.equal(apiKnowledge.foundInKnowledgeBase, true);
      assert.equal(apiKnowledge.coverageLevel, 'completa');
      assert.equal(apiKnowledge.apresentador, 'Eliane Davila');
      assert.ok(apiKnowledge.quadros.length > 0);

      const apiPautasRes = await fetch(
        `${baseUrl}/api/shows/show-as-pessoas-inspiram/suggest-pautas`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminSession.token}`,
          },
          body: JSON.stringify({
            tema: 'Empreendedorismo social e histórias inspiradoras na Serra Gaúcha',
          }),
        }
      );
      assert.equal(apiPautasRes.status, 200);
      const apiPautas = await apiPautasRes.json();
      assert.ok(apiPautas.pautas.length >= 3);

      // 9.3 Programa 3: Bem Viver (Programa com base menor — apenas catálogo, sem inventar dados)
      const bvKnowledgeRes = await fetch(`${baseUrl}/api/shows/show-bem-viver/knowledge`, {
        headers: { Authorization: `Bearer ${adminSession.token}` },
      });
      assert.equal(bvKnowledgeRes.status, 200);
      const bvKnowledge = await bvKnowledgeRes.json();
      assert.equal(bvKnowledge.foundInKnowledgeBase, true);
      assert.equal(bvKnowledge.coverageLevel, 'parcial');
      assert.equal(bvKnowledge.proposta, 'não identificado na base');
      assert.equal(
        bvKnowledge.editorialSynthesis.abordagens_a_evitar[0],
        'não identificado na base'
      );

      // 9.4 Teste de Fallback de IA (FASE 8: Primary -> Fallback -> Grounded)
      const fallbackRes = await fetch(
        `${baseUrl}/api/shows/show-advogada-do-leque/suggest-pautas`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminSession.token}`,
          },
          body: JSON.stringify({
            tema: 'Planejamento sucessório familiar',
            simulatePrimaryFailure: true,
          }),
        }
      );
      assert.equal(fallbackRes.status, 200);
      const fallbackData = await fallbackRes.json();
      assert.equal(fallbackData.usedFallback, true);
      assert.ok(fallbackData.pautas.length >= 3);

      // 10. Teste de Primeiro Cadastro Conectado ao Pagante (POST /api/auth/register)
      const registerRes = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Dr. Marcos Andrade',
          email: `marcos.andrade.${Date.now()}@rsplaytv.com.br`,
          loginCode: 'dna2026',
          jobTitle: 'Apresentador & Produtor',
          showMode: 'knowledge_base',
          knowledgeBaseSlug: 'dna-empresarial',
          planId: 'rsplay_studio_pro',
          paymentMethodType: 'pix_automatico',
          paymentMethodBrand: 'PIX Automático Banco Central',
          paymentMethodLast4: '9912',
          autoRenew: true,
        }),
      });
      assert.equal(registerRes.status, 201);
      const registerData = await registerRes.json();
      assert.ok(registerData.session.token);
      assert.equal(registerData.subscription.status, 'active');
      assert.equal(registerData.invoice.status, 'paid');
      assert.ok(registerData.gatewayEvent.eventType.includes('subscription'));
      assert.ok(registerData.show.id.includes('dna-empresarial'));
    } finally {
      server.close();
    }
  });
});
