import { Request, Response, Router } from 'express';
import { verifySessionToken, buildAuthSession, loginWithEmailOrUserId, resolveRequestAuthContext } from '../auth';
import { AppError } from '../../domain/validation';

const router = Router();

router.post('/session', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(401, 'UNAUTHORIZED', 'Token de sessão ausente.');
    }
    const token = authHeader.slice('Bearer '.length).trim();
    const ctx = await resolveRequestAuthContext(req);
    res.json({
      token: ctx.token,
      user: {
        id: ctx.userId,
        email: ctx.userEmail,
        name: ctx.userName,
      },
      activeOrganization: {
        id: ctx.organizationId,
        name: ctx.organizationName,
      },
      role: ctx.role,
      memberships: [],
      showPermissions: ctx.showPermissions,
      allowedShowIds: ctx.allowedShowIds,
      isFullAccessAdmin: ctx.isFullAccessAdmin,
      activeSubscription: null,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ code: error.code, message: error.message });
    } else {
      res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Erro interno.' });
    }
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { emailOrUserId, organizationId, loginCode } = req.body;
    const session = await loginWithEmailOrUserId(emailOrUserId, organizationId, loginCode);
    res.json({ session });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ code: error.code, message: error.message });
    } else {
      res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Erro interno.' });
    }
  }
});

router.post('/switch-org', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(401, 'UNAUTHORIZED', 'Token de sessão ausente.');
    }
    const token = authHeader.slice('Bearer '.length).trim();
    const verified = verifySessionToken(token);
    if (!verified) {
      throw new AppError(401, 'UNAUTHORIZED', 'Token de sessão inválido ou expirado.');
    }
    const { organizationId } = req.body;
    if (!organizationId) throw new AppError(400, 'VALIDATION_ERROR', 'organizationId obrigatório.');
    const session = await buildAuthSession(verified.userId, organizationId);
    res.json({ session });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ code: error.code, message: error.message });
    } else {
      res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Erro interno.' });
    }
  }
});

export default router;