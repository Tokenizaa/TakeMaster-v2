import { Request, Response, Router } from 'express';
import { resolveRequestAuthContext } from '../auth';
import { listUsersAndOrganizations, createOrganizationUserWithShowPermissions, updateUserShowPermissions, updateOrganizationUserStatusOrRole } from '../persistence';
import { assertOrganizationRole } from '../authorization';
import { AppError } from '../../domain/validation';

const router = Router();

router.get('/overview', async (req: Request, res: Response) => {
  try {
    const ctx = await resolveRequestAuthContext(req);
    await assertOrganizationRole(ctx.userId, ctx.organizationId, ['owner', 'admin']);
    const { users, organizations } = await listUsersAndOrganizations();
    res.json({ users, organizations });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ code: error.code, message: error.message });
    } else {
      res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Erro interno.' });
    }
  }
});

router.post('/users', async (req: Request, res: Response) => {
  try {
    const ctx = await resolveRequestAuthContext(req);
    await assertOrganizationRole(ctx.userId, ctx.organizationId, ['owner', 'admin']);
    const user = await createOrganizationUserWithShowPermissions(ctx.organizationId, req.body, ctx.userId);
    res.status(201).json(user);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ code: error.code, message: error.message });
    } else {
      res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Erro interno.' });
    }
  }
});

router.put('/users/:id/permissions', async (req: Request, res: Response) => {
  try {
    const ctx = await resolveRequestAuthContext(req);
    await assertOrganizationRole(ctx.userId, ctx.organizationId, ['owner', 'admin']);
    const user = await updateUserShowPermissions(ctx.organizationId, req.params.id, req.body.permissions, ctx.userId);
    res.json(user);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ code: error.code, message: error.message });
    } else {
      res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Erro interno.' });
    }
  }
});

router.put('/users/:id/status', async (req: Request, res: Response) => {
  try {
    const ctx = await resolveRequestAuthContext(req);
    await assertOrganizationRole(ctx.userId, ctx.organizationId, ['owner', 'admin']);
    const user = await updateOrganizationUserStatusOrRole(ctx.organizationId, req.params.id, req.body, ctx.userId);
    res.json(user);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ code: error.code, message: error.message });
    } else {
      res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Erro interno.' });
    }
  }
});

export default router;