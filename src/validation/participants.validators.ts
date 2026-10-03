import { Guest, ParticipantType, GroupType, EntityType } from '../types/domain';

// Define the enums for validation based on requirements
const VALID_TYPES: ('individual' | 'group' | 'band')[] = [
  'individual',
  'group',
  'band'
];

const VALID_GROUP_TYPES: ('band' | 'duo' | 'group' | 'crew' | 'choir')[] = [
  'band',
  'duo',
  'group',
  'crew',
  'choir'
];

const VALID_ENTITY_TYPES: ('individual' | 'group' | 'band')[] = [
  'individual',
  'group',
  'band'
];

export interface ValidationError {
  field: string;
  message: string;
}

export function validateParticipantData(participant: Partial<Guest>, isUpdate: boolean = false): ValidationError[] {
    const errors: ValidationError[] = [];

    // Validate required fields (for create, all required; for update, only if present)
    // Based on the schema after corrections, required fields are: name, role, company, bio, contacts, notes
    const requiredFields = ['name', 'role', 'company', 'bio', 'contacts', 'notes'];
    for (const field of requiredFields) {
        if (!isUpdate || (isUpdate && participant[field as keyof Partial<Guest>] !== undefined)) {
            const value = participant[field as keyof Partial<Guest>];
            if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
                errors.push({ field, message: `${field} is required` });
            }
        }
    }

    // Validate type enum
    if (participant.type !== undefined && participant.type !== null) {
        if (!VALID_TYPES.includes(participant.type as ParticipantType)) {
            errors.push({ field: 'type', message: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}` });
        }
    }

    // Validate group_type enum
    if (participant.group_type !== undefined && participant.group_type !== null) {
        if (!VALID_GROUP_TYPES.includes(participant.group_type as GroupType)) {
            errors.push({ field: 'group_type', message: `Invalid group type. Must be one of: ${VALID_GROUP_TYPES.join(', ')}` });
        }
    }

    // Validate entity_type enum
    if (participant.entity_type !== undefined && participant.entity_type !== null) {
        if (!VALID_ENTITY_TYPES.includes(participant.entity_type as EntityType)) {
            errors.push({ field: 'entity_type', message: `Invalid entity type. Must be one of: ${VALID_ENTITY_TYPES.join(', ')}` });
        }
    }

    // Validate non-negative numbers (if any)
    // Note: Based on schema, there don't appear to be numeric fields that need non-negative validation
    // But we'll check if any are added in the future

    // Validate JSONB fields structure
    if (participant.social_handles !== undefined && participant.social_handles !== null) {
        if (typeof participant.social_handles !== 'object' || Array.isArray(participant.social_handles)) {
            errors.push({ field: 'social_handles', message: 'social_handles must be an object' });
        }
    }

    // Validate array fields structure
    const arrayFields = ['links', 'members', 'previous_episodes'];
    for (const field of arrayFields) {
        if (participant[field as keyof Partial<Guest>] !== undefined && participant[field as keyof Partial<Guest>] !== null) {
            if (!Array.isArray(participant[field as keyof Partial<Guest>])) {
                errors.push({ field, message: `${field} must be an array` });
            } else {
                // Validate array elements are strings for links, members, previous_episodes
                if (field === 'links' || field === 'members' || field === 'previous_episodes') {
                    const array = participant[field as keyof Partial<Guest>] as unknown[];
                    for (let i = 0; i < array.length; i++) {
                        const element = array[i];
                        if (typeof element !== 'string') {
                            errors.push({ field: `${field}[${i}]`, message: `${field}[${i}] must be a string` });
                        }
                    }
                }
            }
        }
    }

    // Validate string fields length (optional)
    const stringFields = ['name', 'role', 'company', 'bio', 'contacts', 'notes', 'company_or_group', 'legacy_id', 'program_id'];
    for (const field of stringFields) {
        if (participant[field as keyof Partial<Guest>] !== undefined && participant[field as keyof Partial<Guest>] !== null) {
            const value = participant[field as keyof Partial<Guest>] as string;
            if (value.length > 1000) {
                errors.push({ field, message: `${field} must not exceed 1000 characters` });
            }
        }
    }

    // Validate legacy_id, program_id are strings (if provided)
    if (participant.legacy_id !== undefined && participant.legacy_id !== null) {
        if (typeof participant.legacy_id !== 'string' || participant.legacy_id.trim() === '') {
            errors.push({ field: 'legacy_id', message: 'legacy_id must be a non-empty string' });
        }
    }

    if (participant.program_id !== undefined && participant.program_id !== null) {
        if (typeof participant.program_id !== 'string' || participant.program_id.trim() === '') {
            errors.push({ field: 'program_id', message: 'program_id must be a non-empty string' });
        }
    }

    return errors;
}

export function validateParticipantId(id: string): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!id || id.trim() === '') {
    errors.push({ field: 'id', message: 'Participant ID is required' });
  }
  return errors;
}