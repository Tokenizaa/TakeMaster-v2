import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  assertUserCanAccessShow,
  buildAdminReportSummary,
  checkDatabaseHealth,
  createEpisode,
  createLibraryAsset,
  createOrganizationUserWithShowPermissions,
  createParticipant,
  createProduction,
  createScheduleEvent,
  createShow,
  deleteEpisode,
  deleteLibraryAsset,
  deleteParticipant,
  deleteProduction,
  deleteScheduleEvent,
  deleteShow,
  getDbConnection,
  getEpisodeById,
  listAuditLogs,
  listBillingInvoices,
  listEpisodes,
  listLibraryAssets,
  listOrganizationSubscriptions,
  listOrganizationUsersWithPermissions,
  listParticipants,
  listPaymentGatewayEvents,
  listProductions,
  listSaaSPlans,
  listScheduleEvents,
  listShows,
  listUsersAndOrganizations,
  populateOrganizationWorkspace,
  processAutomaticRenewalCycle,
  recordAuditLog,
  subscribeOrUpdatePlan,
  toggleSubscriptionAutoRenew,
  updateEpisode,
  updateLibraryAsset,
  updateOrganizationUserStatusOrRole,
  updateParticipant,
  updateProduction,
  updateScheduleEvent,
  updateShow,
  updateUserShowPermissions,
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
  generateSmartOutline,
  generateStudioScript,
  isGeminiConfigured,
} from './src/server/ai';
import {
  getSystemMetrics,
  incrementMetric,
  logStructured,
  requestTracingMiddleware,
} from './src/server/logger';

export function createApiApp() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use(requestTracingMiddleware);

  // --- OBSERVABILITY & HEALTH CHECK (Phase 5 & 6) ---
  app.get('/api/health', (_req, res) => {
    try {
      const dbHealth = checkDatabaseHealth();
      res.json({
        status: dbHealth.connected ? 'ok' : 'degraded',
        service: 'rsplay-tv-takemaster-v2',
        version: '2.1.0-saas',
        timestamp: new Date().toISOString(),
        database: dbHealth,
        ai: {
          geminiConfigured: isGeminiConfigured(),
          model: 'gemini-3-flash-preview',
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

  app.get('/api/metrics', requireAuth, (_req, res) => {
    res.json(getSystemMetrics());
  });

  // --- AUTHENTICATION & PROGRAM-LEVEL RBAC SESSION ---
  app.get('/api/auth/session', requireAuth, (req, res, next) => {
    try {
      const auth = getAuthContext(req);
      const session = buildAuthSession(auth.userId, auth.organizationId);
      const directory = listUsersAndOrganizations();
      const orgUsers = listOrganizationUsersWithPermissions(auth.organizationId);
      res.json({
        session,
        availableUsers: orgUsers.length > 0 ? orgUsers : directory.users,
        availableOrganizations: directory.organizations,
      });
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/auth/login', (req, res, next) => {
    try {
      const { emailOrUserId, organizationId, loginCode } = req.body || {};
      const session = loginWithEmailOrUserId(emailOrUserId, organizationId, loginCode);
      recordAuditLog(
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

  app.post('/api/auth/switch-org', requireAuth, (req, res, next) => {
    try {
      const auth = getAuthContext(req);
      const { organizationId } = req.body || {};
      if (!organizationId || typeof organizationId !== 'string') {
        throw new AppError(400, 'VALIDATION_ERROR', 'organizationId é obrigatório.');
      }
      const session = buildAuthSession(auth.userId, organizationId);
      recordAuditLog(
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
  app.get('/api/state', requireAuth, (req, res, next) => {
    try {
      const auth = getAuthContext(req);
      const session = buildAuthSession(auth.userId, auth.organizationId);
      const allowedFilter = session.isFullAccessAdmin ? undefined : session.allowedShowIds;
      const orgUsers = listOrganizationUsersWithPermissions(auth.organizationId);

      res.json({
        session,
        availableUsers: orgUsers,
        shows: listShows(auth.organizationId, allowedFilter),
        productions: listProductions(auth.organizationId, undefined, allowedFilter),
        episodes: listEpisodes(auth.organizationId, undefined, allowedFilter),
        guests: listParticipants(auth.organizationId),
        scheduleEvents: listScheduleEvents(auth.organizationId, undefined, allowedFilter),
        libraryAssets: listLibraryAssets(auth.organizationId, undefined, allowedFilter),
        auditLogs: listAuditLogs(auth.organizationId, 30),
      });
    } catch (err) {
      next(err);
    }
  });

  // --- RSPLAY TV SAAS BILLING & PAYMENT GATEWAY ENDPOINTS ---
  app.get('/api/billing/overview', requireAuth, (req, res, next) => {
    try {
      const auth = getAuthContext(req);
      res.json({
        plans: listSaaSPlans(),
        subscriptions: listOrganizationSubscriptions(auth.organizationId),
        invoices: listBillingInvoices(auth.organizationId),
        gatewayEvents: listPaymentGatewayEvents(auth.organizationId),
      });
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/billing/subscribe', requireAuth, (req, res, next) => {
    try {
      const auth = getAuthContext(req);
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

      const result = subscribeOrUpdatePlan(
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

  app.post('/api/billing/subscriptions/:id/auto-renew', requireAuth, (req, res, next) => {
    try {
      const auth = getAuthContext(req);
      const { autoRenew } = req.body || {};
      const updated = toggleSubscriptionAutoRenew(
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

  app.post('/api/billing/subscriptions/:id/renew-now', requireAuth, (req, res, next) => {
    try {
      const auth = getAuthContext(req);
      const { simulateFailure } = req.body || {};
      const result = processAutomaticRenewalCycle(
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

  // --- RSPLAY TV SAAS ADMIN PANEL ENDPOINTS (Users, RBAC, Subscriptions & Detailed Reports) ---
  app.get('/api/admin/overview', requireAuth, (req, res, next) => {
    try {
      const auth = getAuthContext(req);
      res.json({
        users: listOrganizationUsersWithPermissions(auth.organizationId),
        shows: listShows(auth.organizationId),
        plans: listSaaSPlans(),
        subscriptions: listOrganizationSubscriptions(auth.organizationId),
        invoices: listBillingInvoices(auth.organizationId),
        gatewayEvents: listPaymentGatewayEvents(auth.organizationId),
        reportSummary: buildAdminReportSummary(auth.organizationId),
        auditLogs: listAuditLogs(auth.organizationId, 50),
      });
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/admin/users', requireAuth, (req, res, next) => {
    try {
      const auth = getAuthContext(req);
      const created = createOrganizationUserWithShowPermissions(
        auth.organizationId,
        req.body || {},
        auth.userId
      );
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  });

  app.put('/api/admin/users/:id/permissions', requireAuth, (req, res, next) => {
    try {
      const auth = getAuthContext(req);
      const { permissions } = req.body || {};
      if (!Array.isArray(permissions)) {
        throw new AppError(400, 'VALIDATION_ERROR', 'permissions deve ser uma lista.');
      }
      const updated = updateUserShowPermissions(
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

  app.put('/api/admin/users/:id/status', requireAuth, (req, res, next) => {
    try {
      const auth = getAuthContext(req);
      const updated = updateOrganizationUserStatusOrRole(
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
  app.get('/api/shows', requireAuth, (req, res, next) => {
    try {
      const auth = getAuthContext(req);
      const allowedFilter = auth.isFullAccessAdmin ? undefined : auth.allowedShowIds;
      res.json(listShows(auth.organizationId, allowedFilter));
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/shows', requireAuth, (req, res, next) => {
    try {
      const auth = getAuthContext(req);
      const validated = validateShowPayload(req.body, false);
      const created = createShow(auth.organizationId, validated, auth.userId);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  });

  app.put('/api/shows/:id', requireAuth, (req, res, next) => {
    try {
      const auth = getAuthContext(req);
      assertUserCanAccessShow(
        auth.organizationId,
        auth.userId,
        auth.role,
        req.params.id,
        'canEditEditorial'
      );
      const validated = validateShowPayload(req.body, true);
      const updated = updateShow(auth.organizationId, req.params.id, validated, auth.userId);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  app.delete('/api/shows/:id', requireAuth, (req, res, next) => {
    try {
      const auth = getAuthContext(req);
      assertUserCanAccessShow(
        auth.organizationId,
        auth.userId,
        auth.role,
        req.params.id,
        'canEditEditorial'
      );
      deleteShow(auth.organizationId, req.params.id, auth.userId);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  });

  // --- PRODUCTIONS / SEASONS (Filtered by Program-Level RBAC) ---
  app.get('/api/productions', requireAuth, (req, res, next) => {
    try {
      const auth = getAuthContext(req);
      const showId = req.query.showId as string | undefined;
      const allowedFilter = auth.isFullAccessAdmin ? undefined : auth.allowedShowIds;
      res.json(listProductions(auth.organizationId, showId, allowedFilter));
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/productions', requireAuth, (req, res, next) => {
    try {
      const auth = getAuthContext(req);
      const validated = validateProductionPayload(req.body, false);
      assertUserCanAccessShow(
        auth.organizationId,
        auth.userId,
        auth.role,
        validated.showId!,
        'canEditEditorial'
      );
      const created = createProduction(auth.organizationId, validated, auth.userId);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  });

  app.put('/api/productions/:id', requireAuth, (req, res, next) => {
    try {
      const auth = getAuthContext(req);
      const validated = validateProductionPayload(req.body, true);
      const updated = updateProduction(auth.organizationId, req.params.id, validated, auth.userId);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  app.delete('/api/productions/:id', requireAuth, (req, res, next) => {
    try {
      const auth = getAuthContext(req);
      deleteProduction(auth.organizationId, req.params.id, auth.userId);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  });

  // --- EPISODES & EDITORIAL CORE (Filtered & Guarded by Program-Level RBAC) ---
  app.get('/api/episodes', requireAuth, (req, res, next) => {
    try {
      const auth = getAuthContext(req);
      const showId = req.query.showId as string | undefined;
      const allowedFilter = auth.isFullAccessAdmin ? undefined : auth.allowedShowIds;
      res.json(listEpisodes(auth.organizationId, showId, allowedFilter));
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/episodes/:id', requireAuth, (req, res, next) => {
    try {
      const auth = getAuthContext(req);
      const ep = getEpisodeById(auth.organizationId, req.params.id);
      assertUserCanAccessShow(auth.organizationId, auth.userId, auth.role, ep.showId, 'canView');
      res.json(ep);
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/episodes', requireAuth, (req, res, next) => {
    try {
      const auth = getAuthContext(req);
      const validated = validateEpisodePayload(req.body, false);
      assertUserCanAccessShow(
        auth.organizationId,
        auth.userId,
        auth.role,
        validated.showId!,
        'canEditEditorial'
      );
      const created = createEpisode(auth.organizationId, validated, auth.userId);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  });

  app.put('/api/episodes/:id', requireAuth, (req, res, next) => {
    try {
      const auth = getAuthContext(req);
      const existing = getEpisodeById(auth.organizationId, req.params.id);
      assertUserCanAccessShow(
        auth.organizationId,
        auth.userId,
        auth.role,
        existing.showId,
        'canView'
      );
      const validated = validateEpisodePayload(req.body, true);
      const updated = updateEpisode(auth.organizationId, req.params.id, validated, auth.userId);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  app.delete('/api/episodes/:id', requireAuth, (req, res, next) => {
    try {
      const auth = getAuthContext(req);
      const existing = getEpisodeById(auth.organizationId, req.params.id);
      assertUserCanAccessShow(
        auth.organizationId,
        auth.userId,
        auth.role,
        existing.showId,
        'canEditEditorial'
      );
      deleteEpisode(auth.organizationId, req.params.id, auth.userId);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  });

  // --- PARTICIPANTS / GUESTS (Phase 1 & 2) ---
  const handleListGuests = (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = getAuthContext(req);
      res.json(listParticipants(auth.organizationId));
    } catch (err) {
      next(err);
    }
  };

  const handleCreateGuest = (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = getAuthContext(req);
      const validated = validateParticipantPayload(req.body, false);
      const created = createParticipant(auth.organizationId, validated, auth.userId);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  };

  const handleUpdateGuest = (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = getAuthContext(req);
      const validated = validateParticipantPayload(req.body, true);
      const updated = updateParticipant(auth.organizationId, req.params.id, validated, auth.userId);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  };

  const handleDeleteGuest = (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = getAuthContext(req);
      deleteParticipant(auth.organizationId, req.params.id, auth.userId);
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
  app.get('/api/schedule', requireAuth, (req, res, next) => {
    try {
      const auth = getAuthContext(req);
      const showId = req.query.showId as string | undefined;
      const allowedFilter = auth.isFullAccessAdmin ? undefined : auth.allowedShowIds;
      res.json(listScheduleEvents(auth.organizationId, showId, allowedFilter));
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/schedule', requireAuth, (req, res, next) => {
    try {
      const auth = getAuthContext(req);
      const validated = validateScheduleEventPayload(req.body, false);
      assertUserCanAccessShow(
        auth.organizationId,
        auth.userId,
        auth.role,
        validated.showId!,
        'canView'
      );
      const created = createScheduleEvent(auth.organizationId, validated, auth.userId);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  });

  app.put('/api/schedule/:id', requireAuth, (req, res, next) => {
    try {
      const auth = getAuthContext(req);
      const validated = validateScheduleEventPayload(req.body, true);
      const updated = updateScheduleEvent(
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

  app.delete('/api/schedule/:id', requireAuth, (req, res, next) => {
    try {
      const auth = getAuthContext(req);
      deleteScheduleEvent(auth.organizationId, req.params.id, auth.userId);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  });

  // --- LIBRARY ASSETS / BIBLIOTECA DE ASSETS (Filtered by Program-Level RBAC) ---
  app.get('/api/library', requireAuth, (req, res, next) => {
    try {
      const auth = getAuthContext(req);
      const showId = req.query.showId as string | undefined;
      const allowedFilter = auth.isFullAccessAdmin ? undefined : auth.allowedShowIds;
      res.json(listLibraryAssets(auth.organizationId, showId, allowedFilter));
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/library', requireAuth, (req, res, next) => {
    try {
      const auth = getAuthContext(req);
      const validated = validateLibraryAssetPayload(req.body, false);
      if (validated.showId) {
        assertUserCanAccessShow(
          auth.organizationId,
          auth.userId,
          auth.role,
          validated.showId,
          'canView'
        );
      }
      const created = createLibraryAsset(auth.organizationId, validated, auth.userId);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  });

  app.put('/api/library/:id', requireAuth, (req, res, next) => {
    try {
      const auth = getAuthContext(req);
      const validated = validateLibraryAssetPayload(req.body, true);
      const updated = updateLibraryAsset(
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

  app.delete('/api/library/:id', requireAuth, (req, res, next) => {
    try {
      const auth = getAuthContext(req);
      deleteLibraryAsset(auth.organizationId, req.params.id, auth.userId);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  });

  // --- AUDIT LOGS & EXPLICIT DEMO SEED RESET ---
  app.get('/api/audit', requireAuth, (req, res, next) => {
    try {
      const auth = getAuthContext(req);
      res.json(listAuditLogs(auth.organizationId, 50));
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/seed/reset', requireAuth, (req, res, next) => {
    try {
      const auth = getAuthContext(req);
      const db = getDbConnection();
      populateOrganizationWorkspace(db, auth.organizationId);
      recordAuditLog(
        auth.organizationId,
        auth.userId,
        'organization',
        auth.organizationId,
        'seed_reset',
        {}
      );
      const session = buildAuthSession(auth.userId, auth.organizationId);
      const allowedFilter = session.isFullAccessAdmin ? undefined : session.allowedShowIds;
      res.json({
        success: true,
        session,
        shows: listShows(auth.organizationId, allowedFilter),
        productions: listProductions(auth.organizationId, undefined, allowedFilter),
        episodes: listEpisodes(auth.organizationId, undefined, allowedFilter),
        guests: listParticipants(auth.organizationId),
        scheduleEvents: listScheduleEvents(auth.organizationId, undefined, allowedFilter),
        libraryAssets: listLibraryAssets(auth.organizationId, undefined, allowedFilter),
      });
    } catch (err) {
      next(err);
    }
  });

  // --- RELIABLE AI GENERATION ENDPOINTS (Phase 4) ---
  app.post('/api/ai/diagnosis', requireAuth, async (req, res, next) => {
    try {
      const auth = getAuthContext(req);
      const diagnosis = await generateEditorialDiagnosis(req.body || {});
      recordAuditLog(auth.organizationId, auth.userId, 'ai_generation', 'diagnosis', 'generated', {
        episodeTitle: req.body?.episodeTitle,
      });
      res.json(diagnosis);
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/ai/research', requireAuth, async (req, res, next) => {
    try {
      const auth = getAuthContext(req);
      const research = await generateEditorialResearch(req.body || {});
      recordAuditLog(auth.organizationId, auth.userId, 'ai_generation', 'research', 'generated', {
        guestName: req.body?.guestName,
      });
      res.json(research);
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/ai/outline', requireAuth, async (req, res, next) => {
    try {
      const auth = getAuthContext(req);
      const result = await generateSmartOutline(req.body || {});
      recordAuditLog(auth.organizationId, auth.userId, 'ai_generation', 'outline', 'generated', {
        episodeId: req.body?.episode?.id,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/ai/script', requireAuth, async (req, res, next) => {
    try {
      const auth = getAuthContext(req);
      const result = await generateStudioScript(req.body || {});
      recordAuditLog(auth.organizationId, auth.userId, 'ai_generation', 'script', 'generated', {
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
    app.get('*', (_req, res) => {
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
