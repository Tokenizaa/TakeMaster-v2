import { Request, Response, Router } from 'express';
import { resolveRequestAuthContext } from '../auth';
import { populateOrganizationWorkspace } from '../persistence';
import { assertOrganizationMember } from '../authorization';
import { AppError } from '../../domain/validation';

const router = Router();

router.post('/reset', async (req: Request, res: Response) => {
  try {
    const ctx = await resolveRequestAuthContext(req);
    await assertOrganizationMember(ctx.userId, ctx.organizationId);
    res.status(403).json({ code: 'FORBIDDEN_CONTEXT', message: 'Seed/reset de dados está desabilitado. Use /api/setup/run/:programId para inicializar o workspace de um programa.' });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ code: error.code, message: error.message });
    } else {
      res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Erro interno.' });
    }
  }
});

export default router;