import { Request, Response, Router } from 'express';
import { resolveRequestAuthContext } from '../auth';
import { validateParticipantPayload } from '../../domain/validation';
import { listParticipants, createParticipant, updateParticipant, deleteParticipant, getParticipantById } from '../persistence';
import { assertOrganizationMember, assertProgramAccess } from '../authorization';
import { AppError } from '../../domain/validation';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const ctx = await resolveRequestAuthContext(req);
    await assertOrganizationMember(ctx.userId, ctx.organizationId);
    const guests = await listParticipants(ctx.organizationId);
    res.json({ guests });
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
    const validated = validateParticipantPayload(req.body, false);
    const guest = await createParticipant(ctx.organizationId, validated);
    res.status(201).json(guest);
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
    const guest = await getParticipantById(ctx.organizationId, req.params.id);
    if (!guest) throw new AppError(404, 'NOT_FOUND', 'Convidado não encontrado.');
    res.json(guest);
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
    const validated = validateParticipantPayload(req.body, true);
    const guest = await updateParticipant(ctx.organizationId, req.params.id, validated);
    res.json(guest);
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
    await deleteParticipant(ctx.organizationId, req.params.id);
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