import { Router } from 'express';
import request from 'supertest';
import episodesRouter from '../episodes.routes';

// Mock the episodesService
jest.mock('../../services/episodes/episodes.service', () => ({
  episodesService: {
    getEpisodes: jest.fn(),
    getEpisodeById: jest.fn(),
    createEpisode: jest.fn(),
    updateEpisode: jest.fn(),
    deleteEpisode: jest.fn()
  }
}));

// Mock the validation functions
jest.mock('../../validation/episodes.validators', () => ({
  validateEpisodeData: jest.fn(() => []),
  validateEpisodeId: jest.fn(() => [])
}));

// Mock the auth middleware
jest.mock('../../server/auth', () => ({
  requireAuth: (req: any, res: any, next: any) => next()
}));

import { episodesService } from '../../services/episodes/episodes.service';
import { validateEpisodeData, validateEpisodeId } from '../../validation/episodes.validators';
import type { Episode } from '../../types/domain';

describe('Episodes Routes', () => {
  let app: Router;

  beforeEach(() => {
    app = Router();
    app.use('/api/episodes', episodesRouter);
    jest.clearAllMocks();
  });

  describe('GET /api/episodes', () => {
    it('should return episodes with filters', async () => {
      const mockResult = {
        data: [
          {
            id: 'ep-1',
            legacy_id: null,
            program_id: 'prog-123',
            episode_number: 1,
            title: 'Test Episode 1',
            idea: 'Test idea 1',
            topic: 'Test topic 1',
            synopsis: 'Test synopsis 1',
            format: 'Entrevista',
            target_duration_min: 45,
            target_duration_minutes: 45,
            presenter_name: 'Test Host',
            host: 'Test Host',
            tone: 'Informative',
            objective: null,
            additional_info: null,
            status: 'draft',
            diagnosis: {} as any,
            research: {} as any,
            technical_checklist: {} as any,
            editorial_notes_for_post: null,
            editor_script_synthesis: null,
            recording_time_elapsed: null,
            scheduled_date: null,
            production_status: 'planned',
            version: 1,
            season_id: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            checklist: [],
            guest_name: null,
            guest_id: null
          }
        ],
        count: 1
      };
      (episodesService.getEpisodes as jest.Mock).mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/episodes')
        .query({ search: 'test', program_id: 'prog-123', status: 'draft' })
        .expect(200);

      expect(episodesService.getEpisodes).toHaveBeenCalledWith({
        search: 'test',
        program_id: 'prog-123',
        status: 'draft',
        season_id: undefined,
        limit: undefined,
        offset: undefined,
        order_by: undefined,
        ascending: undefined
      });
      expect(response.body).toEqual(mockResult);
    });

    it('should handle errors', async () => {
      (episodesService.getEpisodes as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/episodes')
        .expect(500);
    });
  });

  describe('GET /api/episodes/:id', () => {
    it('should return episode by id', async () => {
      const mockEpisode: Episode = {
        id: 'ep-123',
        legacy_id: null,
        program_id: 'prog-123',
        episode_number: 1,
        title: 'Test Episode',
        idea: 'Test idea',
        topic: 'Test topic',
        synopsis: 'Test synopsis',
        format: 'Entrevista',
        target_duration_min: 45,
        target_duration_minutes: 45,
        presenter_name: 'Test Host',
        host: 'Test Host',
        tone: 'Informative',
        objective: null,
        additional_info: null,
        status: 'draft',
        diagnosis: {} as any,
        research: {} as any,
        technical_checklist: {} as any,
        editorial_notes_for_post: null,
        editor_script_synthesis: null,
        recording_time_elapsed: null,
        scheduled_date: null,
        production_status: 'planned',
        version: 1,
        season_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        checklist: [],
        guest_name: null,
        guest_id: null
      };
      (episodesService.getEpisodeById as jest.Mock).mockResolvedValue(mockEpisode);

      const response = await request(app)
        .get('/api/episodes/ep-123')
        .expect(200);

      expect(validateEpisodeId).toHaveBeenCalledWith('ep-123');
      expect(episodesService.getEpisodeById).toHaveBeenCalledWith('ep-123');
      expect(response.body).toEqual(mockEpisode);
    });

    it('should return 400 for invalid episode id', async () => {
      (validateEpisodeId as jest.Mock).mockReturnValue([{ field: 'id', message: 'Episode ID is required' }]);

      const response = await request(app)
        .get('/api/episodes/')
        .expect(400);
    });

    it('should return 404 for non-existent episode', async () => {
      (episodesService.getEpisodeById as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .get('/api/episodes/non-existent-id')
        .expect(404);
    });
  });

  describe('POST /api/episodes', () => {
    it('should create a new episode', async () => {
      const episodeData = {
        title: 'New Episode',
        idea: 'New idea',
        host: 'Test Host',
        format: 'Entrevista',
        status: 'draft'
      };
      const mockCreatedEpisode: Episode = {
        id: 'ep-123',
        legacy_id: null,
        program_id: 'prog-123',
        episode_number: 1,
        title: 'New Episode',
        idea: 'New idea',
        topic: 'Test topic',
        synopsis: 'Test synopsis',
        format: 'Entrevista',
        target_duration_min: 45,
        target_duration_minutes: 45,
        presenter_name: 'Test Host',
        host: 'Test Host',
        tone: 'Informative',
        objective: null,
        additional_info: null,
        status: 'draft',
        diagnosis: {} as any,
        research: {} as any,
        technical_checklist: {} as any,
        editorial_notes_for_post: null,
        editor_script_synthesis: null,
        recording_time_elapsed: null,
        scheduled_date: null,
        production_status: 'planned',
        version: 1,
        season_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        checklist: [],
        guest_name: null,
        guest_id: null
      };
      (episodesService.createEpisode as jest.Mock).mockResolvedValue(mockCreatedEpisode);

      const response = await request(app)
        .post('/api/episodes')
        .send(episodeData)
        .expect(201);

      expect(validateEpisodeData).toHaveBeenCalledWith(episodeData, false);
      expect(episodesService.createEpisode).toHaveBeenCalledWith(episodeData);
      expect(response.body).toEqual(mockCreatedEpisode);
    });

    it('should return 400 for invalid episode data', async () => {
      (validateEpisodeData as jest.Mock).mockReturnValue([{ field: 'title', message: 'title is required' }]);

      const response = await request(app)
        .post('/api/episodes')
        .send({})
        .expect(400);
    });
  });

  describe('PUT /api/episodes/:id', () => {
    it('should update an existing episode', async () => {
      const episodeId = 'ep-123';
      const updateData = {
        title: 'Updated Episode',
        status: 'ready'
      };
      const mockUpdatedEpisode: Episode = {
        id: episodeId,
        legacy_id: null,
        program_id: 'prog-123',
        episode_number: 1,
        title: 'Updated Episode',
        idea: 'Test idea',
        topic: 'Test topic',
        synopsis: 'Test synopsis',
        format: 'Entrevista',
        target_duration_min: 45,
        target_duration_minutes: 45,
        presenter_name: 'Test Host',
        host: 'Test Host',
        tone: 'Informative',
        objective: null,
        additional_info: null,
        status: 'ready',
        diagnosis: {} as any,
        research: {} as any,
        technical_checklist: {} as any,
        editorial_notes_for_post: null,
        editor_script_synthesis: null,
        recording_time_elapsed: null,
        scheduled_date: null,
        production_status: 'planned',
        version: 1,
        season_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        checklist: [],
        guest_name: null,
        guest_id: null
      };
      (episodesService.updateEpisode as jest.Mock).mockResolvedValue(mockUpdatedEpisode);

      const response = await request(app)
        .put(`/api/episodes/${episodeId}`)
        .send(updateData)
        .expect(200);

      expect(validateEpisodeId).toHaveBeenCalledWith(episodeId);
      expect(validateEpisodeData).toHaveBeenCalledWith(updateData, true);
      expect(episodesService.updateEpisode).toHaveBeenCalledWith(episodeId, updateData);
      expect(response.body).toEqual(mockUpdatedEpisode);
    });

    it('should return 400 for invalid episode id', async () => {
      (validateEpisodeId as jest.Mock).mockReturnValue([{ field: 'id', message: 'Episode ID is required' }]);

      const response = await request(app)
        .put('/api/episodes/')
        .send({})
        .expect(400);
    });

    it('should return 400 for invalid episode data', async () => {
      (validateEpisodeData as jest.Mock).mockReturnValue([{ field: 'title', message: 'title is required' }]);

      const response = await request(app)
        .put('/api/episodes/ep-123')
        .send({})
        .expect(400);
    });
  });

  describe('DELETE /api/episodes/:id', () => {
    it('should delete an episode', async () => {
      const episodeId = 'ep-123';
      (episodesService.deleteEpisode as jest.Mock).mockResolvedValue(true);

      const response = await request(app)
        .delete(`/api/episodes/${episodeId}`)
        .expect(204);

      expect(validateEpisodeId).toHaveBeenCalledWith(episodeId);
      expect(episodesService.deleteEpisode).toHaveBeenCalledWith(episodeId);
    });

    it('should return 400 for invalid episode id', async () => {
      (validateEpisodeId as jest.Mock).mockReturnValue([{ field: 'id', message: 'Episode ID is required' }]);

      const response = await request(app)
        .delete('/api/episodes/')
        .expect(400);
    });

    it('should return 400 when deletion fails', async () => {
      (episodesService.deleteEpisode as jest.Mock).mockResolvedValue(false);

      const response = await request(app)
        .delete('/api/episodes/ep-123')
        .expect(400);
    });
  });
});