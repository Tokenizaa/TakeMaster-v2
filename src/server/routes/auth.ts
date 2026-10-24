import { Request, Response, Router } from 'express';
import { verifySessionToken, verifySessionTokenWithRevocation, buildAuthSession, loginWithEmailOrUserId, resolveRequestAuthContext, requestPasswordReset, validatePasswordResetTokenOnly, resetPassword, logout } from '../auth';
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
      activeOrganization: ctx.organizationId
        ? { id: ctx.organizationId, name: ctx.organizationName }
        : null,
      role: ctx.role,
      memberships: [],
      showPermissions: ctx.showPermissions,
      allowedShowIds: ctx.allowedShowIds,
      isFullAccessAdmin: ctx.isFullAccessAdmin,
      isPlatformAdmin: ctx.isPlatformAdmin,
      isGlobalSession: Boolean(ctx.isGlobalSession),
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
    const verified = await verifySessionTokenWithRevocation(token);
    if (!verified) {
      throw new AppError(401, 'UNAUTHORIZED', 'Token de sessão inválido, expirado ou revogado.');
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

// Password reset - request (always returns success, doesn't reveal if email exists)
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      return res.json({ success: true }); // Silent success
    }
    await requestPasswordReset(email);
    res.json({ success: true });
  } catch (error) {
    // Always return success to not reveal if email exists
    res.json({ success: true });
  }
});

// Password reset - validate token (check if valid without consuming)
router.post('/reset-password/validate', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Token obrigatório.' });
    }
    const userId = await validatePasswordResetTokenOnly(token);
    if (!userId) {
      return res.status(400).json({ code: 'INVALID_TOKEN', message: 'Token inválido, expirado ou já utilizado.' });
    }
    res.json({ valid: true });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ code: error.code, message: error.message });
    } else {
      res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Erro interno.' });
    }
  }
});

// Password reset - reset password with token
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;
    if (!token || typeof token !== 'string' || !password || typeof password !== 'string') {
      throw new AppError(400, 'VALIDATION_ERROR', 'Token e nova senha são obrigatórios.');
    }
    if (password.length < 8) {
      throw new AppError(400, 'VALIDATION_ERROR', 'A senha deve ter pelo menos 8 caracteres.');
    }
    const success = await resetPassword(token, password);
    if (!success) {
      return res.status(400).json({ code: 'INVALID_TOKEN', message: 'Token inválido, expirado ou já utilizado.' });
    }
    res.json({ success: true, message: 'Senha redefinida com sucesso. Faça login com a nova senha.' });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ code: error.code, message: error.message });
    } else {
      res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Erro interno.' });
    }
  }
});

// Server-side logout - revokes the token
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(401, 'UNAUTHORIZED', 'Token de sessão ausente.');
    }
    const token = authHeader.slice('Bearer '.length).trim();
    await logout(token);
    res.json({ success: true, message: 'Sessão encerrada com sucesso.' });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ code: error.code, message: error.message });
    } else {
      res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Erro interno.' });
    }
  }
});

export default router;