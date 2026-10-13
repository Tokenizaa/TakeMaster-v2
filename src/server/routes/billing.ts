import { Request, Response, Router } from 'express';
import { resolveRequestAuthContext } from '../auth';
import { listSaaSPlans, listOrganizationSubscriptions, subscribeOrUpdatePlan, toggleSubscriptionAutoRenew, processAutomaticRenewalCycle } from '../persistence';
import { assertOrganizationMember, assertOrganizationRole } from '../authorization';
import { AppError } from '../../domain/validation';

const router = Router();

router.get('/overview', async (req: Request, res: Response) => {
  try {
    const ctx = await resolveRequestAuthContext(req);
    await assertOrganizationMember(ctx.userId, ctx.organizationId);
    const [plans, subscriptions] = await Promise.all([
      listSaaSPlans(),
      listOrganizationSubscriptions(ctx.organizationId),
    ]);
    res.json({ plans, subscriptions });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ code: error.code, message: error.message });
    } else {
      res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Erro interno.' });
    }
  }
});

router.post('/subscribe', async (req: Request, res: Response) => {
  try {
    const ctx = await resolveRequestAuthContext(req);
    await assertOrganizationRole(ctx.userId, ctx.organizationId, ['owner', 'admin']);
    const subscription = await subscribeOrUpdatePlan(ctx.organizationId, req.body, ctx.userId);
    res.status(201).json(subscription);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ code: error.code, message: error.message });
    } else {
      res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Erro interno.' });
    }
  }
});

router.post('/subscriptions/:id/auto-renew', async (req: Request, res: Response) => {
  try {
    const ctx = await resolveRequestAuthContext(req);
    await assertOrganizationRole(ctx.userId, ctx.organizationId, ['owner', 'admin']);
    await toggleSubscriptionAutoRenew(ctx.organizationId, req.params.id, req.body.autoRenew, ctx.userId);
    const subs = await listOrganizationSubscriptions(ctx.organizationId);
    const sub = subs.find(s => s.id === req.params.id);
    res.json(sub);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ code: error.code, message: error.message });
    } else {
      res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Erro interno.' });
    }
  }
});

router.post('/subscriptions/:id/renew-now', async (req: Request, res: Response) => {
  try {
    const ctx = await resolveRequestAuthContext(req);
    await assertOrganizationRole(ctx.userId, ctx.organizationId, ['owner', 'admin']);
    const subscription = await processAutomaticRenewalCycle(ctx.organizationId, req.params.id, req.body.simulateFailure, ctx.userId);
    res.json(subscription);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ code: error.code, message: error.message });
    } else {
      res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Erro interno.' });
    }
  }
});

export default router;