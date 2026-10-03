import { validateEpisodeData, validateEpisodeId, ValidationError } from '../episodes.validators';
import type { Episode, EpisodeStatus, ShowFormat } from '../../types/domain';

describe('validateEpisodeData', () => {
  const validEpisodeData: Omit<Episode, 'id' | 'created_at' | 'updated_at'> = {
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
    diagnosis: {
      centralTheme: 'Test theme',
      potentialStory: 'Test story',
      primaryConflict: 'Test conflict',
      primaryTransformation: 'Test transformation',
      whyWatch: 'Why watch',
      whatToDiscover: 'What to discover',
      researchPoints: ['Point 1'],
      highImpactMoments: ['Moment 1'],
      approved: true
    },
    research: {
      aboutGuest: 'About guest',
      trajectory: 'Trajectory',
      company: 'Company',
      keyDatesAndNumbers: 'Key dates',
      previousInterviews: 'Previous interviews',
      recurringThemes: 'Recurring themes',
      contradictionsAndClarifications: 'Contradictions',
      compellingStories: 'Compelling stories',
      sources: []
    },
    technical_checklist: {
      cam1Recording: true,
      cam2Recording: false,
      cam3Recording: true,
      micHost: true,
      micGuest: false,
      audioMonitored: true,
      memoryCardsStorage: true,
      batteries: true,
      syncClap: true,
      waterReady: true,
      silentPhones: true,
      customItems: []
    },
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

  it('should return no errors for valid episode data (create)', () => {
    const errors = validateEpisodeData(validEpisodeData);
    expect(errors).toHaveLength(0);
  });

  it('should return no errors for valid episode data (update)', () => {
    const errors = validateEpisodeData(validEpisodeData, true);
    expect(errors).toHaveLength(0);
  });

  it('should return errors for missing required fields (create)', () => {
    const errors = validateEpisodeData({} as Omit<Episode, 'id' | 'created_at' | 'updated_at'>);
    expect(errors).toContainEqual({ field: 'title', message: 'title is required' });
    expect(errors).toContainEqual({ field: 'idea', message: 'idea is required' });
    expect(errors).toContainEqual({ field: 'host', message: 'host is required' });
    expect(errors).toContainEqual({ field: 'format', message: 'format is required' });
    expect(errors).toContainEqual({ field: 'status', message: 'status is required' });
  });

  it('should return no errors for missing required fields (update) when not provided', () => {
    const errors = validateEpisodeData({} as Partial<Episode>, true);
    expect(errors).toHaveLength(0);
  });

  it('should return errors for invalid format', () => {
    const episodeData = { ...validEpisodeData, format: 'Invalid Format' as ShowFormat };
    const errors = validateEpisodeData(episodeData);
    expect(errors).toContainEqual(
      expect.objectContaining({
        field: 'format',
        message: expect.stringContaining('Invalid format')
      })
    );
  });

  it('should return errors for invalid status', () => {
    const episodeData = { ...validEpisodeData, status: 'invalid_status' as EpisodeStatus };
    const errors = validateEpisodeData(episodeData);
    expect(errors).toContainEqual(
      expect.objectContaining({
        field: 'status',
        message: expect.stringContaining('Invalid status')
      })
    );
  });

  it('should return errors for negative numbers', () => {
    const episodeData = { ...validEpisodeData, episode_number: -1 };
    const errors = validateEpisodeData(episodeData);
    expect(errors).toContainEqual(
      expect.objectContaining({
        field: 'episode_number',
        message: 'episode_number must be a non-negative number'
      })
    );
  });

  it('should return errors for invalid diagnosis type', () => {
    const episodeData = { ...validEpisodeData, diagnosis: 'invalid' as any };
    const errors = validateEpisodeData(episodeData);
    expect(errors).toContainEqual(
      expect.objectContaining({
        field: 'diagnosis',
        message: 'diagnosis must be an object'
      })
    );
  });

  it('should return errors for invalid research type', () => {
    const episodeData = { ...validEpisodeData, research: 'invalid' as any };
    const errors = validateEpisodeData(episodeData);
    expect(errors).toContainEqual(
      expect.objectContaining({
        field: 'research',
        message: 'research must be an object'
      })
    );
  });

  it('should return errors for invalid technical_checklist type', () => {
    const episodeData = { ...validEpisodeData, technical_checklist: 'invalid' as any };
    const errors = validateEpisodeData(episodeData);
    expect(errors).toContainEqual(
      expect.objectContaining({
        field: 'technical_checklist',
        message: 'technical_checklist must be an object'
      })
    );
  });

  it('should return errors for invalid checklist type', () => {
    const episodeData = { ...validEpisodeData, checklist: 'invalid' as any };
    const errors = validateEpisodeData(episodeData);
    expect(errors).toContainEqual(
      expect.objectContaining({
        field: 'checklist',
        message: 'checklist must be an array'
      })
    );
  });

  it('should return errors for string fields exceeding 1000 characters', () => {
    const longString = 'a'.repeat(1001);
    const episodeData = { ...validEpisodeData, title: longString };
    const errors = validateEpisodeData(episodeData);
    expect(errors).toContainEqual(
      expect.objectContaining({
        field: 'title',
        message: 'title must not exceed 1000 characters'
      })
    );
  });

  it('should return errors for empty program_id', () => {
    const episodeData = { ...validEpisodeData, program_id: '' };
    const errors = validateEpisodeData(episodeData);
    expect(errors).toContainEqual(
      expect.objectContaining({
        field: 'program_id',
        message: 'program_id must be a non-empty string'
      })
    );
  });

  it('should return errors for empty season_id', () => {
    const episodeData = { ...validEpisodeData, season_id: '' };
    const errors = validateEpisodeData(episodeData);
    expect(errors).toContainEqual(
      expect.objectContaining({
        field: 'season_id',
        message: 'season_id must be a non-empty string'
      })
    );
  });
});

describe('validateEpisodeId', () => {
  it('should return error for empty id', () => {
    const errors = validateEpisodeId('');
    expect(errors).toContainEqual({ field: 'id', message: 'Episode ID is required' });
  });

  it('should return error for whitespace-only id', () => {
    const errors = validateEpisodeId('   ');
    expect(errors).toContainEqual({ field: 'id', message: 'Episode ID is required' });
  });

  it('should return no errors for valid id', () => {
    const errors = validateEpisodeId('valid-id-123');
    expect(errors).toHaveLength(0);
  });
});