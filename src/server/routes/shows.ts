import { Request, Response, Router } from 'express';
import { resolveRequestAuthContext } from '../auth';
import { validateShowPayload } from '../../domain/validation';
import { listShows, createShow, updateShow, deleteShow, getShowById } from '../persistence';
import { assertOrganizationMember, assertOrganizationRole, assertProgramAccess } from '../authorization';
import { AppError } from '../../domain/validation';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const ctx = await resolveRequestAuthContext(req);
    await assertOrganizationMember(ctx.userId, ctx.organizationId);
    const shows = await listShows(ctx.organizationId, ctx.allowedShowIds);
    res.json({ shows });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ code: error.code, message: error.message });
    } else {
      res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Erro interno.' });
    }
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const ctx = await resolveRequestAuthContext(req);
    await assertOrganizationRole(ctx.userId, ctx.organizationId, ['owner', 'admin']);
    const validated = validateShowPayload(req.body, false);
    const show = await createShow(ctx.organizationId, validated);
    res.status(201).json(show);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ code: error.code, message: error.message });
    } else {
      res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Erro interno.' });
    }
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const ctx = await resolveRequestAuthContext(req);
    await assertOrganizationMember(ctx.userId, ctx.organizationId);
    await assertProgramAccess(ctx.userId, req.params.id);
    const show = await getShowById(ctx.organizationId, req.params.id);
    if (!show) throw new AppError(404, 'NOT_FOUND', 'Programa não encontrado.');
    res.json(show);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ code: error.code, message: error.message });
    } else {
      res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Erro interno.' });
    }
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const ctx = await resolveRequestAuthContext(req);
    await assertOrganizationRole(ctx.userId, ctx.organizationId, ['owner', 'admin']);
    await assertProgramAccess(ctx.userId, req.params.id);
    const validated = validateShowPayload(req.body, true);
    const show = await updateShow(ctx.organizationId, req.params.id, validated);
    res.json(show);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ code: error.code, message: error.message });
    } else {
      res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Erro interno.' });
    }
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const ctx = await resolveRequestAuthContext(req);
    await assertOrganizationRole(ctx.userId, ctx.organizationId, ['owner', 'admin']);
    await assertProgramAccess(ctx.userId, req.params.id);
    await deleteShow(ctx.organizationId, req.params.id);
    res.json({ success: true });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ code: error.code, message: error.message });
    } else {
      res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Erro interno.' });
    }
  }
});

export default router;