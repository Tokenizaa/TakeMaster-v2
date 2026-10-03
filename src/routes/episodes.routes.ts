import type { Request, Response, NextFunction } from 'express';
import { Router } from 'express';
import { requireAuth } from '../server/auth';
import { episodesService } from '../services/episodes/episodes.service';
import { validateEpisodeData, validateEpisodeId } from '../validation/episodes.validators';

const router = Router();

// GET /api/episodes (list with filtering, pagination)
router.get(
  '/',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = {
        search: req.query.search as string | undefined,
        program_id: req.query.program_id as string | undefined,
        status: req.query.status as string | undefined,
        season_id: req.query.season_id as string | undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined,
        order_by: req.query.order_by as string | undefined,
        ascending: req.query.ascending === 'true' ? true : false
      };

      const result = await episodesService.getEpisodes(filters);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/episodes/:id (get single episode)
router.get(
  '/:id',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const idErrors = validateEpisodeId(req.params.id);
      if (idErrors.length > 0) {
        return res.status(400).json({ errors: idErrors });
      }

      const episode = await episodesService.getEpisodeById(req.params.id);
      if (!episode) {
        return res.status(404).json({ error: 'Episode not found' });
      }

      res.json(episode);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/episodes (create episode)
router.post(
  '/',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validateEpisodeData(req.body);
      if (errors.length > 0) {
        return res.status(400).json({ errors });
      }

      const episode = await episodesService.createEpisode(req.body);
      res.status(201).json(episode);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/episodes/:id (update episode)
router.put(
  '/:id',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const idErrors = validateEpisodeId(req.params.id);
      if (idErrors.length > 0) {
        return res.status(400).json({ errors: idErrors });
      }

      const errors = validateEpisodeData(req.body, true); // true for update
      if (errors.length > 0) {
        return res.status(400).json({ errors });
      }

      const episode = await episodesService.updateEpisode(req.params.id, req.body);
      res.json(episode);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/episodes/:id (delete episode)
router.delete(
  '/:id',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const idErrors = validateEpisodeId(req.params.id);
      if (idErrors.length > 0) {
        return res.status(400).json({ errors: idErrors });
      }

      const success = await episodesService.deleteEpisode(req.params.id);
      if (!success) {
        return res.status(400).json({ error: 'Failed to delete episode' });
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;