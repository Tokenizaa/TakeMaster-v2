import { EpisodesService } from '../episodes.service';
import type { Episode } from '../../types/domain';

// Mock the SupabasePersistence
jest.mock('../../server/supabasePersistence', () => {
  return {
    SupabasePersistence: jest.fn().mockImplementation(() => {
      return {
        getEpisodes: jest.fn(),
        getEpisode: jest.fn(),
        createEpisode: jest.fn(),
        updateEpisode: jest.fn(),
        deleteEpisode: jest.fn()
      };
    })
  };
});

import { SupabasePersistence } from '../../server/supabasePersistence';

describe('EpisodesService', () => {
  let episodesService: EpisodesService;
  let mockPersistence: jest.Mocked<SupabasePersistence>;

  beforeEach(() => {
    episodesService = new EpisodesService();
    mockPersistence = episodesService['persistence'] as jest.Mocked<SupabasePersistence>;
    jest.clearAllMocks();
  });

  describe('getEpisodes', () => {
    it('should call persistence.getEpisodes with filters', async () => {
      const filters = {
        search: 'test',
        program_id: 'prog-123',
        status: 'draft',
        season_id: 'season-456',
        limit: 10,
        offset: 0
      };
      const mockResult = { data: [], count: 0 };
      mockPersistence.getEpisodes.mockResolvedValue(mockResult);

      const result = await episodesService.getEpisodes(filters);

      expect(mockPersistence.getEpisodes).toHaveBeenCalledWith(filters);
      expect(result).toEqual(mockResult);
    });

    it('should call persistence.getEpisodes without filters when none provided', async () => {
      const mockResult = { data: [], count: 0 };
      mockPersistence.getEpisodes.mockResolvedValue(mockResult);

      const result = await episodesService.getEpisodes(undefined);

      expect(mockPersistence.getEpisodes).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(mockResult);
    });
  });

  describe('getEpisodeById', () => {
    it('should call persistence.getEpisode with the id', async () => {
      const episodeId = 'ep-123';
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
      mockPersistence.getEpisode.mockResolvedValue(mockEpisode);

      const result = await episodesService.getEpisodeById(episodeId);

      expect(mockPersistence.getEpisode).toHaveBeenCalledWith(episodeId);
      expect(result).toEqual(mockEpisode);
    });

    it('should return undefined when episode not found', async () => {
      mockPersistence.getEpisode.mockResolvedValue(undefined);

      const result = await episodesService.getEpisodeById('non-existent-id');

      expect(mockPersistence.getEpisode).toHaveBeenCalledWith('non-existent-id');
      expect(result).toBeUndefined();
    });
  });

  describe('createEpisode', () => {
    it('should call persistence.createEpisode with episode data', async () => {
      const episodeData: Omit<Episode, 'id' | 'created_at' | 'updated_at'> = {
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
        checklist: [],
        guest_name: null,
        guest_id: null
      };
      const mockCreatedEpisode: Episode = {
        ...episodeData,
        id: 'ep-123',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      mockPersistence.createEpisode.mockResolvedValue(mockCreatedEpisode);

      const result = await episodesService.createEpisode(episodeData);

      expect(mockPersistence.createEpisode).toHaveBeenCalledWith(episodeData);
      expect(result).toEqual(mockCreatedEpisode);
    });
  });

  describe('updateEpisode', () => {
    it('should call persistence.updateEpisode with id and partial data', async () => {
      const episodeId = 'ep-123';
      const updateData: Partial<Episode> = {
        title: 'Updated Episode Title',
        status: 'ready'
      };
      const mockUpdatedEpisode: Episode = {
        id: episodeId,
        legacy_id: null,
        program_id: 'prog-123',
        episode_number: 1,
        title: 'Updated Episode Title',
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
      mockPersistence.updateEpisode.mockResolvedValue(mockUpdatedEpisode);

      const result = await episodesService.updateEpisode(episodeId, updateData);

      expect(mockPersistence.updateEpisode).toHaveBeenCalledWith(episodeId, updateData);
      expect(result).toEqual(mockUpdatedEpisode);
    });
  });

  describe('deleteEpisode', () => {
    it('should call persistence.deleteEpisode with id', async () => {
      const episodeId = 'ep-123';
      mockPersistence.deleteEpisode.mockResolvedValue(true);

      const result = await episodesService.deleteEpisode(episodeId);

      expect(mockPersistence.deleteEpisode).toHaveBeenCalledWith(episodeId);
      expect(result).toBe(true);
    });

    it('should return false when deletion fails', async () => {
      mockPersistence.deleteEpisode.mockResolvedValue(false);

      const result = await episodesService.deleteEpisode('ep-123');

      expect(mockPersistence.deleteEpisode).toHaveBeenCalledWith('ep-123');
      expect(result).toBe(false);
    });
  });
});