import { ParticipantsService } from '../participants.service';
import type { Guest, ParticipantType, GroupType, EntityType } from '../../types/domain';

// Mock the SupabasePersistence
jest.mock('../../server/supabasePersistence', () => {
  return {
    SupabasePersistence: jest.fn().mockImplementation(() => {
      return {
        getGuests: jest.fn(),
        getGuest: jest.fn(),
        saveGuest: jest.fn(),
        deleteGuest: jest.fn()
      };
    })
  };
});

import { SupabasePersistence } from '../../server/supabasePersistence';

describe('ParticipantsService', () => {
  let participantsService: ParticipantsService;
  let mockPersistence: jest.Mocked<SupabasePersistence>;

  beforeEach(() => {
    participantsService = new ParticipantsService();
    mockPersistence = participantsService['persistence'] as jest.Mocked<SupabasePersistence>;
    jest.clearAllMocks();
  });

  describe('getParticipants', () => {
    const mockGuests: Guest[] = [
      {
        id: 'guest-1',
        legacy_id: null,
        program_id: null,
        name: 'John Doe',
        type: 'individual',
        group_type: null,
        role: 'Host',
        company: 'ABC Corp',
        company_or_group: null,
        bio: 'Experienced host',
        contacts: 'john@example.com',
        notes: 'Regular guest',
        links: ['https://johndoe.com'],
        members: [],
        entity_type: 'individual',
        social_handles: { twitter: '@johndoe' },
        previous_episodes: ['ep1', 'ep2'],
        previous_research_summary: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'guest-2',
        legacy_id: null,
        program_id: null,
        name: 'Jane Smith',
        type: 'group',
        group_type: 'band',
        role: 'Musician',
        company: 'XYZ Band',
        company_or_group: null,
        bio: 'Talented musician',
        contacts: 'jane@example.com',
        notes: 'Band member',
        links: [],
        members: ['Member1', 'Member2'],
        entity_type: 'group',
        social_handles: {},
        previous_episodes: [],
        previous_research_summary: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    it('should return all guests when no filters provided', async () => {
      mockPersistence.getGuests.mockResolvedValue(mockGuests);

      const result = await participantsService.getParticipants(undefined);

      expect(mockPersistence.getGuests).toHaveBeenCalled();
      expect(result).toEqual({
        data: mockGuests,
        count: mockGuests.length
      });
    });

    it('should filter guests by search term', async () => {
      mockPersistence.getGuests.mockResolvedValue(mockGuests);

      const result = await participantsService.getParticipants({ search: 'John' });

      expect(mockPersistence.getGuests).toHaveBeenCalled();
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('John Doe');
      expect(result.count).toBe(1);
    });

    it('should filter guests by type', async () => {
      mockPersistence.getGuests.mockResolvedValue(mockGuests);

      const result = await participantsService.getParticipants({ type: 'group' as ParticipantType });

      expect(mockPersistence.getGuests).toHaveBeenCalled();
      expect(result.data).toHaveLength(1);
      expect(result.data[0].type).toBe('group');
      expect(result.count).toBe(1);
    });

    it('should filter guests by group_type', async () => {
      mockPersistence.getGuests.mockResolvedValue(mockGuests);

      const result = await participantsService.getParticipants({ group_type: 'band' as GroupType });

      expect(mockPersistence.getGuests).toHaveBeenCalled();
      expect(result.data).toHaveLength(1);
      expect(result.data[0].group_type).toBe('band');
      expect(result.count).toBe(1);
    });

    it('should filter guests by role', async () => {
      mockPersistence.getGuests.mockResolvedValue(mockGuests);

      const result = await participantsService.getParticipants({ role: 'Musician' });

      expect(mockPersistence.getGuests).toHaveBeenCalled();
      expect(result.data).toHaveLength(1);
      expect(result.data[0].role).toBe('Musician');
      expect(result.count).toBe(1);
    });

    it('should filter guests by company', async () => {
      mockPersistence.getGuests.mockResolvedValue(mockGuests);

      const result = await participantsService.getParticipants({ company: 'XYZ Band' });

      expect(mockPersistence.getGuests).toHaveBeenCalled();
      expect(result.data).toHaveLength(1);
      expect(result.data[0].company).toBe('XYZ Band');
      expect(result.count).toBe(1);
    });

    it('should apply pagination correctly', async () => {
      mockPersistence.getGuests.mockResolvedValue(mockGuests);

      const result = await participantsService.getParticipants({ limit: 1, offset: 0 });

      expect(mockPersistence.getGuests).toHaveBeenCalled();
      expect(result.data).toHaveLength(1);
      expect(result.count).toBe(2); // Total count before pagination
    });

    it('should combine multiple filters', async () => {
      mockPersistence.getGuests.mockResolvedValue(mockGuests);

      const result = await participantsService.getParticipants({
        search: 'John',
        type: 'individual' as ParticipantType,
        role: 'Host'
      });

      expect(mockPersistence.getGuests).toHaveBeenCalled();
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('John Doe');
      expect(result.data[0].type).toBe('individual');
      expect(result.data[0].role).toBe('Host');
      expect(result.count).toBe(1);
    });
  });

  describe('getParticipantById', () => {
    const mockGuest: Guest = {
      id: 'guest-1',
      legacy_id: null,
      program_id: null,
      name: 'John Doe',
      type: 'individual',
      group_type: null,
      role: 'Host',
      company: 'ABC Corp',
      company_or_group: null,
      bio: 'Experienced host',
      contacts: 'john@example.com',
      notes: 'Regular guest',
      links: ['https://johndoe.com'],
      members: [],
      entity_type: 'individual',
      social_handles: { twitter: '@johndoe' },
      previous_episodes: ['ep1', 'ep2'],
      previous_research_summary: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    it('should return guest when found', async () => {
      mockPersistence.getGuest.mockResolvedValue(mockGuest);

      const result = await participantsService.getParticipantById('guest-1');

      expect(mockPersistence.getGuest).toHaveBeenCalledWith('guest-1');
      expect(result).toEqual(mockGuest);
    });

    it('should return null when guest not found', async () => {
      mockPersistence.getGuest.mockResolvedValue(null);

      const result = await participantsService.getParticipantById('non-existent');

      expect(mockPersistence.getGuest).toHaveBeenCalledWith('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('createParticipant', () => {
    const participantData = {
      name: 'John Doe',
      role: 'Host',
      company: 'ABC Corp',
      bio: 'Experienced host',
      contacts: 'john@example.com',
      notes: 'Regular guest'
    };

    const mockCreatedGuest: Guest = {
      id: 'generated-id',
      legacy_id: null,
      program_id: null,
      name: 'John Doe',
      type: 'individual',
      group_type: null,
      role: 'Host',
      company: 'ABC Corp',
      company_or_group: null,
      bio: 'Experienced host',
      contacts: 'john@example.com',
      notes: 'Regular guest',
      links: [],
      members: [],
      entity_type: 'individual',
      social_handles: {},
      previous_episodes: [],
      previous_research_summary: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    it('should generate UUID and create participant with valid data', async () => {
      mockPersistence.saveGuest.mockResolvedValue(mockCreatedGuest);

      const result = await participantsService.createParticipant(participantData);

      expect(mockPersistence.saveGuest).toHaveBeenCalled();
      expect(result.id).toBeDefined(); // UUID should be generated
      expect(result.name).toBe('John Doe');
      expect(result.type).toBe('individual'); // Default
      expect(result.entity_type).toBe('individual'); // Default
    });

    it('should use provided ID if available', async () => {
      const dataWithId = { ...participantData, id: 'custom-id' };
      mockPersistence.saveGuest.mockResolvedValue({ ...mockCreatedGuest, id: 'custom-id' });

      const result = await participantsService.createParticipant(dataWithId);

      expect(mockPersistence.saveGuest).toHaveBeenCalled();
      expect(result.id).toBe('custom-id');
    });
  });

  describe('updateParticipant', () => {
    const existingGuest: Guest = {
      id: 'guest-1',
      legacy_id: null,
      program_id: null,
      name: 'John Doe',
      type: 'individual',
      group_type: null,
      role: 'Host',
      company: 'ABC Corp',
      company_or_group: null,
      bio: 'Experienced host',
      contacts: 'john@example.com',
      notes: 'Regular guest',
      links: ['https://johndoe.com'],
      members: [],
      entity_type: 'individual',
      social_handles: { twitter: '@johndoe' },
      previous_episodes: ['ep1', 'ep2'],
      previous_research_summary: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    it('should update existing participant', async () => {
      const updateData = { name: 'John Doe Updated', role: 'Senior Host' };
      const updatedGuest: Guest = {
        ...existingGuest,
        ...updateData,
        updated_at: new Date().toISOString()
      };

      mockPersistence.getGuest.mockResolvedValue(existingGuest);
      mockPersistence.saveGuest.mockResolvedValue(updatedGuest);

      const result = await participantsService.updateParticipant('guest-1', updateData);

      expect(mockPersistence.getGuest).toHaveBeenCalledWith('guest-1');
      expect(mockPersistence.saveGuest).toHaveBeenCalled();
      expect(result?.name).toBe('John Doe Updated');
      expect(result?.role).toBe('Senior Host');
    });

    it('should return null when participant not found', async () => {
      mockPersistence.getGuest.mockResolvedValue(null);

      const result = await participantsService.updateParticipant('non-existent', { name: 'Test' });

      expect(mockPersistence.getGuest).toHaveBeenCalledWith('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('deleteParticipant', () => {
    it('should delete participant and return true', async () => {
      mockPersistence.deleteGuest.mockResolvedValue(true);

      const result = await participantsService.deleteParticipant('guest-1');

      expect(mockPersistence.deleteGuest).toHaveBeenCalledWith('guest-1');
      expect(result).toBe(true);
    });

    it('should return false when deletion fails', async () => {
      mockPersistence.deleteGuest.mockResolvedValue(false);

      const result = await participantsService.deleteParticipant('guest-1');

      expect(mockPersistence.deleteGuest).toHaveBeenCalledWith('guest-1');
      expect(result).toBe(false);
    });
  });
});