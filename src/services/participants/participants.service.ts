import { Guest, ParticipantType, GroupType, EntityType } from '../../types/domain';
import { SupabasePersistence } from '../../server/supabasePersistence';

const persistence = new SupabasePersistence();

export class ParticipantsService {
  private generateUuid(): string {
    // Simple UUID v4 generator
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

    async getParticipants(filters?: {
       search?: string;
       type?: ParticipantType;
       group_type?: GroupType;
       role?: string;
       entity_type?: EntityType;
       company?: string;
       limit?: number;
       offset?: number;
     }): Promise<{ data: Guest[]; count: number }> {
       // Delegates filtering, search, and pagination to the persistence layer
       return await persistence.getGuests(filters);
     }

  async getParticipantById(id: string): Promise<Guest | null> {
    const participant = await persistence.getGuest(id);
    return participant ?? null;
  }

  async createParticipant(participantData: Omit<Guest, 'id' | 'created_at' | 'updated_at'>): Promise<Guest> {
    // Generate UUID if not provided
    const id = ('id' in participantData && participantData.id !== undefined && participantData.id !== '') 
      ? (participantData as any).id 
      : this.generateUuid();
    const now = new Date().toISOString();
    
    const participant: Guest = {
      id,
      legacy_id: participantData.legacy_id ?? null,
      program_id: participantData.program_id ?? null,
      name: participantData.name,
      type: participantData.type ?? 'individual', // Default type
      group_type: participantData.group_type ?? null,
      role: participantData.role,
      company: participantData.company,
      company_or_group: participantData.company_or_group ?? null,
      bio: participantData.bio,
      contacts: participantData.contacts,
      notes: participantData.notes,
      links: participantData.links ?? [],
      members: participantData.members ?? [],
      entity_type: participantData.entity_type ?? 'individual', // Default entity type
      social_handles: participantData.social_handles ?? {},
      previous_episodes: participantData.previous_episodes ?? [],
      previous_research_summary: participantData.previous_research_summary ?? null,
      created_at: now,
      updated_at: now
    };
    
    return await persistence.saveGuest(participant);
  }

  async updateParticipant(id: string, participantData: Partial<Guest>): Promise<Guest | null> {
    // First get the existing participant
    const existingParticipant = await persistence.getGuest(id);
    if (!existingParticipant) {
      return null;
    }
    
    // Merge the data
    const updatedParticipant: Guest = {
      ...existingParticipant,
      ...participantData,
      updated_at: new Date().toISOString() // Always update the timestamp
    };
    
    return await persistence.saveGuest(updatedParticipant);
  }

  async deleteParticipant(id: string): Promise<boolean> {
    return await persistence.deleteGuest(id);
  }
}

export const participantsService = new ParticipantsService();