import { Request, Response, Router } from 'express';
import { resolveRequestAuthContext, AuthenticatedContext } from '../auth';
import { generateProgramEditorialIdentity, generateProgramPitchSuggestions } from '../ai';
import { getShowById } from '../persistence';
import { assertOrganizationMember, assertProgramAccess } from '../authorization';
import { AppError } from '../../domain/validation';

const router = Router();

async function getShowForAI(ctx: AuthenticatedContext, showId: string) {
  if (!ctx.organizationId) {
    throw new AppError(409, 'ORGANIZATION_CONTEXT_REQUIRED', 'Contexto de organização é obrigatório.');
  }
  await assertOrganizationMember(ctx.userId, ctx.organizationId);
  await assertProgramAccess(ctx.userId, showId);
  const show = await getShowById(ctx.organizationId, showId);
  if (!show) throw new AppError(404, 'NOT_FOUND', 'Programa não encontrado.');
  return { title: show.title, id: show.id };
}

router.get('/shows/:showId/knowledge', async (req: Request, res: Response) => {
  try {
    const ctx = await resolveRequestAuthContext(req);
    const show = await getShowForAI(ctx, req.params.showId);
    const knowledge = await generateProgramEditorialIdentity({ show });
    res.json(knowledge);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ code: error.code, message: error.message });
    } else {
      res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Erro interno.' });
    }
  }
});

router.post('/shows/:showId/editorial-identity', async (req: Request, res: Response) => {
  try {
    const ctx = await resolveRequestAuthContext(req);
    const show = await getShowForAI(ctx, req.params.showId);
    const identity = await generateProgramEditorialIdentity({ show });
    res.json(identity);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ code: error.code, message: error.message });
    } else {
      res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Erro interno.' });
    }
  }
});

router.post('/shows/:showId/suggest-pautas', async (req: Request, res: Response) => {
  try {
    const ctx = await resolveRequestAuthContext(req);
    const show = await getShowForAI(ctx, req.params.showId);
    const pautas = await generateProgramPitchSuggestions({ show, input: req.body });
    res.json(pautas);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ code: error.code, message: error.message });
    } else {
      res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Erro interno.' });
    }
  }
});

export default router;