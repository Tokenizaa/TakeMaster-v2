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
  id: string; legacy_id: string | null; name: string | null; title: string | null;
  description: string | null; host: string | null; format: string | null;
  default_duration_min: number | null; editorial_style: string | null; scenario: string | null;
  standard_structure: string[] | null; default_opening: string | null; default_closing: string | null;
  standard_segments: unknown[] | null; organization_id: string | null;
  created_at: string; updated_at: string;
};

type EpisodeRow = {
  id: string; legacy_id: string | null; program_id: string; episode_number: number | null;
  title: string; idea: string | null; format: string; target_duration_min: number | null;
  host: string | null; status: string; diagnosis: unknown; research: unknown;
  technical_checklist: unknown; editorial_notes_for_post: string | null;
  editor_script_synthesis: string | null; recording_time_elapsed: number | null;
  scheduled_date: string | null; created_at: string; updated_at: string;
  checklist: unknown; production_status: string; version: number;
};

type ParticipantRow = {
  id: string; legacy_id: string | null; program_id: string; name: string;
  role: string | null; company: string | null; company_or_group: string | null;
  bio: string | null; contacts: string | null; notes: string | null;
  links: string[] | null; members: string[] | null; previous_episodes: number | null;
  created_at: string; updated_at: string;
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
      .select('id,legacy_id,name,title,description,host,format,default_duration_min,editorial_style,scenario,standard_structure,default_opening,default_closing,standard_segments,organization_id,created_at,updated_at')
      .order('created_at', { ascending: true });

    if (error) throw new AppError(error.message, 'PERSISTENCE_READ_FAILED', 500);
    return (data ?? []).map(row => this.mapProgram(row as ProgramRow));
  }

  async getProgram(id: string): Promise<Show | null> {
    const { data, error } = await this.client
      .from('programs')
      .select('id,legacy_id,name,title,description,host,format,default_duration_min,editorial_style,scenario,standard_structure,default_opening,default_closing,standard_segments,organization_id,created_at,updated_at')
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
      default_duration_min: show.defaultDurationMin,
      editorial_style: show.editorialStyle,
      scenario: show.scenario,
      standard_structure: show.standardStructure,
      default_opening: show.defaultOpening,
      default_closing: show.defaultClosing,
      standard_segments: show.standardStructure,
    };

    const { data, error } = await this.client
      .from('programs')
      .upsert(payload, { onConflict: 'id' })
      .select('id,legacy_id,name,title,description,host,format,default_duration_min,editorial_style,scenario,standard_structure,default_opening,default_closing,standard_segments,organization_id,created_at,updated_at')
      .single();

    if (error) throw new AppError(error.message, 'PERSISTENCE_WRITE_FAILED', 500);
    return this.mapProgram(data as ProgramRow);
  }

  async deleteProgram(id: string): Promise<void> {
    const { error } = await this.client.from('programs').delete().eq('id', id);
    if (error) throw new AppError(error.message, 'PERSISTENCE_DELETE_FAILED', 500);
  }

  async listEpisodes(programId?: string): Promise<Episode[]> {
    let query = this.client.from('episodes').select('*').order('created_at', { ascending: true });
    if (programId) query = query.eq('program_id', programId);
    const { data, error } = await query;
    if (error) throw new AppError(error.message, 'PERSISTENCE_READ_FAILED', 500);
    return (data ?? []).map(row => this.mapEpisode(row as EpisodeRow));
  }

  async getEpisode(id: string): Promise<Episode | null> {
    const { data, error } = await this.client.from('episodes').select('*').eq('id', id).maybeSingle();
    if (error) throw new AppError(error.message, 'PERSISTENCE_READ_FAILED', 500);
    return data ? this.mapEpisode(data as EpisodeRow) : null;
  }

  async saveEpisode(episode: Episode, _organizationId: string): Promise<Episode> {
    const payload = {
      legacy_id: episode.id, program_id: episode.showId, episode_number: episode.episodeNumber,
      title: episode.title, idea: episode.idea, format: episode.format,
      target_duration_min: episode.targetDurationMin, host: episode.host, status: episode.status,
      diagnosis: episode.diagnosis ?? null, research: episode.research ?? null,
      technical_checklist: episode.technicalChecklist ?? null,
      editorial_notes_for_post: episode.editorialNotesForPost ?? null,
      editor_script_synthesis: episode.editorScriptSynthesis ?? null,
      recording_time_elapsed: episode.recordingTimeElapsed ?? 0,
      scheduled_date: episode.scheduledDate ?? null, checklist: episode.checklist ?? null,
      production_status: episode.productionStatus ?? 'draft', version: episode.version ?? 1,
    };
    const { data, error } = await this.client.from('episodes').upsert(payload, { onConflict: 'id' }).select('*').single();
    if (error) throw new AppError(error.message, 'PERSISTENCE_WRITE_FAILED', 500);
    return this.mapEpisode(data as EpisodeRow);
  }

  async deleteEpisode(id: string): Promise<void> {
    const { error } = await this.client.from('episodes').delete().eq('id', id);
    if (error) throw new AppError(error.message, 'PERSISTENCE_DELETE_FAILED', 500);
  }

  async listParticipants(): Promise<Guest[]> {
    const { data, error } = await this.client.from('participants').select('*').order('created_at', { ascending: true });
    if (error) throw new AppError(error.message, 'PERSISTENCE_READ_FAILED', 500);
    return (data ?? []).map(row => this.mapParticipant(row as ParticipantRow));
  }

  async saveParticipant(guest: Guest, _organizationId: string): Promise<Guest> {
    const payload = {
      legacy_id: guest.id, program_id: guest.showId, name: guest.name, role: guest.role,
      company: guest.company, company_or_group: guest.company, bio: guest.bio,
      contacts: guest.contacts, notes: guest.notes, links: guest.links ?? [],
      members: guest.members ?? [], previous_episodes: guest.previousEpisodes ?? 0,
    };
    const { data, error } = await this.client.from('participants').upsert(payload, { onConflict: 'id' }).select('*').single();
    if (error) throw new AppError(error.message, 'PERSISTENCE_WRITE_FAILED', 500);
    return this.mapParticipant(data as ParticipantRow);
  }

  private mapProgram(row: ProgramRow): Show {
    return {
      id: requireValue(row.id, 'programs.id'), title: row.title ?? row.name ?? '',
      description: row.description ?? '', host: row.host ?? '',
      format: (row.format ?? 'Outro') as Show['format'],
      defaultDurationMin: row.default_duration_min ?? 45,
      editorialStyle: row.editorial_style ?? '', scenario: row.scenario ?? '',
      cameras: [], standardStructure: row.standard_structure ?? [],
      defaultOpening: row.default_opening ?? '', defaultClosing: row.default_closing ?? '',
      createdAt: row.created_at, updatedAt: row.updated_at,
    };
  }

  private mapEpisode(row: EpisodeRow): Episode {
    return {
      id: requireValue(row.id, 'episodes.id'), showId: row.program_id,
      episodeNumber: row.episode_number ?? 0, title: row.title ?? '', idea: row.idea ?? '',
      guestName: '', host: row.host ?? '', format: row.format as Episode['format'],
      status: row.status as Episode['status'], targetDurationMin: row.target_duration_min ?? 0,
      diagnosis: row.diagnosis as Episode['diagnosis'], research: row.research as Episode['research'],
      technicalChecklist: row.technical_checklist as Episode['technicalChecklist'],
      editorialNotesForPost: row.editorial_notes_for_post ?? '',
      editorScriptSynthesis: row.editor_script_synthesis ?? '',
      recordingTimeElapsed: row.recording_time_elapsed ?? 0, scheduledDate: row.scheduled_date ?? undefined,
      checklist: row.checklist as Episode['checklist'], productionStatus: row.production_status,
      version: row.version, createdAt: row.created_at, updatedAt: row.updated_at,
    };
  }

  private mapParticipant(row: ParticipantRow): Guest {
    return {
      id: requireValue(row.id, 'participants.id'), showId: row.program_id, name: row.name,
      role: row.role ?? '', company: row.company ?? row.company_or_group ?? '',
      bio: row.bio ?? '', contacts: row.contacts ?? '', notes: row.notes ?? '',
      links: row.links ?? [], members: row.members ?? [], previousEpisodes: row.previous_episodes ?? 0,
    };
  }
}
