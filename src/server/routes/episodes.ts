import { Request, Response, Router } from 'express';
import { resolveRequestAuthContext } from '../auth';
import { validateEpisodePayload } from '../../domain/validation';
import { listEpisodes, createEpisode, updateEpisode, deleteEpisode, getEpisodeById } from '../persistence';
import { assertOrganizationMember, assertProgramAccess } from '../authorization';
import { AppError } from '../../domain/validation';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const ctx = await resolveRequestAuthContext(req);
    await assertOrganizationMember(ctx.userId, ctx.organizationId);
    const showId = req.query.showId as string | undefined;
    const episodes = await listEpisodes(ctx.organizationId, showId, ctx.allowedShowIds);
    res.json({ episodes });
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
    const validated = validateEpisodePayload(req.body, false);
    const episode = await createEpisode(ctx.organizationId, validated);
    res.status(201).json(episode);
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
    const episode = await getEpisodeById(ctx.organizationId, req.params.id);
    if (!episode) throw new AppError(404, 'NOT_FOUND', 'Episódio não encontrado.');
    res.json(episode);
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
    await assertProgramAccess(ctx.userId, req.params.id);
    const validated = validateEpisodePayload(req.body, true);
    const episode = await updateEpisode(ctx.organizationId, req.params.id, validated);
    res.json(episode);
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
    await assertProgramAccess(ctx.userId, req.params.id);
    await deleteEpisode(ctx.organizationId, req.params.id);
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