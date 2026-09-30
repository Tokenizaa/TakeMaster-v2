import type { SupabaseClient } from '@supabase/supabase-js';
import type { Show, Episode, Guest } from '../types';
import { AppError } from './errors';

export interface Persistence {
  listPrograms(): Promise<Show[]>;
  getProgram(id: string): Promise<Show | null>;
  saveProgram(show: Show, organizationId: string): Promise<Show>;
  deleteProgram(id: string): Promise<void>;

  listEpisodes(programId?: string): Promise<Episode[]>;
  getEpisode(id: string): Promise<Episode | null>;
  saveEpisode(episode: Episode, organizationId: string): Promise<Episode>;
  deleteEpisode(id: string): Promise<void>;

  listParticipants(): Promise<Guest[]>;
  saveParticipant(guest: Guest, organizationId: string): Promise<Guest>;
}

type ProgramRow = {
  id: string;
  legacy_id: string | null;
  name: string;
  title: string | null;
  description: string | null;
  host: string | null;
  format: string | null;
  organization_id: string;
  standard_structure: string[] | null;
  default_segments: string[] | null;
  standard_segments: string[] | null;
};

function requireValue<T>(value: T | null | undefined, field: string): T {
  if (value === null || value === undefined) throw new AppError(`Schema incompatível: coluna ${field} não retornou valor`, 'PERSISTENCE_SCHEMA_MISMATCH', 500);
  return value;
}

/**
 * Adapter boundary for the shared V1 schema.
 *
 * This deliberately implements only the Program mapping until the live shared
 * schema is reachable. Episode/Participant mapping must be completed from the
 * live schema before this adapter becomes the application source of truth.
 */
export class SupabasePersistence implements Persistence {
  constructor(private readonly client: SupabaseClient) {}

  async listPrograms(): Promise<Show[]> {
    const { data, error } = await this.client
      .from('programs')
      .select('id,legacy_id,name,title,description,host,format,organization_id,standard_structure,default_segments,standard_segments')
      .order('created_at', { ascending: true });

    if (error) throw new AppError(error.message, 'PERSISTENCE_READ_FAILED', 500);
    return (data ?? []).map(row => this.mapProgram(row as ProgramRow));
  }

  async getProgram(id: string): Promise<Show | null> {
    const { data, error } = await this.client
      .from('programs')
      .select('id,legacy_id,name,title,description,host,format,organization_id,standard_structure,default_segments,standard_segments')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new AppError(error.message, 'PERSISTENCE_READ_FAILED', 500);
    return data ? this.mapProgram(data as ProgramRow) : null;
  }

  async saveProgram(show: Show, organizationId: string): Promise<Show> {
    const payload = {
      legacy_id: show.id,
      name: show.title,
      title: show.title,
      description: show.description,
      host: show.host,
      format: show.format,
      organization_id: organizationId,
      standard_structure: show.standardStructure,
      default_segments: [],
      standard_segments: show.standardStructure,
    };

    const { data, error } = await this.client
      .from('programs')
      .upsert(payload, { onConflict: 'id' })
      .select('id,legacy_id,name,title,description,host,format,organization_id,standard_structure,default_segments,standard_segments')
      .single();

    if (error) throw new AppError(error.message, 'PERSISTENCE_WRITE_FAILED', 500);
    return this.mapProgram(data as ProgramRow);
  }

  async deleteProgram(id: string): Promise<void> {
    const { error } = await this.client.from('programs').delete().eq('id', id);
    if (error) throw new AppError(error.message, 'PERSISTENCE_DELETE_FAILED', 500);
  }

  async listEpisodes(_programId?: string): Promise<Episode[]> {
    throw new AppError('Episode mapping ainda depende da validação do schema compartilhado', 'PERSISTENCE_SCHEMA_BLOCKED', 503);
  }

  async getEpisode(_id: string): Promise<Episode | null> {
    throw new AppError('Episode mapping ainda depende da validação do schema compartilhado', 'PERSISTENCE_SCHEMA_BLOCKED', 503);
  }

  async saveEpisode(_episode: Episode, _organizationId: string): Promise<Episode> {
    throw new AppError('Episode mapping ainda depende da validação do schema compartilhado', 'PERSISTENCE_SCHEMA_BLOCKED', 503);
  }

  async deleteEpisode(_id: string): Promise<void> {
    throw new AppError('Episode mapping ainda depende da validação do schema compartilhado', 'PERSISTENCE_SCHEMA_BLOCKED', 503);
  }

  async listParticipants(): Promise<Guest[]> {
    throw new AppError('Participant mapping ainda depende da validação do schema compartilhado', 'PERSISTENCE_SCHEMA_BLOCKED', 503);
  }

  async saveParticipant(_guest: Guest, _organizationId: string): Promise<Guest> {
    throw new AppError('Participant mapping ainda depende da validação do schema compartilhado', 'PERSISTENCE_SCHEMA_BLOCKED', 503);
  }

  private mapProgram(row: ProgramRow): Show {
    const structure = row.standard_structure ?? row.standard_segments ?? row.default_segments ?? [];
    return {
      id: requireValue(row.id, 'programs.id'),
      title: row.title ?? row.name,
      description: row.description ?? '',
      host: row.host ?? '',
      format: (row.format ?? 'Outro') as Show['format'],
      defaultDurationMin: 45,
      editorialStyle: '',
      scenario: '',
      cameras: [],
      standardStructure: structure,
      defaultOpening: '',
      defaultClosing: '',
      createdAt: '',
      updatedAt: '',
    };
  }
}
