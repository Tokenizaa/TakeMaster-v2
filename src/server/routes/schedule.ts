import { Request, Response, Router } from 'express';
import { resolveRequestAuthContext } from '../auth';
import { validateScheduleEventPayload } from '../../domain/validation';
import { listScheduleEvents, createScheduleEvent, updateScheduleEvent, deleteScheduleEvent, getScheduleEventById } from '../persistence';
import { assertOrganizationMember, assertProgramAccess } from '../authorization';
import { AppError } from '../../domain/validation';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const ctx = await resolveRequestAuthContext(req);
    await assertOrganizationMember(ctx.userId, ctx.organizationId);
    const showId = req.query.showId as string | undefined;
    const events = await listScheduleEvents(ctx.organizationId, showId, ctx.allowedShowIds);
    res.json({ events });
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
    await assertOrganizationMember(ctx.userId, ctx.organizationId);
    const validated = validateScheduleEventPayload(req.body, false);
    const event = await createScheduleEvent(ctx.organizationId, validated);
    res.status(201).json(event);
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
    const event = await getScheduleEventById(ctx.organizationId, req.params.id);
    if (!event) throw new AppError(404, 'NOT_FOUND', 'Evento não encontrado.');
    res.json(event);
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
    await assertOrganizationMember(ctx.userId, ctx.organizationId);
    const validated = validateScheduleEventPayload(req.body, true);
    const event = await updateScheduleEvent(ctx.organizationId, req.params.id, validated);
    res.json(event);
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
    await assertOrganizationMember(ctx.userId, ctx.organizationId);
    await deleteScheduleEvent(ctx.organizationId, req.params.id);
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