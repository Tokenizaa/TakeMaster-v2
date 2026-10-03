import { Program, ShowFormat, CameraConfig } from '../../types/domain';
import { SupabasePersistence } from '../../server/supabasePersistence';

export class ProgramsService {
  constructor(private persistence: SupabasePersistence) {}

  private generateUuid(): string {
    // Simple UUID v4 generator
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  async getPrograms(filters?: {
    search?: string;
    format?: ShowFormat;
    limit?: number;
    offset?: number;
  }): Promise<{ data: Program[]; count: number }> {
    // Pass filters to the persistence layer
    return await this.persistence.getPrograms(filters);
  }

  async getProgramById(id: string): Promise<Program | null> {
    const program = await this.persistence.getProgram(id);
    return program ?? null;
  }

   async createProgram(programData: Omit<Program, 'id' | 'createdAt' | 'updatedAt'>): Promise<Program> {
     // Generate UUID if not provided
     const id = ('id' in programData && programData.id !== undefined && programData.id !== '') 
       ? (programData as any).id 
       : this.generateUuid();
     const now = new Date().toISOString();
     
     const program: Program = {
       id,
       title: programData.title,
       description: programData.description,
       host: programData.host,
       format: programData.format,
       defaultDurationMin: programData.defaultDurationMin,
       editorialStyle: programData.editorialStyle,
       scenario: programData.scenario,
       cameras: programData.cameras ?? [],
       standardStructure: programData.standardStructure ?? [],
       defaultOpening: programData.defaultOpening ?? '',
       defaultClosing: programData.defaultClosing ?? '',
       createdAt: ('createdAt' in programData && programData.createdAt !== undefined) 
         ? (programData as any).createdAt 
         : now,
       updatedAt: ('updatedAt' in programData && programData.updatedAt !== undefined) 
         ? (programData as any).updatedAt 
         : now
     };
    
    return await this.persistence.saveProgram(program);
  }

  async updateProgram(id: string, programData: Partial<Program>): Promise<Program | null> {
    // First get the existing program
    const existingProgram = await this.persistence.getProgram(id);
    if (!existingProgram) {
      return null;
    }
    
    // Merge the data
    const updatedProgram: Program = {
      ...existingProgram,
      ...programData,
      updatedAt: new Date().toISOString() // Always update the timestamp
    };
    
    return await this.persistence.saveProgram(updatedProgram);
  }

  async deleteProgram(id: string): Promise<boolean> {
    return await this.persistence.deleteProgram(id);
  }
}
