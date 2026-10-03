import type { Request, Response, NextFunction } from 'express';
import { Router } from 'express';
import { requireAuth } from '../../server/auth';
import { participantsService } from '../../services/participants/participants.service';
import { validateParticipantData, validateParticipantId } from '../../validation/participants.validators';

const router = Router();

// GET /api/participants (list with filtering, pagination)
router.get(
  '/',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
       const filters = {
         search: req.query.search as string | undefined,
         type: req.query.type as string | undefined,
         group_type: req.query.group_type as string | undefined,
         role: req.query.role as string | undefined,
         entity_type: req.query.entity_type as string | undefined,
         company: req.query.company as string | undefined,
         limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
         offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined
       };

      const result = await participantsService.getParticipants(filters);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/participants/:id (get single participant)
router.get(
  '/:id',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const idErrors = validateParticipantId(req.params.id);
      if (idErrors.length > 0) {
        return res.status(400).json({ errors: idErrors });
      }

      const participant = await participantsService.getParticipantById(req.params.id);
      if (!participant) {
        return res.status(404).json({ error: 'Participant not found' });
      }

      res.json(participant);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/participants (create participant)
router.post(
  '/',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validateParticipantData(req.body);
      if (errors.length > 0) {
        return res.status(400).json({ errors });
      }

      const participant = await participantsService.createParticipant(req.body);
      res.status(201).json(participant);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/participants/:id (update participant)
router.put(
  '/:id',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const idErrors = validateParticipantId(req.params.id);
      if (idErrors.length > 0) {
        return res.status(400).json({ errors: idErrors });
      }

      const errors = validateParticipantData(req.body, true); // true for update
      if (errors.length > 0) {
        return res.status(400).json({ errors });
      }

      const participant = await participantsService.updateParticipant(req.params.id, req.body);
      if (!participant) {
        return res.status(404).json({ error: 'Participant not found' });
      }

      res.json(participant);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/participants/:id (delete participant)
router.delete(
  '/:id',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const idErrors = validateParticipantId(req.params.id);
      if (idErrors.length > 0) {
        return res.status(400).json({ errors: idErrors });
      }

      const success = await participantsService.deleteParticipant(req.params.id);
      if (!success) {
        return res.status(400).json({ error: 'Failed to delete participant' });
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;