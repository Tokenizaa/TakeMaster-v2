import express, { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  assertUserCanAccessShow,
  buildAdminReportSummary,
  checkDatabaseHealth,
  confirmPaymentAndActivateSubscription,
  createEpisode,
  createLibraryAsset,
  createOrganizationUserWithShowPermissions,
  createParticipant,
  createPaymentIntent,
  createProduction,
  createScheduleEvent,
  createShow,
  dbInstance as db,
  deleteEpisode,
  deleteLibraryAsset,
  deleteParticipant,
  deleteProduction,
  deleteScheduleEvent,
  deleteShow,
  getEpisodeById,
  getSetupState,
  getShowById,
  handlePaymentFailure,
  listAuditLogs,
  listBillingInvoices,
  listEpisodes,
  listLibraryAssets,
  listOrganizationsByIds,
  listOrganizationSubscriptions,
  listOrganizationUsersWithPermissions,
  listParticipants,
  listPaymentGatewayEvents,
  listProductions,
  listSaaSPlans,
  listScheduleEvents,
  listShows,
  mapPaymentIntent,
  nowFn as now,
  populateOrganizationWorkspace,
  processAutomaticRenewalCycle,
  recordAiGeneration,
  recordAuditLog,
  registerSaaSAccountWithSubscription,
  subscribeOrUpdatePlan,
  toggleSubscriptionAutoRenew,
  updateEpisode,
  updateLibraryAsset,
  updateOrganizationUserStatusOrRole,
  updateParticipant,
  updatePaymentIntentStatus,
  updateProduction,
  updateScheduleEvent,
  updateShow,
  updateUserShowPermissions,
  upsertSetupState,
} from './src/server/persistence';
import {
  buildAuthSession,
  getAuthContext,
  loginWithEmailOrUserId,
  requireAuth,
} from './src/server/auth';
import {
  AppError,
  validateEpisodePayload,
  validateLibraryAssetPayload,
  validateParticipantPayload,
  validateProductionPayload,
  validateScheduleEventPayload,
  validateShowPayload,
} from './src/domain/validation';
import {
  generateContextualAssist,
  generateEditorScriptSynthesis,
  generateEditorialDiagnosis,
  generateEditorialResearch,
  generateFollowUpRepiques,
  generatePlannedShorts,
  generateProgramEditorialIdentity,
  generateProgramPitchSuggestions,
  generateSmartOutline,
  generateStudioScript,
  getNimModelConfig,
  isAiConfigured,
} from './src/server/ai';
import {
  listAvailableKnowledgeBasePrograms,
  resolveProgramKnowledge,
} from './src/server/programKnowledge';
import {
  getSystemMetrics,
  incrementMetric,
  logStructured,
  requestTracingMiddleware,
} from './src/server/logger';

export function createApiApp() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // Captura o corpo bruto da requisição para verificação de assinatura de webhooks
  // (precisa vir após o express.json para não quebrar o parse JSON das demais rotas)
  app.use((req, _res, next) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      (req as any).rawBody = data;
      next();
    });
    req.on('error', next);
  });

  // Authorization helpers
  const requireOrganizationAdmin = (auth: any) => {
    if (auth.isPlatformAdmin) return; // Platform admin has access to everything
    if (!['owner', 'admin'].includes(auth.role)) {
      throw new AppError(403, 'FORBIDDEN_CONTEXT', 'Apenas administradores da organização podem executar esta ação.');
    }
  };

  const requirePlatformAdmin = (auth: any) => {
    if (!auth.isPlatformAdmin) {
      throw new AppError(403, 'FORBIDDEN_CONTEXT', 'Acesso restrito a administradores de plataforma.');
    }
  };
  
  app.use(requestTracingMiddleware);

  // --- OBSERVABILITY & HEALTH CHECK (Phase 5 & 6) ---
  app.get('/api/health', async (_req, res) => {
    try {
      const dbHealth = await checkDatabaseHealth();
      res.json({
        status: dbHealth.connected ? 'ok' : 'degraded',
        service: 'rsplay-tv-takemaster-v2',
        version: '2.1.0-saas',
        timestamp: new Date().toISOString(),
        database: dbHealth,
        ai: {
          configured: isAiConfigured(),
          provider: 'nvidia-nim',
          nim: getNimModelConfig(),
        },
        metrics: getSystemMetrics(),
      });
    } catch (err: any) {
      res.status(503).json({
        status: 'error',
        code: 'PERSISTENCE_ERROR',
        message: err?.message || 'Falha no health check de persistência.',
      });
    }
  });

  app.get('/api/metrics', requireAuth, async (_req, res) => {
    res.json(getSystemMetrics());
  });

  // --- AUTHENTICATION & PROGRAM-LEVEL RBAC SESSION ---
  app.get('/api/auth/session', requireAuth, async (req, res, next) => {
    try {
      const auth = await getAuthContext(req);
      const session = await buildAuthSession(auth.userId, auth.organizationId);
      const orgUsers = await listOrganizationUsersWithPermissions(auth.organizationId);
      const availableOrganizations = await listOrganizationsByIds(
        session.memberships.map((membership) => membership.organizationId)
      );
      res.json({
        session,
        availableUsers: orgUsers,
        availableOrganizations,
      });
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/auth/login', async (req, res, next) => {
    try {
      const { emailOrUserId, organizationId, loginCode } = req.body || {};
      const session = await loginWithEmailOrUserId(emailOrUserId, organizationId, loginCode);
      await recordAuditLog(
        session.activeOrganization.id,
        session.user.id,
        'auth_session',
        session.user.id,
        'login',
        {
          email: session.user.email,
          role: session.role,
          allowedShowsCount: session.allowedShowIds.length,
        }
      );
      res.json({ session });
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/auth/register', async (req, res, next) => {
    try {
      const organizationId = req.body?.organizationId || 'org-takemaster-studio';
      const result = await registerSaaSAccountWithSubscription(req.body || {}, organizationId);
      const session = await buildAuthSession(result.user.id, organizationId);
      res.status(201).json({
        session,
        user: result.user,
        show: result.show,
        subscription: result.subscription,
        invoice: result.invoice,
        gatewayEvent: result.gatewayEvent,
        paymentIntentId: result.paymentIntentId,
        setupState: result.setupState,
      });
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/auth/switch-org', requireAuth, async (req, res, next) => {
    try {
      const auth = await getAuthContext(req);
      const { organizationId } = req.body || {};
      if (!organizationId || typeof organizationId !== 'string') {
        throw new AppError(400, 'VALIDATION_ERROR', 'organizationId é obrigatório.');
      }
      const session = await buildAuthSession(auth.userId, organizationId);
      await recordAuditLog(
        session.activeOrganization.id,
        session.user.id,
        'organization',
        session.activeOrganization.id,
        'switched_context',
        { role: session.role }
      );
      res.json({ session });
    } catch (err) {
      next(err);
    }
  });

  // --- WORKSPACE STATE AGGREGATOR (Filtered by Program-Level RBAC) ---
  app.get('/api/state', requireAuth, async (req, res, next) => {
    try {
      const auth = await getAuthContext(req);
      const session = await buildAuthSession(auth.userId, auth.organizationId);
      const allowedFilter = session.isFullAccessAdmin ? undefined : session.allowedShowIds;
      const orgUsers = await listOrganizationUsersWithPermissions(auth.organizationId);

      res.json({
        session,
        availableUsers: orgUsers,
        shows: await listShows(auth.organizationId, allowedFilter),
        productions: await listProductions(auth.organizationId, undefined, allowedFilter),
        episodes: await listEpisodes(auth.organizationId, undefined, allowedFilter),
        guests: await listParticipants(auth.organizationId),
        scheduleEvents: await listScheduleEvents(auth.organizationId, undefined, allowedFilter),
        libraryAssets: await listLibraryAssets(auth.organizationId, undefined, allowedFilter),
        auditLogs: await listAuditLogs(auth.organizationId, 30),
      });
    } catch (err) {
      next(err);
    }
  });

  // --- RSPLAY TV SAAS BILLING & PAYMENT GATEWAY ENDPOINTS ---
  app.get('/api/billing/overview', requireAuth, async (req, res, next) => {
    try {
      const auth = await getAuthContext(req);
      requireOrganizationAdmin(auth);
      res.json({
        plans: await listSaaSPlans(),
        subscriptions: await listOrganizationSubscriptions(auth.organizationId),
        invoices: await listBillingInvoices(auth.organizationId),
        gatewayEvents: await listPaymentGatewayEvents(auth.organizationId),
      });
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/billing/subscribe', requireAuth, async (req, res, next) => {
    try {
      const auth = await getAuthContext(req);
      requireOrganizationAdmin(auth);
      const {
        planId,
        showId,
        paymentMethodType,
        paymentMethodLast4,
        paymentMethodBrand,
        autoRenew,
      } = req.body || {};

      if (!planId) {
        throw new AppError(400, 'VALIDATION_ERROR', 'planId do plano mensal é obrigatório.');
      }

      const result = await subscribeOrUpdatePlan(
        auth.organizationId,
        {
          planId,
          showId,
          paymentMethodType,
          paymentMethodLast4,
          paymentMethodBrand,
          autoRenew,
        },
        auth.userId
      );
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/billing/subscriptions/:id/auto-renew', requireAuth, async (req, res, next) => {
    try {
      const auth = await getAuthContext(req);
      requireOrganizationAdmin(auth);
      const { autoRenew } = req.body || {};
      const updated = await toggleSubscriptionAutoRenew(
        auth.organizationId,
        req.params.id,
        Boolean(autoRenew),
        auth.userId
      );
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/billing/subscriptions/:id/renew-now', requireAuth, async (req, res, next) => {
    try {
      const auth = await getAuthContext(req);
      requireOrganizationAdmin(auth);
      const { simulateFailure } = req.body || {};
      const result = await processAutomaticRenewalCycle(
        auth.organizationId,
        req.params.id,
        Boolean(simulateFailure),
        auth.userId
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // --- VENOPAG PAYMENT WEBHOOK & PAYMENT INTENT MANAGEMENT ---
  app.post('/api/billing/webhook/venopag', async (req, res, next) => {
    try {
      const signature = req.headers['x-venopag-signature'] as string;
      const timestamp = req.headers['x-venopag-timestamp'] as string;
      const webhookSecret = process.env.VENOPAG_WEBHOOK_SECRET || '';

      if (!signature || !timestamp) {
        return res.status(400).json({ code: 'INVALID_WEBHOOK', message: 'Assinatura ou timestamp ausente.' });
      }

      if (!webhookSecret) {
        incrementMetric('webhookMisconfiguredTotal');
        logStructured('ERROR', 'venopag_webhook_secret_missing', {});
        return res.status(500).json({ code: 'CONFIGURATION_ERROR', message: 'Webhook VenoPag não configurado.' });
      }

      // Check timestamp freshness (5 minutes tolerance)
      const nowSec = Math.floor(Date.now() / 1000);
      const ts = parseInt(timestamp, 10);
      if (isNaN(ts) || Math.abs(nowSec - ts) > 300) {
        incrementMetric('webhookInvalidTimestampTotal');
        return res.status(400).json({ code: 'INVALID_TIMESTAMP', message: 'Timestamp inválido ou expirado.' });
      }

      // Verify HMAC-SHA256 signature over the raw request body
      const rawBody = (req as any).rawBody || '';
      const expectedSig = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      const providedSigHash = crypto.createHash('sha256').update(signature).digest();
      const expectedSigHash = crypto.createHash('sha256').update(expectedSig).digest();
      if (!crypto.timingSafeEqual(providedSigHash, expectedSigHash)) {
        incrementMetric('webhookInvalidSignatureTotal');
        return res.status(401).json({ code: 'INVALID_SIGNATURE', message: 'Assinatura do webhook inválida.' });
      }
      
      const event = req.body;
      const eventType = event?.event_type || event?.type;
      const transactionId = event?.transaction_id || event?.id;
      const payload = event;
      
      if (!eventType || !transactionId) {
        return res.status(400).json({ code: 'INVALID_PAYLOAD', message: 'Payload de webhook inválido.' });
      }
      
      // Find payment intent by gateway transaction ID
      const intentResult = await db.from('payment_intents').select('*').eq('gateway_transaction_id', transactionId).maybeSingle();
      
      // If not found by transaction ID, try by metadata or create new record
      let intent = intentResult.data;
      if (!intent) {
        // Try to find by metadata reference
        const refResult = await db.from('payment_intents').select('*').eq('metadata->>reference', transactionId).maybeSingle();
        intent = refResult.data;
      }
      
      if (!intent) {
        // Log unknown transaction but don't fail - could be new payment
        await recordAuditLog('unknown', 'system', 'payment_webhook', transactionId, 'unknown_transaction', {
          eventType,
          payload: JSON.stringify(payload).slice(0, 1000),
        });
        return res.json({ received: true, status: 'unknown_transaction' });
      }
      
      // Idempotency: check if already processed
      if (intent.status === 'payment_confirmed' && eventType === 'payment_confirmed') {
        return res.json({ received: true, status: 'already_processed' });
      }
      
      // Record gateway event
      await db.from('payment_gateway_events').insert({
        organization_id: intent.organization_id,
        subscription_id: intent.subscription_id,
        provider: 'venopag',
        event_type: eventType,
        status: eventType,
        payload,
        created_at: now(),
      });
      
      // Process based on event type
      switch (eventType) {
        case 'payment_confirmed':
        case 'charge.confirmed':
        case 'pix.confirmed':
          await confirmPaymentAndActivateSubscription(
            intent.organization_id,
            intent.id,
            transactionId,
            payload
          );
          break;
        case 'payment_failed':
        case 'charge.failed':
        case 'pix.failed':
        case 'payment_expired':
        case 'charge.expired':
          await handlePaymentFailure(
            intent.organization_id,
            intent.id,
            payload?.failure_reason || payload?.error_message || 'Pagamento falhou ou expirou'
          );
          break;
        case 'payment_pending':
        case 'charge.pending':
        case 'pix.pending':
          await updatePaymentIntentStatus(intent.id, 'pending_payment', {
            gatewayTransactionId: transactionId,
            gatewayPayload: payload,
            webhookReceivedAt: now(),
          });
          break;
        default:
          // Log unknown event type
          await recordAuditLog(intent.organization_id, 'system', 'payment_webhook', intent.id, 'unhandled_event_type', {
            eventType,
            intentId: intent.id,
          });
      }
      
      res.json({ received: true, status: 'processed' });
    } catch (err) {
      next(err);
    }
  });

  // Payment intent status check (for polling fallback)
  app.get('/api/billing/payment-intents/:id', requireAuth, async (req, res, next) => {
    try {
      const auth = await getAuthContext(req);
      const intent = await db.from('payment_intents').select('*').eq('id', req.params.id).eq('organization_id', auth.organizationId).single();
      if (intent.error) throw new AppError(404, 'NOT_FOUND', 'Intenção de pagamento não encontrada.');
      res.json(mapPaymentIntent(intent.data));
    } catch (err) {
      next(err);
    }
  });

  // --- SETUP STATE ENDPOINTS ---
  app.get('/api/setup/state/:programId', requireAuth, async (req, res, next) => {
    try {
      const auth = await getAuthContext(req);
      await assertUserCanAccessShow(auth.organizationId, auth.userId, auth.role, req.params.programId, 'canView');
      const state = await getSetupState(auth.organizationId, req.params.programId);
      res.json(state);
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/setup/run/:programId', requireAuth, async (req, res, next) => {
    try {
      const auth = await getAuthContext(req);
      await assertUserCanAccessShow(auth.organizationId, auth.userId, auth.role, req.params.programId, 'canEditEditorial');
      const state = await populateOrganizationWorkspace(auth.organizationId, req.params.programId, auth.userId);
      res.json(state);
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/setup/retry/:programId', requireAuth, async (req, res, next) => {
    try {
      const auth = await getAuthContext(req);
      await assertUserCanAccessShow(auth.organizationId, auth.userId, auth.role, req.params.programId, 'canEditEditorial');
      // Reset failed state to pending
      await upsertSetupState(auth.organizationId, req.params.programId, {
        status: 'setup_pending',
        error: null,
      });
      const state = await populateOrganizationWorkspace(auth.organizationId, req.params.programId, auth.userId);
      res.json(state);
    } catch (err) {
      next(err);
    }
  });

  // --- RSPLAY TV SAAS ADMIN PANEL ENDPOINTS (Users, RBAC, Subscriptions & Detailed Reports) ---
  // Global admin panel - requires platform_admin role
  app.get('/api/admin/overview', requireAuth, async (req, res, next) => {
    try {
      const auth = await getAuthContext(req);
      requirePlatformAdmin(auth);
      res.json({
        users: await listOrganizationUsersWithPermissions(auth.organizationId),
        shows: await listShows(auth.organizationId),
        plans: await listSaaSPlans(),
        subscriptions: await listOrganizationSubscriptions(auth.organizationId),
        invoices: await listBillingInvoices(auth.organizationId),
        gatewayEvents: await listPaymentGatewayEvents(auth.organizationId),
        reportSummary: await buildAdminReportSummary(auth.organizationId),
        auditLogs: await listAuditLogs(auth.organizationId, 50),
      });
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/admin/users', requireAuth, async (req, res, next) => {
    try {
      const auth = await getAuthContext(req);
      requirePlatformAdmin(auth);
      const created = await createOrganizationUserWithShowPermissions(
        auth.organizationId,
        req.body || {},
        auth.userId
      );
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  });

  app.put('/api/admin/users/:id/permissions', requireAuth, async (req, res, next) => {
    try {
      const auth = await getAuthContext(req);
      requirePlatformAdmin(auth);
      const { permissions } = req.body || {};
      if (!Array.isArray(permissions)) {
        throw new AppError(400, 'VALIDATION_ERROR', 'permissions deve ser uma lista.');
      }
      const updated = await updateUserShowPermissions(
        auth.organizationId,
        req.params.id,
        permissions,
        auth.userId
      );
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  app.put('/api/admin/users/:id/status', requireAuth, async (req, res, next) => {
    try {
      const auth = await getAuthContext(req);
      requirePlatformAdmin(auth);
      const updated = await updateOrganizationUserStatusOrRole(
        auth.organizationId,
        req.params.id,
        req.body || {},
        auth.userId
      );
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });
  
  // Organization-scoped admin panel - for org admins to manage their own organization
  app.get('/api/admin/org/overview', requireAuth, async (req, res, next) => {
    try {
      const auth = await getAuthContext(req);
      requireOrganizationAdmin(auth);
      res.json({
        users: await listOrganizationUsersWithPermissions(auth.organizationId),
        shows: await listShows(auth.organizationId),
        plans: await listSaaSPlans(),
        subscriptions: await listOrganizationSubscriptions(auth.organizationId),
        invoices: await listBillingInvoices(auth.organizationId),
        gatewayEvents: await listPaymentGatewayEvents(auth.organizationId),
        reportSummary: await buildAdminReportSummary(auth.organizationId),
        auditLogs: await listAuditLogs(auth.organizationId, 50),
      });
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/admin/org/users', requireAuth, async (req, res, next) => {
    try {
      const auth = await getAuthContext(req);
      requireOrganizationAdmin(auth);
      const created = await createOrganizationUserWithShowPermissions(
        auth.organizationId,
        req.body || {},
        auth.userId
      );
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  });

  app.put('/api/admin/org/users/:id/permissions', requireAuth, async (req, res, next) => {
    try {
      const auth = await getAuthContext(req);
      requireOrganizationAdmin(auth);
      const { permissions } = req.body || {};
      if (!Array.isArray(permissions)) {
        throw new AppError(400, 'VALIDATION_ERROR', 'permissions deve ser uma lista.');
      }
      const updated = await updateUserShowPermissions(
        auth.organizationId,
        req.params.id,
        permissions,
        auth.userId
      );
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  app.put('/api/admin/org/users/:id/status', requireAuth, async (req, res, next) => {
    try {
      const auth = await getAuthContext(req);
      requireOrganizationAdmin(auth);
      const updated = await updateOrganizationUserStatusOrRole(
        auth.organizationId,
        req.params.id,
        req.body || {},
        auth.userId
      );
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  // --- SHOWS & CATALOG (Filtered by Program-Level RBAC) ---
  app.get('/api/shows', requireAuth, async (req, res, next) => {
    try {
      const auth = await getAuthContext(req);
      const allowedFilter = auth.isFullAccessAdmin ? undefined : auth.allowedShowIds;
      res.json(await listShows(auth.organizationId, allowedFilter));
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/shows', requireAuth, async (req, res, next) => {
    try {
      const auth = await getAuthContext(req);
      const validated = validateShowPayload(req.body, false);
      const created = await createShow(auth.organizationId, validated, auth.userId);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  });

  app.put('/api/shows/:id', requireAuth, async (req, res, next) => {
    try {
      const auth = await getAuthContext(req);
      await assertUserCanAccessShow(
        auth.organizationId,
        auth.userId,
        auth.role,
        req.params.id,
        'canEditEditorial'
      );
      const validated = validateShowPayload(req.body, true);
      const updated = await updateShow(auth.organizationId, req.params.id, validated, auth.userId);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  app.delete('/api/shows/:id', requireAuth, async (req, res, next) => {
    try {
      const auth = await getAuthContext(req);
      await assertUserCanAccessShow(
        auth.organizationId,
        auth.userId,
        auth.role,
        req.params.id,
        'canEditEditorial'
      );
      await deleteShow(auth.organizationId, req.params.id, auth.userId);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  });

  // --- RS PLAY KNOWLEDGE BASE, PROGRAM IDENTITY & PAUTAS CURATION (FASES 1 a 8) ---
  app.get('/api/knowledge-base/programs', (_req, res, next) => {
    try {
      res.json(listAvailableKnowledgeBasePrograms());
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/shows/:id/knowledge', requireAuth, async (req, res, next) => {
    try {
      const auth = await getAuthContext(req);
      await assertUserCanAccessShow(
        auth.organizationId,
        auth.userId,
        auth.role,
        req.params.id,
        'canView'
      );
      const show = await getShowById(auth.organizationId, req.params.id);
      const { summary } = resolveProgramKnowledge(show);
      res.json(summary);
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/shows/:id/editorial-identity', requireAuth, async (req, res, next) => {
    try {
      const auth = await getAuthContext(req);
      await assertUserCanAccessShow(
        auth.organizationId,
        auth.userId,
        auth.role,
        req.params.id,
        'canView'
      );
      const show = await getShowById(auth.organizationId, req.params.id);
      const episodes = await listEpisodes(auth.organizationId, show.id);
      const guests = await listParticipants(auth.organizationId);
      const identity = await generateProgramEditorialIdentity({
        show,
        episodes,
        guests,
        simulatePrimaryFailure: Boolean(req.body?.simulatePrimaryFailure),
        simulateTotalFailure: Boolean(
          req.body?.simulateTotalFailure || req.body?.simulateBothFailure
        ),
      });
      await recordAiGeneration({
        organizationId: auth.organizationId,
        programId: show.id,
        kind: 'program_editorial_identity',
        model: identity.modelUsed,
        prompt: { type: 'editorial_identity', showId: show.id, showTitle: show.title },
        result: identity,
        status: 'completed',
        createdBy: auth.userId,
      });
      await recordAuditLog(
        auth.organizationId,
        auth.userId,
        'show_editorial_identity',
        show.id,
        'generated',
        {
          showTitle: show.title,
          modelUsed: identity.modelUsed,
          usedFallback: identity.usedFallback,
        }
      );
      res.json(identity);
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/shows/:id/suggest-pautas', requireAuth, async (req, res, next) => {
    try {
      const auth = await getAuthContext(req);
      await assertUserCanAccessShow(
        auth.organizationId,
        auth.userId,
        auth.role,
        req.params.id,
        'canView'
      );
      const show = await getShowById(auth.organizationId, req.params.id);
      const episodes = await listEpisodes(auth.organizationId, show.id);
      const guests = await listParticipants(auth.organizationId);
      const curation = await generateProgramPitchSuggestions({
        show,
        episodes,
        guests,
        input: req.body || {},
        simulatePrimaryFailure: Boolean(req.body?.simulatePrimaryFailure),
        simulateTotalFailure: Boolean(
          req.body?.simulateTotalFailure || req.body?.simulateBothFailure
        ),
      });
      await recordAiGeneration({
        organizationId: auth.organizationId,
        programId: show.id,
        kind: 'program_pauta_curation',
        model: curation.modelUsed,
        prompt: { type: 'program_pauta_curation', input: req.body || {}, queryUsed: curation.queryUsed },
        result: curation,
        status: 'completed',
        createdBy: auth.userId,
      });
      await recordAuditLog(
        auth.organizationId,
        auth.userId,
        'show_pautas_curation',
        show.id,
        'suggested',
        {
          showTitle: show.title,
          queryUsed: curation.queryUsed,
          pautasCount: curation.pautas.length,
          modelUsed: curation.modelUsed,
          usedFallback: curation.usedFallback,
        }
      );
      res.json(curation);
    } catch (err) {
      next(err);
    }
  });

  // --- PRODUCTIONS / SEASONS (Filtered by Program-Level RBAC) ---
  app.get('/api/productions', requireAuth, async (req, res, next) => {
    try {
      const auth = await getAuthContext(req);
      const showId = req.query.showId as string | undefined;
      const allowedFilter = auth.isFullAccessAdmin ? undefined : auth.allowedShowIds;
      res.json(await listProductions(auth.organizationId, showId, allowedFilter));
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/productions', requireAuth, async (req, res, next) => {
    try {
      const auth = await getAuthContext(req);
      const validated = validateProductionPayload(req.body, false);
      await assertUserCanAccessShow(
        auth.organizationId,
        auth.userId,
        auth.role,
        validated.showId!,
        'canEditEditorial'
      );
      const created = await createProduction(auth.organizationId, validated, auth.userId);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  });

  app.put('/api/productions/:id', requireAuth, async (req, res, next) => {
    try {
      const auth = await getAuthContext(req);
      const validated = validateProductionPayload(req.body, true);
      const updated = await updateProduction(auth.organizationId, req.params.id, validated, auth.userId);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  app.delete('/api/productions/:id', requireAuth, async (req, res, next) => {
    try {
      const auth = await getAuthContext(req);
      await deleteProduction(auth.organizationId, req.params.id, auth.userId);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  });

  // --- EPISODES & EDITORIAL CORE (Filtered & Guarded by Program-Level RBAC) ---
  app.get('/api/episodes', requireAuth, async (req, res, next) => {
    try {
      const auth = await getAuthContext(req);
      const showId = req.query.showId as string | undefined;
      const allowedFilter = auth.isFullAccessAdmin ? undefined : auth.allowedShowIds;
      res.json(await listEpisodes(auth.organizationId, showId, allowedFilter));
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/episodes/:id', requireAuth, async (req, res, next) => {
    try {
      const auth = await getAuthContext(req);
      const ep = await getEpisodeById(auth.organizationId, req.params.id);
      await assertUserCanAccessShow(auth.organizationId, auth.userId, auth.role, ep.showId, 'canView');
      res.json(ep);
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/episodes', requireAuth, async (req, res, next) => {
    try {
      const auth = await getAuthContext(req);
      const validated = validateEpisodePayload(req.body, false);
      await assertUserCanAccessShow(
        auth.organizationId,
        auth.userId,
        auth.role,
        validated.showId!,
        'canEditEditorial'
      );
      const created = await createEpisode(auth.organizationId, validated, auth.userId);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  });

  app.put('/api/episodes/:id', requireAuth, async (req, res, next) => {
    try {
      const auth = await getAuthContext(req);
      const existing = await getEpisodeById(auth.organizationId, req.params.id);
      await assertUserCanAccessShow(
        auth.organizationId,
        auth.userId,
        auth.role,
        existing.showId,
        'canView'
      );
      const validated = validateEpisodePayload(req.body, true);
      const updated = await updateEpisode(auth.organizationId, req.params.id, validated, auth.userId);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  app.delete('/api/episodes/:id', requireAuth, async (req, res, next) => {
    try {
      const auth = await getAuthContext(req);
      const existing = await getEpisodeById(auth.organizationId, req.params.id);
      await assertUserCanAccessShow(
        auth.organizationId,
        auth.userId,
        auth.role,
        existing.showId,
        'canEditEditorial'
      );
      await deleteEpisode(auth.organizationId, req.params.id, auth.userId);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  });

  // --- PARTICIPANTS / GUESTS (Phase 1 & 2) ---
  const handleListGuests = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = await getAuthContext(req);
      res.json(await listParticipants(auth.organizationId));
    } catch (err) {
      next(err);
    }
  };

  const handleCreateGuest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = await getAuthContext(req);
      const validated = validateParticipantPayload(req.body, false);
      const created = await createParticipant(auth.organizationId, validated, auth.userId);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  };

  const handleUpdateGuest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = await getAuthContext(req);
      const validated = validateParticipantPayload(req.body, true);
      const updated = await updateParticipant(auth.organizationId, req.params.id, validated, auth.userId);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  };

  const handleDeleteGuest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = await getAuthContext(req);
      await deleteParticipant(auth.organizationId, req.params.id, auth.userId);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  };

  app.get('/api/guests', requireAuth, handleListGuests);
  app.post('/api/guests', requireAuth, handleCreateGuest);
  app.put('/api/guests/:id', requireAuth, handleUpdateGuest);
  app.delete('/api/guests/:id', requireAuth, handleDeleteGuest);

  app.get('/api/participants', requireAuth, handleListGuests);
  app.post('/api/participants', requireAuth, handleCreateGuest);
  app.put('/api/participants/:id', requireAuth, handleUpdateGuest);
  app.delete('/api/participants/:id', requireAuth, handleDeleteGuest);

  // --- SCHEDULE / AGENDA DE PRODUÇÃO (Filtered by Program-Level RBAC) ---
  app.get('/api/schedule', requireAuth, async (req, res, next) => {
    try {
      const auth = await getAuthContext(req);
      const showId = req.query.showId as string | undefined;
      const allowedFilter = auth.isFullAccessAdmin ? undefined : auth.allowedShowIds;
      res.json(await listScheduleEvents(auth.organizationId, showId, allowedFilter));
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/schedule', requireAuth, async (req, res, next) => {
    try {
      const auth = await getAuthContext(req);
      const validated = validateScheduleEventPayload(req.body, false);
      await assertUserCanAccessShow(
        auth.organizationId,
        auth.userId,
        auth.role,
        validated.showId!,
        'canView'
      );
      const created = await createScheduleEvent(auth.organizationId, validated, auth.userId);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  });

  app.put('/api/schedule/:id', requireAuth, async (req, res, next) => {
    try {
      const auth = await getAuthContext(req);
      const validated = validateScheduleEventPayload(req.body, true);
      const updated = await updateScheduleEvent(
        auth.organizationId,
        req.params.id,
        validated,
        auth.userId
      );
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  app.delete('/api/schedule/:id', requireAuth, async (req, res, next) => {
    try {
      const auth = await getAuthContext(req);
      await deleteScheduleEvent(auth.organizationId, req.params.id, auth.userId);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  });

  // --- LIBRARY ASSETS / BIBLIOTECA DE ASSETS (Filtered by Program-Level RBAC) ---
  app.get('/api/library', requireAuth, async (req, res, next) => {
    try {
      const auth = await getAuthContext(req);
      const showId = req.query.showId as string | undefined;
      const allowedFilter = auth.isFullAccessAdmin ? undefined : auth.allowedShowIds;
      res.json(await listLibraryAssets(auth.organizationId, showId, allowedFilter));
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/library', requireAuth, async (req, res, next) => {
    try {
      const auth = await getAuthContext(req);
      const validated = validateLibraryAssetPayload(req.body, false);
      if (validated.showId) {
        await assertUserCanAccessShow(
          auth.organizationId,
          auth.userId,
          auth.role,
          validated.showId,
          'canView'
        );
      }
      const created = await createLibraryAsset(auth.organizationId, validated, auth.userId);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  });

  app.put('/api/library/:id', requireAuth, async (req, res, next) => {
    try {
      const auth = await getAuthContext(req);
      const validated = validateLibraryAssetPayload(req.body, true);
      const updated = await updateLibraryAsset(
        auth.organizationId,
        req.params.id,
        validated,
        auth.userId
      );
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  app.delete('/api/library/:id', requireAuth, async (req, res, next) => {
    try {
      const auth = await getAuthContext(req);
      await deleteLibraryAsset(auth.organizationId, req.params.id, auth.userId);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  });

  // --- AUDIT LOGS & EXPLICIT DEMO SEED RESET ---
  app.get('/api/audit', requireAuth, async (req, res, next) => {
    try {
      const auth = await getAuthContext(req);
      res.json(await listAuditLogs(auth.organizationId, 50));
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/seed/reset', requireAuth, async (_req, _res, next) => {
    next(new AppError(403, 'FORBIDDEN_CONTEXT', 'Seed/reset de dados de produção está desabilitado.'));
  });

  // --- RELIABLE AI GENERATION ENDPOINTS (Phase 4) ---
  app.post('/api/ai/diagnosis', requireAuth, async (req, res, next) => {
    try {
      const auth = await getAuthContext(req);
      const diagnosis = await generateEditorialDiagnosis(req.body || {});
      await recordAuditLog(auth.organizationId, auth.userId, 'ai_generation', 'diagnosis', 'generated', {
        episodeTitle: req.body?.episodeTitle,
      });
      res.json(diagnosis);
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/ai/research', requireAuth, async (req, res, next) => {
    try {
      const auth = await getAuthContext(req);
      const research = await generateEditorialResearch(req.body || {});
      await recordAuditLog(auth.organizationId, auth.userId, 'ai_generation', 'research', 'generated', {
        guestName: req.body?.guestName,
      });
      res.json(research);
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/ai/outline', requireAuth, async (req, res, next) => {
    try {
      const auth = await getAuthContext(req);
      const result = await generateSmartOutline(req.body || {});
      await recordAuditLog(auth.organizationId, auth.userId, 'ai_generation', 'outline', 'generated', {
        episodeId: req.body?.episode?.id,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/ai/script', requireAuth, async (req, res, next) => {
    try {
      const auth = await getAuthContext(req);
      const result = await generateStudioScript(req.body || {});
      await recordAuditLog(auth.organizationId, auth.userId, 'ai_generation', 'script', 'generated', {
        episodeId: req.body?.episode?.id,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/ai/repiques', requireAuth, async (req, res, next) => {
    try {
      const result = await generateFollowUpRepiques(req.body || {});
      res.json({ followUps: result });
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/ai/shorts', requireAuth, async (req, res, next) => {
    try {
      const result = await generatePlannedShorts(req.body || {});
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/ai/editor-script', requireAuth, async (req, res, next) => {
    try {
      const result = await generateEditorScriptSynthesis(req.body || {});
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/ai/assist', requireAuth, async (req, res, next) => {
    try {
      const result = await generateContextualAssist(req.body || {});
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // --- STANDARDIZED ERROR HANDLER (Phase 1) ---
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const requestId = (req as any).requestId;
    if (err instanceof AppError) {
      incrementMetric('errorsTotal', `${err.code}: ${err.message}`);
      res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        details: err.details,
        requestId,
      });
      return;
    }

    incrementMetric('errorsTotal', err?.message || 'Erro interno');
    logStructured('ERROR', 'unhandled_api_error', {
      requestId,
      path: req.path,
      error: String(err?.message || err),
    });

    res.status(500).json({
      code: 'PERSISTENCE_ERROR',
      message: err?.message || 'Erro interno no servidor RSPlay TV — TakeMaster V2.',
      requestId,
    });
  });

  return app;
}

async function startServer() {
  const app = createApiApp();
  const PORT = Number(process.env.PORT) || 3000;

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', async (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    logStructured('INFO', 'server_started', {
      port: PORT,
      url: `http://localhost:${PORT}`,
    });
  });
}

const isMainModule =
  process.argv[1] &&
  (process.argv[1].endsWith('server.ts') || process.argv[1].endsWith('server.js'));

if (isMainModule) {
  startServer();
}
