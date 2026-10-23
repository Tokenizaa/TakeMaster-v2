/**
 * AI Routes — Async Processing via Queue
 * 
 * POST /api/ai/{type} - Create job, returns 202 with jobId
 * GET  /api/ai/{type}/{jobId} - Poll for result
 * 
 * Types: diagnosis, research, outline, script, repiques, shorts, 
 *        editor-script, assist, program-identity, pitch
 */

import { Request, Response, Router } from 'express';
import { resolveRequestAuthContext } from '../auth';
import { assertOrganizationMember } from '../authorization';
import { AppError } from '../../domain/validation';
import { createAIJob, getAIJobResult, getQueueStats, type AIJobType } from '../../queue';

const router = Router();

// Valid job types
const VALID_TYPES: AIJobType[] = [
  'diagnosis',
  'research',
  'outline',
  'script',
  'repiques',
  'shorts',
  'editor-script',
  'assist',
  'program-identity',
  'pitch',
];

function validateType(type: string): type is AIJobType {
  return VALID_TYPES.includes(type as AIJobType);
}

// ============================================
// CREATE JOB (async)
// POST /api/ai/{type}
// ============================================

router.post('/:type', async (req: Request, res: Response) => {
  try {
    const ctx = await resolveRequestAuthContext(req);
    await assertOrganizationMember(ctx.userId, ctx.organizationId);

    const type = req.params.type;
    if (!validateType(type)) {
      throw new AppError(400, 'VALIDATION_ERROR', `Tipo de job inválido: ${type}`);
    }

    // Validate required fields based on type
    const dto = req.body;
    if (!dto || typeof dto !== 'object') {
      throw new AppError(400, 'VALIDATION_ERROR', 'Corpo da requisição inválido');
    }

    // Create job in queue
    const jobResponse = createAIJob(type, dto, {
      model: req.headers['x-ai-model'] as string,
    });

    // Return 202 Accepted with jobId
    res.status(202).json(jobResponse);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ code: error.code, message: error.message });
    } else {
      console.error('AI job creation error:', error);
      res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Erro interno ao criar job.' });
    }
  }
});

// ============================================
// GET JOB RESULT (polling)
// GET /api/ai/{type}/{jobId}
// ============================================

router.get('/:type/:jobId', async (req: Request, res: Response) => {
  try {
    const ctx = await resolveRequestAuthContext(req);
    await assertOrganizationMember(ctx.userId, ctx.organizationId);

    const type = req.params.type;
    const jobId = req.params.jobId;

    if (!validateType(type)) {
      throw new AppError(400, 'VALIDATION_ERROR', `Tipo de job inválido: ${type}`);
    }

    const result = getAIJobResult(jobId);
    
    if (!result) {
      throw new AppError(404, 'NOT_FOUND', 'Job não encontrado');
    }

    // Return result with appropriate status
    if (result.status === 'completed') {
      res.json(result.result);
    } else if (result.status === 'failed') {
      res.status(500).json({ 
        code: 'AI_JOB_FAILED', 
        message: result.error || 'Job de IA falhou',
        jobId 
      });
    } else {
      // Still processing
      res.status(202).json({
        jobId: result.jobId,
        status: 'processing',
        message: 'Job ainda em processamento',
      });
    }
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ code: error.code, message: error.message });
    } else {
      console.error('AI job result error:', error);
      res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Erro interno ao buscar resultado.' });
    }
  }
});

// ============================================
// QUEUE STATS (admin)
// GET /api/ai/queue/stats
// ============================================

router.get('/queue/stats', async (req: Request, res: Response) => {
  try {
    const ctx = await resolveRequestAuthContext(req);
    await assertOrganizationMember(ctx.userId, ctx.organizationId);
    
    // Check if platform admin
    if (!ctx.isPlatformAdmin) {
      throw new AppError(403, 'FORBIDDEN_CONTEXT', 'Acesso restrito a administradores de plataforma.');
    }

    const { getQueueStats } = await import('../../queue');
    res.json(getQueueStats());
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ code: error.code, message: error.message });
    } else {
      res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Erro interno.' });
    }
  }
});

export default router;