import { Request, Response, Router } from 'express';
import { resolveRequestAuthContext } from '../auth';
import { validateLibraryAssetPayload } from '../../domain/validation';
import { listLibraryAssets, createLibraryAsset, updateLibraryAsset, deleteLibraryAsset, getLibraryAssetById } from '../persistence';
import { assertOrganizationMember, assertProgramAccess } from '../authorization';
import { AppError } from '../../domain/validation';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const ctx = await resolveRequestAuthContext(req);
    await assertOrganizationMember(ctx.userId, ctx.organizationId);
    const showId = req.query.showId as string | undefined;
    const assets = await listLibraryAssets(ctx.organizationId, showId, ctx.allowedShowIds);
    res.json({ assets });
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
    const validated = validateLibraryAssetPayload(req.body, false);
    const asset = await createLibraryAsset(ctx.organizationId, validated);
    res.status(201).json(asset);
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
    const asset = await getLibraryAssetById(ctx.organizationId, req.params.id);
    if (!asset) throw new AppError(404, 'NOT_FOUND', 'Asset não encontrado.');
    res.json(asset);
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
    const validated = validateLibraryAssetPayload(req.body, true);
    const asset = await updateLibraryAsset(ctx.organizationId, req.params.id, validated);
    res.json(asset);
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
    await deleteLibraryAsset(ctx.organizationId, req.params.id);
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