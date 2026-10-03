import { validateParticipantData, validateParticipantId, ValidationError } from '../participants.validators';
import type { Guest, ParticipantType, GroupType, EntityType } from '../../types/domain';

describe('validateParticipantData', () => {
  const validParticipantData: Omit<Guest, 'id' | 'created_at' | 'updated_at'> = {
    name: 'John Doe',
    role: 'Host',
    company: 'ABC Corp',
    bio: 'Experienced host',
    contacts: 'john@example.com',
    notes: 'Regular guest',
    type: 'individual',
    group_type: null,
    entity_type: 'individual',
    links: [],
    members: [],
    social_handles: {},
    previous_episodes: [],
    previous_research_summary: null,
    legacy_id: null,
    program_id: null,
    company_or_group: null
  };

  it('should return no errors for valid participant data (create)', () => {
    const errors = validateParticipantData(validParticipantData);
    expect(errors).toHaveLength(0);
  });

  it('should return no errors for valid participant data (update)', () => {
    const errors = validateParticipantData(validParticipantData, true);
    expect(errors).toHaveLength(0);
  });

  it('should return errors for missing required fields (create)', () => {
    const errors = validateParticipantData({} as Omit<Guest, 'id' | 'created_at' | 'updated_at'>);
    
    // Check for each required field
    const requiredFields = ['name', 'role', 'company', 'bio', 'contacts', 'notes'];
    for (const field of requiredFields) {
      expect(errors).toContainEqual(expect.objectContaining({ field, message: `${field} is required` }));
    }
  });

  it('should return no errors for missing required fields (update) when not provided', () => {
    const errors = validateParticipantData({} as Partial<Guest>, true);
    expect(errors).toHaveLength(0);
  });

  it('should return errors for empty string required fields (create)', () => {
    const dataWithEmptyStrings = {
      name: '',
      role: '',
      company: '',
      bio: '',
      contacts: '',
      notes: ''
    } as Omit<Guest, 'id' | 'created_at' | 'updated_at'>;
    
    const errors = validateParticipantData(dataWithEmptyStrings);
    
    const requiredFields = ['name', 'role', 'company', 'bio', 'contacts', 'notes'];
    for (const field of requiredFields) {
      expect(errors).toContainEqual(expect.objectContaining({ field, message: `${field} is required` }));
    }
  });

  it('should return errors for invalid type enum', () => {
    const errors = validateParticipantData({ ...validParticipantData, type: 'invalid' as ParticipantType });
    expect(errors).toContainEqual(
      expect.objectContaining({
        field: 'type',
        message: expect.stringContaining('Invalid type')
      })
    );
  });

  it('should return no errors for valid type enum values', () => {
    const validTypes: ParticipantType[] = ['individual', 'group', 'band'];
    for (const type of validTypes) {
      const errors = validateParticipantData({ ...validParticipantData, type });
      const typeErrors = errors.filter(e => e.field === 'type');
      expect(typeErrors).toHaveLength(0);
    }
  });

  it('should return errors for invalid group_type enum', () => {
    const errors = validateParticipantData({ ...validParticipantData, group_type: 'invalid' as GroupType });
    expect(errors).toContainEqual(
      expect.objectContaining({
        field: 'group_type',
        message: expect.stringContaining('Invalid group type')
      })
    );
  });

  it('should return no errors for valid group_type enum values', () => {
    const validGroupTypes: GroupType[] = ['band', 'duo', 'group', 'crew', 'choir'];
    for (const groupType of validGroupTypes) {
      const errors = validateParticipantData({ ...validParticipantData, group_type });
      const groupTypeErrors = errors.filter(e => e.field === 'group_type');
      expect(groupTypeErrors).toHaveLength(0);
    }
  });

  it('should return errors for invalid entity_type enum', () => {
    const errors = validateParticipantData({ ...validParticipantData, entity_type: 'invalid' as EntityType });
    expect(errors).toContainEqual(
      expect.objectContaining({
        field: 'entity_type',
        message: expect.stringContaining('Invalid entity type')
      })
    );
  });

  it('should return no errors for valid entity_type enum values', () => {
    const validEntityTypes: EntityType[] = ['individual', 'group', 'band'];
    for (const entityType of validEntityTypes) {
      const errors = validateParticipantData({ ...validParticipantData, entity_type });
      const entityTypeErrors = errors.filter(e => e.field === 'entity_type');
      expect(entityTypeErrors).toHaveLength(0);
    }
  });

  it('should return errors for invalid social_handles type (not an object)', () => {
    const errors = validateParticipantData({ ...validParticipantData, social_handles: 'invalid' as any });
    expect(errors).toContainEqual(
      expect.objectContaining({
        field: 'social_handles',
        message: 'social_handles must be an object'
      })
    );
  });

  it('should return errors for invalid links type (not an array)', () => {
    const errors = validateParticipantData({ ...validParticipantData, links: 'invalid' as any });
    expect(errors).toContainEqual(
      expect.objectContaining({
        field: 'links',
        message: 'links must be an array'
      })
    );
  });

  it('should return errors for links array containing non-string elements', () => {
    const errors = validateParticipantData({ ...validParticipantData, links: ['valid', 123 as any] });
    expect(errors).toContainEqual(
      expect.objectContaining({
        field: 'links[1]',
        message: 'links[1] must be a string'
      })
    );
  });

  it('should return errors for invalid members type (not an array)', () => {
    const errors = validateParticipantData({ ...validParticipantData, members: 'invalid' as any });
    expect(errors).toContainEqual(
      expect.objectContaining({
        field: 'members',
        message: 'members must be an array'
      })
    );
  });

  it('should return errors for members array containing non-string elements', () => {
    const errors = validateParticipantData({ ...validParticipantData, members: ['valid', 123 as any] });
    expect(errors).toContainEqual(
      expect.objectContaining({
        field: 'members[1]',
        message: 'members[1] must be a string'
      })
    );
  });

  it('should return errors for invalid previous_episodes type (not an array)', () => {
    const errors = validateParticipantData({ ...validParticipantData, previous_episodes: 'invalid' as any });
    expect(errors).toContainEqual(
      expect.objectContaining({
        field: 'previous_episodes',
        message: 'previous_episodes must be an array'
      })
    );
  });

  it('should return errors for previous_episodes array containing non-string elements', () => {
    const errors = validateParticipantData({ ...validParticipantData, previous_episodes: ['valid', 123 as any] });
    expect(errors).toContainEqual(
      expect.objectContaining({
        field: 'previous_episodes[1]',
        message: 'previous_episodes[1] must be a string'
      })
    );
  });

  it('should return errors for string fields exceeding 1000 characters', () => {
    const longString = 'a'.repeat(1001);
    const errors = validateParticipantData({ ...validParticipantData, name: longString });
    expect(errors).toContainEqual(
      expect.objectContaining({
        field: 'name',
        message: 'name must not exceed 1000 characters'
      })
    );
  });

  it('should return errors for empty legacy_id', () => {
    const errors = validateParticipantData({ ...validParticipantData, legacy_id: '' });
    expect(errors).toContainEqual(
      expect.objectContaining({
        field: 'legacy_id',
        message: 'legacy_id must be a non-empty string'
      })
    );
  });

  it('should return errors for empty program_id', () => {
    const errors = validateParticipantData({ ...validParticipantData, program_id: '' });
    expect(errors).toContainEqual(
      expect.objectContaining({
        field: 'program_id',
        message: 'program_id must be a non-empty string'
      })
    );
  });

  it('should return errors for empty company_or_group when provided', () => {
    const errors = validateParticipantData({ ...validParticipantData, company_or_group: '' });
    expect(errors).toContainEqual(
      expect.objectContaining({
        field: 'company_or_group',
        message: 'company_or_group is required'
      })
    );
  });

  it('should allow null for optional fields', () => {
    const dataWithNulls = {
      ...validParticipantData,
      legacy_id: null,
      program_id: null,
      group_type: null,
      entity_type: null,
      company_or_group: null,
      bio: null,
      contacts: null,
      notes: null,
      links: null,
      members: null,
      social_handles: null,
      previous_episodes: null,
      previous_research_summary: null
    };
    
    const errors = validateParticipantData(dataWithNulls, true); // Update mode
    expect(errors).toHaveLength(0);
  });
});

describe('validateParticipantId', () => {
  it('should return error for empty id', () => {
    const errors = validateParticipantId('');
    expect(errors).toContainEqual({ field: 'id', message: 'Participant ID is required' });
  });

  it('should return error for whitespace-only id', () => {
    const errors = validateParticipantId('   ');
    expect(errors).toContainEqual({ field: 'id', message: 'Participant ID is required' });
  });

  it('should return no errors for valid id', () => {
    const errors = validateParticipantId('valid-id-123');
    expect(errors).toHaveLength(0);
  });
});