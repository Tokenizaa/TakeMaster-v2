import { getSupabaseAdmin } from './supabase';
import type { 
  Program, Episode, Guest, CameraConfig, EditorialDiagnosis, ResearchData, 
  OutlineBlock, Question, FollowUp, ScriptItem, PlannedShort, ProductionAsset, 
  RecordingMarker, TechnicalChecklist, ScriptVersion, DatabaseState, EpisodeStatus, 
  ShowFormat, ParticipantType, GroupType, EntityType, Segment,
  RecordingSession, RecordingSessionStatus,
  AssetFolder, AssetTag, LibrarySearchFilters
} from '../types/domain';

export interface CatalogStats {
  totalPrograms: number;
  totalEpisodes: number;
  totalParticipants: number;
  totalAssets: number;
  totalShorts: number;
  totalSegments: number;
  episodesByStatus: Record<string, number>;
  programsWithEpisodes: number;
}

export interface SearchCatalogResult {
  programs: Program[];
  episodes: Episode[];
  participants: Guest[];
  totalCount: number;
}

export interface PaginatedResult<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ProgramsCatalogFilters {
  search?: string;
  format?: string;
  limit?: number;
  offset?: number;
}

export interface EpisodesCatalogFilters {
  search?: string;
  program_id?: string;
  status?: EpisodeStatus;
  limit?: number;
  offset?: number;
  order_by?: string;
  ascending?: boolean;
}

export interface ParticipantsCatalogFilters {
  search?: string;
  type?: ParticipantType;
  group_type?: GroupType;
  role?: string;
  entity_type?: EntityType;
  company?: string;
  limit?: number;
  offset?: number;
}

export interface AssetsCatalogFilters {
  search?: string;
  type?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface CatalogStats {
  totalPrograms: number;
  totalEpisodes: number;
  totalParticipants: number;
  totalAssets: number;
  totalShorts: number;
  totalSegments: number;
  episodesByStatus: Record<string, number>;
  programsWithEpisodes: number;
  recentEpisodes: number;
  recentParticipants: number;
}

export class SupabasePersistence {
  private _supabase = getSupabaseAdmin();

  get supabase() {
    return this._supabase;
  }

  async getPrograms(filters?: {
    search?: string;
    format?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: Program[]; count: number }> {
    let query = this.supabase
      .from('programs')
      .select(`
        id,
        name,
        description,
        host,
        format,
        default_duration_min,
        default_episode_duration_minutes,
        default_opening,
        default_closing,
        default_presenter_name,
        default_segments,
        editorial_style,
        scenario,
        standard_segments,
        standard_structure,
        target_audience,
        title,
        tone,
        updated_at,
        created_at,
        legacy_id,
        organization_id,
        catalog_program_id,
        cameras (
          id,
          name,
          label,
          purpose,
          framing,
          active
        )
      `, { count: 'exact' });

    if (filters?.search) {
      const searchTerm = `%${filters.search}%`;
      query = query.or(`title.ilike.${searchTerm},description.ilike.${searchTerm},host.ilike.${searchTerm}`);
    }

    if (filters?.format) {
      query = query.eq('format', filters.format);
    }

    if (filters?.offset !== undefined) {
      const limit = filters.limit ?? 100;
      query = query.range(filters.offset, filters.offset + limit - 1);
    } else if (filters?.limit !== undefined) {
      query = query.limit(filters.limit);
    }

    const { data: result, error, count } = await query;

    if (error) throw error;

    const programs: Program[] = result.map(p => ({
      id: p.id,
      title: p.title ?? p.name ?? '',
      description: p.description,
      host: p.host ?? '',
      format: p.format as any,
      defaultDurationMin: p.default_duration_min ?? 0,
      defaultEpisodeDurationMinutes: p.default_episode_duration_minutes,
      editorialStyle: p.editorial_style ?? '',
      scenario: p.scenario ?? '',
      cameras: p.cameras?.map(c => ({
        id: c.id,
        name: c.name,
        label: c.label ?? '',
        purpose: c.purpose ?? '',
        framing: c.framing ?? '',
        active: c.active ?? false
      })) ?? [],
      standardStructure: p.standard_structure ?? [],
      defaultOpening: p.default_opening ?? '',
      defaultClosing: p.default_closing ?? '',
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      defaultPresenterName: p.default_presenter_name,
      defaultSegments: p.default_segments,
      standardSegments: p.standard_segments,
      targetAudience: p.target_audience,
      tone: p.tone
    }));

    return {
      data: programs,
      count: count ?? 0
    };
  }

  async getProgram(id: string): Promise<Program | undefined> {
    const { data: programs, error } = await this.supabase
      .from('programs')
      .select(`
        id,
        name,
        description,
        host,
        format,
        default_duration_min,
        default_episode_duration_minutes,
        default_opening,
        default_closing,
        default_presenter_name,
        default_segments,
        editorial_style,
        scenario,
        standard_segments,
        standard_structure,
        target_audience,
        title,
        tone,
        updated_at,
        created_at,
        legacy_id,
        organization_id,
        catalog_program_id,
        cameras (
          id,
          name,
          label,
          purpose,
          framing,
          active
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!programs) return undefined;

    const p = programs;
    return {
      id: p.id,
      title: p.title ?? p.name ?? '',
      description: p.description,
      host: p.host ?? '',
      format: p.format as any,
      defaultDurationMin: p.default_duration_min ?? 0,
      defaultEpisodeDurationMinutes: p.default_episode_duration_minutes,
      editorialStyle: p.editorial_style ?? '',
      scenario: p.scenario ?? '',
      cameras: p.cameras?.map(c => ({
        id: c.id,
        name: c.name,
        label: c.label ?? '',
        purpose: c.purpose ?? '',
        framing: c.framing ?? '',
        active: c.active ?? false
      })) ?? [],
      standardStructure: p.standard_structure ?? [],
      defaultOpening: p.default_opening ?? '',
      defaultClosing: p.default_closing ?? '',
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      defaultPresenterName: p.default_presenter_name,
      defaultSegments: p.default_segments,
      standardSegments: p.standard_segments,
      targetAudience: p.target_audience,
      tone: p.tone
    };
  }

  async saveProgram(program: Program): Promise<Program> {
    const programData = {
      id: program.id,
      name: program.title,
      description: program.description,
      host: program.host,
      format: program.format,
      default_duration_min: program.defaultDurationMin,
      default_episode_duration_minutes: program.defaultEpisodeDurationMinutes ?? program.defaultDurationMin,
      default_opening: program.defaultOpening,
      default_closing: program.defaultClosing,
      default_presenter_name: program.defaultPresenterName ?? program.host,
      default_segments: program.defaultSegments ?? [],
      editorial_style: program.editorialStyle,
      scenario: program.scenario,
      standard_segments: program.standardSegments ?? [],
      standard_structure: program.standardStructure,
      target_audience: program.targetAudience ?? null,
      title: program.title,
      tone: program.tone ?? null,
      updated_at: program.updatedAt,
      created_at: program.createdAt,
      legacy_id: null,
      organization_id: null,
      catalog_program_id: null
    };

    const { error: upsertError } = await this.supabase
      .from('programs')
      .upsert(programData, { onConflict: 'id' });

    if (upsertError) throw upsertError;

    await this.supabase
      .from('cameras')
      .delete()
      .eq('program_id', program.id);

    if (program.cameras.length > 0) {
      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const camerasData = program.cameras.map(c => ({
        id: UUID_RE.test(c.id) ? c.id : crypto.randomUUID(),
        program_id: program.id,
        name: c.name,
        label: c.label,
        purpose: c.purpose,
        framing: c.framing,
        active: c.active,
        focal_length: null,
        lens_notes: null,
        notes: null,
        position: null,
        role: null,
        shot_type: null,
        shot_types: [],
        sort_order: 0,
        type: null,
        target: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        legacy_id: null
      }));

      const { error: camerasError } = await this.supabase
        .from('cameras')
        .insert(camerasData);

      if (camerasError) throw camerasError;
    }

    return program;
  }

  async deleteProgram(id: string): Promise<boolean> {
    const { error } = await this.supabase.from('programs').delete().eq('id', id);
    if (error) throw error;
    return true;
  }

  async getGuests(filters?: {
    search?: string;
    type?: ParticipantType;
    group_type?: GroupType;
    role?: string;
    entity_type?: EntityType;
    company?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: Guest[]; count: number }> {
    let query = this.supabase
      .from('participants')
      .select(`
        id,
        legacy_id,
        program_id,
        name,
        type,
        group_type,
        role,
        company,
        company_or_group,
        bio,
        contacts,
        notes,
        links,
        members,
        entity_type,
        social_handles,
        previous_episodes,
        created_at,
        updated_at
      `, { count: 'exact' });

    if (filters?.search) {
      const searchTerm = `%${filters.search}%`;
      query = query.or(`name.ilike.${searchTerm},company.ilike.${searchTerm}`);
    }

    if (filters?.type) {
      query = query.eq('type', filters.type);
    }

    if (filters?.group_type) {
      query = query.eq('group_type', filters.group_type);
    }

    if (filters?.role) {
      query = query.eq('role', filters.role);
    }

    if (filters?.entity_type) {
      query = query.eq('entity_type', filters.entity_type);
    }

    if (filters?.company) {
      const companyTerm = `%${filters.company}%`;
      query = query.ilike('company', companyTerm);
    }

    if (filters?.offset !== undefined) {
      const limit = filters.limit ?? 100;
      query = query.range(filters.offset, filters.offset + limit - 1);
    } else if (filters?.limit !== undefined) {
      query = query.limit(filters.limit);
    }

    const { data: participants, error, count } = await query;

    if (error) throw error;

    const guests: Guest[] = participants.map(p => ({
      id: p.id,
      legacy_id: p.legacy_id ?? null,
      program_id: p.program_id ?? null,
      name: p.name,
      type: p.type as ParticipantType,
      group_type: p.group_type as GroupType | null,
      role: p.role ?? '',
      company: p.company ?? '',
      company_or_group: p.company_or_group ?? null,
      bio: p.bio ?? '',
      contacts: p.contacts ?? '',
      notes: p.notes ?? '',
      links: Array.isArray(p.links) ? p.links : [],
      members: Array.isArray(p.members) ? p.members : [],
      entity_type: p.entity_type as EntityType,
      social_handles: typeof p.social_handles === 'object' && !Array.isArray(p.social_handles) ? p.social_handles : {},
      previous_episodes: Array.isArray(p.previous_episodes) ? p.previous_episodes : [],
      previous_research_summary: null,
      created_at: p.created_at,
      updated_at: p.updated_at
    }));

    return {
      data: guests,
      count: count ?? 0
    };
  }

  async getGuest(id: string): Promise<Guest | undefined> {
    const { data: participants, error } = await this.supabase
      .from('participants')
      .select(`
        id,
        legacy_id,
        program_id,
        name,
        type,
        group_type,
        role,
        company,
        company_or_group,
        bio,
        contacts,
        notes,
        links,
        members,
        entity_type,
        social_handles,
        previous_episodes,
        created_at,
        updated_at
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!participants) return undefined;

    const p = participants;
    return {
      id: p.id,
      legacy_id: p.legacy_id ?? null,
      program_id: p.program_id ?? null,
      name: p.name,
      type: p.type as ParticipantType,
      group_type: p.group_type as GroupType | null,
      role: p.role ?? '',
      company: p.company ?? '',
      company_or_group: p.company_or_group ?? null,
      bio: p.bio ?? '',
      contacts: p.contacts ?? '',
      notes: p.notes ?? '',
      links: Array.isArray(p.links) ? p.links : [],
      members: Array.isArray(p.members) ? p.members : [],
      entity_type: p.entity_type as EntityType,
      social_handles: typeof p.social_handles === 'object' && !Array.isArray(p.social_handles) ? p.social_handles : {},
      previous_episodes: Array.isArray(p.previous_episodes) ? p.previous_episodes : [],
      previous_research_summary: null,
      created_at: p.created_at,
      updated_at: p.updated_at
    };
  }

  async saveGuest(guest: Guest): Promise<Guest> {
    const participantData = {
      id: guest.id,
      legacy_id: guest.legacy_id,
      program_id: guest.program_id,
      name: guest.name,
      type: guest.type,
      group_type: guest.group_type,
      role: guest.role,
      company: guest.company,
      company_or_group: guest.company_or_group,
      bio: guest.bio,
      contacts: guest.contacts,
      notes: guest.notes,
      links: guest.links,
      members: guest.members,
      entity_type: guest.entity_type,
      social_handles: guest.social_handles,
      previous_episodes: guest.previous_episodes,
      created_at: guest.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error: upsertError } = await this.supabase
      .from('participants')
      .upsert(participantData, { onConflict: 'id' });

    if (upsertError) throw upsertError;

    await this.supabase
      .from('episode_participants')
      .delete()
      .eq('participant_id', guest.id);

    return guest;
  }

  async deleteGuest(id: string): Promise<boolean> {
    const { error } = await this.supabase.from('participants').delete().eq('id', id);
    if (error) throw error;
    await this.supabase
      .from('episode_participants')
      .delete()
      .eq('participant_id', id);
    return true;
  }

  async getEpisodes(filters?: {
    search?: string;
    program_id?: string;
    status?: EpisodeStatus;
    season_id?: string;
    limit?: number;
    offset?: number;
    order_by?: string;
    ascending?: boolean;
  }): Promise<{ data: Episode[]; count: number }> {
    let query = this.supabase
      .from('episodes')
      .select(`
        id,
        legacy_id,
        program_id,
        episode_number,
        title,
        idea,
        topic,
        synopsis,
        format,
        target_duration_min,
        target_duration_minutes,
        presenter_name,
        host,
        tone,
        objective,
        additional_info,
        status,
        diagnosis,
        research,
        technical_checklist,
        editorial_notes_for_post,
        editor_script_synthesis,
        recording_time_elapsed,
        scheduled_date,
        production_status,
        version,
        season_id,
        created_at,
        updated_at,
        checklist,
        episode_participants (
          participants (
            name,
            id
          )
        )
      `);

    if (filters?.search) {
      const searchTerm = `%${filters.search}%`;
      query = query.or(`title.ilike.${searchTerm},idea.ilike.${searchTerm},topic.ilike.${searchTerm},synopsis.ilike.${searchTerm}`);
    }

    if (filters?.program_id) {
      query = query.eq('program_id', filters.program_id);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.season_id) {
      query = query.eq('season_id', filters.season_id);
    }

    const orderBy = filters?.order_by ?? 'created_at';
    const ascending = filters?.ascending ?? false;
    query = query.order(orderBy, { ascending: ascending });

    if (filters?.offset !== undefined) {
      const limit = filters.limit ?? 100;
      query = query.range(filters.offset, filters.offset + limit - 1);
    } else if (filters?.limit !== undefined) {
      query = query.limit(filters.limit);
    }

    const { data: result, error, count } = await query;

    if (error) throw error;

    const episodeMap = new Map<string, Episode>();
    for (const row of result) {
      const epId = row.id;
      if (!episodeMap.has(epId)) {
        const { episode_participants, ...episodeWithoutParticipants } = row;
        episodeMap.set(epId, episodeWithoutParticipants as Episode);
      }
    }
    const episodes = Array.from(episodeMap.values());

    return {
      data: episodes,
      count: count ?? 0
    };
  }

  async getEpisode(id: string): Promise<Episode | undefined> {
    const { data: rawData, error } = await this.supabase
      .from('episodes')
      .select(`
        id,
        legacy_id,
        program_id,
        episode_number,
        title,
        idea,
        topic,
        synopsis,
        format,
        target_duration_min,
        target_duration_minutes,
        presenter_name,
        host,
        tone,
        objective,
        additional_info,
        status,
        diagnosis,
        research,
        technical_checklist,
        editorial_notes_for_post,
        editor_script_synthesis,
        recording_time_elapsed,
        scheduled_date,
        production_status,
        version,
        season_id,
        created_at,
        updated_at,
        checklist,
        guest_name,
        guest_id,
        segments (
          id,
          legacy_id,
          episode_id,
          order_pos,
          block_number,
          title,
          type,
          estimated_duration_min,
          estimated_duration_minutes,
          description,
          key_themes,
          suggested_camera_id,
          primary_camera,
          transition_text,
          b_roll_notes,
          notes,
          created_at,
          updated_at,
          planned_start_sec,
          actual_start_sec,
          actual_duration_min,
          status
        ),
        questions (
          id,
          legacy_id,
          episode_id,
          segment_id,
          participant_id,
          target_participant_name,
          order_pos,
          speaker,
          text,
          objective,
          suggested_camera,
          recommended_camera,
          eye_direction,
          status,
          block_id,
          created_at,
          updated_at,
          question_follow_ups (
            id,
            legacy_id,
            question_id,
            order_pos,
            trigger_condition,
            condition,
            action_or_question,
            action,
            camera_cue,
            target_participant,
            tag,
            created_at,
            updated_at
          )
        ),
        script_items (
          id,
          legacy_id,
          episode_id,
          segment_id,
          question_id,
          order_pos,
          timestamp,
          type,
          camera,
          camera_instruction,
          alternative_camera,
          speaker,
          target_person,
          eye_direction,
          shot_type,
          content,
          directional_markers,
          is_teleprompter,
          estimated_duration_seconds,
          notes,
          transition,
          block_id,
          created_at,
          updated_at
        ),
        production_assets (
          id,
          legacy_id,
          episode_id,
          segment_id,
          type,
          title,
          description,
          content,
          display_time,
          moment,
          status,
          file_url,
          notes,
          block_id,
          created_at,
          updated_at
        ),
        planned_shorts (
          id,
          legacy_id,
          episode_id,
          segment_id,
          title,
          hook,
          suggested_hook,
          narrative_arc,
          generating_question,
          estimated_duration,
          expected_duration_seconds,
          camera_focus,
          b_roll_notes,
          target_platform,
          status,
          notes,
          created_at,
          updated_at
        ),
        recording_markers (
          id,
          legacy_id,
          episode_id,
          timestamp_sec,
          formatted_time,
          type,
          block_title,
          reference_text,
          comment,
          created_at,
          updated_at
        ),
        episode_versions (
          id,
          episode_id,
          version,
          snapshot,
          changed_by,
          change_summary,
          created_at
        ),
        technical_checklist,
        checklist,
        diagnosis,
        research,
        technical_checklist,
        editorial_notes_for_post,
        editor_script_synthesis,
        recording_time_elapsed,
        scheduled_date,
        production_status,
        version,
        season_id,
        created_at,
        updated_at,
        checklist,
        guest_name,
        guest_id,
        episode_participants (
          participants (
            name,
            id
          )
        )
      `)
      .eq('id', id);

    if (error) throw error;
    if (!rawData || rawData.length === 0) return undefined;

    const data = rawData as any[];
    const row = data[0];
    const { episode_participants, ...episodeWithoutParticipants } = row;

    const episode = episodeWithoutParticipants as Episode;

    if (row.segments) {
      episode.segments = row.segments.map((s: any) => ({
        id: s.id,
        legacy_id: s.legacy_id,
        episode_id: s.episode_id,
        order_pos: s.order_pos,
        block_number: s.block_number,
        title: s.title,
        type: s.type,
        estimated_duration_min: s.estimated_duration_min,
        estimated_duration_minutes: s.estimated_duration_minutes,
        description: s.description,
        key_themes: s.key_themes,
        suggested_camera_id: s.suggested_camera_id,
        primary_camera: s.primary_camera,
        transition_text: s.transition_text,
        b_roll_notes: s.b_roll_notes,
        notes: s.notes,
        created_at: s.created_at,
        updated_at: s.updated_at,
        planned_start_sec: s.planned_start_sec,
        actual_start_sec: s.actual_start_sec,
        actual_duration_min: s.actual_duration_min,
        status: s.status
      }));
    }
    if (row.questions) {
      episode.questions = row.questions.map((q: any) => ({
        id: q.id,
        legacy_id: q.legacy_id,
        episode_id: q.episode_id,
        segment_id: q.segment_id,
        participant_id: q.participant_id,
        target_participant_name: q.target_participant_name,
        order_pos: q.order_pos,
        speaker: q.speaker,
        text: q.text,
        objective: q.objective,
        suggested_camera: q.suggested_camera,
        recommended_camera: q.recommended_camera,
        eye_direction: q.eye_direction,
        status: q.status,
        block_id: q.block_id,
        created_at: q.created_at,
        updated_at: q.updated_at,
        followUps: q.question_follow_ups?.map((fu: any) => ({
          id: fu.id,
          legacy_id: fu.legacy_id,
          question_id: fu.question_id,
          order_pos: fu.order_pos,
          triggerCondition: fu.trigger_condition,
          trigger_condition: fu.trigger_condition,
          condition: fu.condition,
          actionOrQuestion: fu.action_or_question,
          action_or_question: fu.action_or_question,
          action: fu.action,
          cameraCue: fu.camera_cue,
          camera_cue: fu.camera_cue,
          targetParticipant: fu.target_participant,
          target_participant: fu.target_participant,
          tag: fu.tag,
          created_at: fu.created_at,
          updated_at: fu.updated_at
        })) ?? []
      }));
    }
    if (row.script_items) {
      episode.script_items = row.script_items.map((si: any) => ({
        id: si.id,
        legacy_id: si.legacy_id,
        episode_id: si.episode_id,
        segment_id: si.segment_id,
        question_id: si.question_id,
        order_pos: si.order_pos,
        timestamp: si.timestamp,
        type: si.type,
        camera: si.camera,
        camera_instruction: si.camera_instruction,
        alternative_camera: si.alternative_camera,
        speaker: si.speaker,
        target_person: si.target_person,
        eye_direction: si.eye_direction,
        shot_type: si.shot_type,
        content: si.content,
        directional_markers: si.directional_markers,
        is_teleprompter: si.is_teleprompter,
        estimated_duration_seconds: si.estimated_duration_seconds,
        notes: si.notes,
        transition: si.transition,
        block_id: si.block_id,
        created_at: si.created_at,
        updated_at: si.updated_at
      }));
    }
    if (row.production_assets) {
      episode.assets = row.production_assets.map((a: any) => ({
        id: a.id,
        legacy_id: a.legacy_id,
        episode_id: a.episode_id,
        segment_id: a.segment_id,
        type: a.type,
        title: a.title,
        description: a.description,
        content: a.content,
        display_time: a.display_time,
        moment: a.moment,
        status: a.status,
        file_url: a.file_url,
        notes: a.notes,
        block_id: a.block_id,
        created_at: a.created_at,
        updated_at: a.updated_at
      }));
    }
    if (row.planned_shorts) {
      episode.shorts = row.planned_shorts.map((s: any) => ({
        id: s.id,
        legacy_id: s.legacy_id,
        episode_id: s.episode_id,
        segment_id: s.segment_id,
        title: s.title,
        hook: s.hook,
        suggested_hook: s.suggested_hook,
        narrative_arc: s.narrative_arc,
        generating_question: s.generating_question,
        estimated_duration: s.estimated_duration,
        expected_duration_seconds: s.expected_duration_seconds,
        camera_focus: s.camera_focus,
        b_roll_notes: s.b_roll_notes,
        target_platform: s.target_platform,
        status: s.status,
        notes: s.notes,
        created_at: s.created_at,
        updated_at: s.updated_at
      }));
    }
    if (row.recording_markers) {
      episode.recordingMarkers = row.recording_markers.map((m: any) => ({
        id: m.id,
        legacy_id: m.legacy_id,
        episode_id: m.episode_id,
        timestamp_sec: m.timestamp_sec,
        formatted_time: m.formatted_time,
        type: m.type,
        block_title: m.block_title,
        reference_text: m.reference_text,
        comment: m.comment,
        created_at: m.created_at,
        updated_at: m.updated_at
      }));
    }
    if (row.episode_versions) {
      episode.versions = row.episode_versions.map((v: any) => ({
        id: v.id,
        versionNumber: v.version,
        name: `Version ${v.version}`,
        savedAt: v.created_at,
        description: v.change_summary ?? '',
        snapshot: v.snapshot
      }));
    }

    return episode as Episode;
  }

  private async insertRelatedTables(episodeId: string, episodeData: Partial<Episode>, now: string): Promise<void> {
    if (episodeData.segments && episodeData.segments.length > 0) {
      const segmentsData = episodeData.segments.map((s, idx) => ({
        id: s.id && !s.id.startsWith('temp-') ? s.id : crypto.randomUUID(),
        legacy_id: s.legacy_id ?? null,
        episode_id: episodeId,
        order_pos: s.order_pos ?? idx + 1,
        block_number: s.block_number ?? idx + 1,
        title: s.title,
        type: s.type,
        estimated_duration_min: s.estimated_duration_min,
        estimated_duration_minutes: s.estimated_duration_minutes,
        description: s.description,
        key_themes: s.key_themes,
        suggested_camera_id: s.suggested_camera_id,
        primary_camera: s.primary_camera,
        transition_text: s.transition_text,
        b_roll_notes: s.b_roll_notes,
        notes: s.notes,
        created_at: now,
        updated_at: now,
        planned_start_sec: s.planned_start_sec,
        actual_start_sec: s.actual_start_sec,
        actual_duration_min: s.actual_duration_min,
        status: s.status ?? 'planned'
      }));
      const { error } = await this.supabase.from('segments').insert(segmentsData);
      if (error) throw error;
    }

    if (episodeData.questions && episodeData.questions.length > 0) {
      const questionsData = episodeData.questions.map((q, idx) => ({
        id: q.id && !q.id.startsWith('temp-') ? q.id : crypto.randomUUID(),
        legacy_id: q.legacy_id ?? null,
        episode_id: episodeId,
        segment_id: q.segment_id,
        participant_id: q.participant_id,
        target_participant_name: q.target_participant_name,
        order_pos: q.order_pos ?? idx + 1,
        speaker: q.speaker,
        text: q.text,
        objective: q.objective,
        suggested_camera: q.suggested_camera,
        recommended_camera: q.recommended_camera,
        eye_direction: q.eye_direction,
        status: q.status ?? 'pending',
        block_id: q.block_id,
        created_at: now,
        updated_at: now,
      }));
      const { error } = await this.supabase.from('questions').insert(questionsData);
      if (error) throw error;
    }

    if (episodeData.questions) {
      for (const q of episodeData.questions) {
        if (q.followUps && q.followUps.length > 0) {
          const followUpsData = q.followUps.map((fu, idx) => ({
            id: fu.id && !fu.id.startsWith('temp-') ? fu.id : crypto.randomUUID(),
            legacy_id: fu.legacy_id ?? null,
            question_id: fu.question_id ?? q.id,
            order_pos: fu.order_pos ?? idx + 1,
            trigger_condition: fu.trigger_condition,
            condition: fu.condition,
            action_or_question: fu.action_or_question,
            action: fu.action,
            camera_cue: fu.camera_cue,
            target_participant: fu.target_participant,
            tag: fu.tag,
            created_at: now,
            updated_at: now,
          }));
          const { error } = await this.supabase.from('question_follow_ups').insert(followUpsData);
          if (error) throw error;
        }
      }
    }

    if (episodeData.script_items && episodeData.script_items.length > 0) {
      const scriptItemsData = episodeData.script_items.map((si, idx) => ({
        id: si.id && !si.id.startsWith('temp-') ? si.id : crypto.randomUUID(),
        legacy_id: si.legacy_id ?? null,
        episode_id: episodeId,
        segment_id: si.segment_id,
        question_id: si.question_id,
        order_pos: si.order_pos ?? idx + 1,
        timestamp: si.timestamp,
        type: si.type,
        camera: si.camera,
        camera_instruction: si.camera_instruction,
        alternative_camera: si.alternative_camera,
        speaker: si.speaker,
        target_person: si.target_person,
        eye_direction: si.eye_direction,
        shot_type: si.shot_type,
        content: si.content,
        directional_markers: si.directional_markers ?? [],
        is_teleprompter: si.is_teleprompter,
        estimated_duration_seconds: si.estimated_duration_seconds,
        notes: si.notes,
        transition: si.transition,
        block_id: si.block_id,
        created_at: now,
        updated_at: now,
      }));
      const { error } = await this.supabase.from('script_items').insert(scriptItemsData);
      if (error) throw error;
    }

    if (episodeData.assets && episodeData.assets.length > 0) {
      const assetsData = episodeData.assets.map((a, idx) => ({
        id: a.id && !a.id.startsWith('temp-') ? a.id : crypto.randomUUID(),
        legacy_id: a.legacy_id ?? null,
        episode_id: episodeId,
        segment_id: a.segment_id,
        type: a.type,
        title: a.title,
        description: a.description,
        content: a.content,
        display_time: a.display_time,
        moment: a.moment,
        status: a.status ?? 'pending',
        file_url: a.file_url,
        notes: a.notes,
        block_id: a.block_id,
        created_at: now,
        updated_at: now,
      }));
      const { error } = await this.supabase.from('production_assets').insert(assetsData);
      if (error) throw error;
    }

    if (episodeData.shorts && episodeData.shorts.length > 0) {
      const shortsData = episodeData.shorts.map((s, idx) => ({
        id: s.id && !s.id.startsWith('temp-') ? s.id : crypto.randomUUID(),
        legacy_id: s.legacy_id ?? null,
        episode_id: episodeId,
        segment_id: s.segment_id,
        title: s.title,
        hook: s.hook,
        suggested_hook: s.suggested_hook,
        narrative_arc: s.narrative_arc,
        generating_question: s.generating_question,
        estimated_duration: s.estimated_duration,
        expected_duration_seconds: s.expected_duration_seconds,
        camera_focus: s.camera_focus,
        b_roll_notes: s.b_roll_notes,
        target_platform: s.target_platform,
        status: s.status ?? 'planned',
        notes: s.notes,
        created_at: now,
        updated_at: now,
      }));
      const { error } = await this.supabase.from('planned_shorts').insert(shortsData);
      if (error) throw error;
    }

    if (episodeData.recordingMarkers && episodeData.recordingMarkers.length > 0) {
      const markersData = episodeData.recordingMarkers.map((m, idx) => ({
        id: m.id && !m.id.startsWith('temp-') ? m.id : crypto.randomUUID(),
        legacy_id: m.legacy_id ?? null,
        episode_id: episodeId,
        timestamp_sec: m.timestamp_sec,
        formatted_time: m.formatted_time,
        type: m.type,
        block_title: m.block_title,
        reference_text: m.reference_text,
        comment: m.comment,
        created_at: now,
        updated_at: now,
      }));
      const { error } = await this.supabase.from('recording_markers').insert(markersData);
      if (error) throw error;
    }

    if (episodeData.versions && episodeData.versions.length > 0) {
      const versionsData = episodeData.versions.map((v, idx) => ({
        id: v.id && !v.id.startsWith('temp-') ? v.id : crypto.randomUUID(),
        episode_id: episodeId,
        version: v.version ?? idx + 1,
        snapshot: v.snapshot,
        changed_by: v.changed_by,
        change_summary: v.change_summary,
        created_at: v.created_at ?? now,
      }));
      const { error } = await this.supabase.from('episode_versions').insert(versionsData);
      if (error) throw error;
    }
  }

  private async updateRelatedTables(episodeId: string, episodeData: Partial<Episode>, now: string): Promise<void> {
    if (episodeData.segments && episodeData.segments.length > 0) {
      const segmentsData = episodeData.segments.map((s, idx) => ({
        id: s.id && !s.id.startsWith('temp-') ? s.id : crypto.randomUUID(),
        legacy_id: s.legacy_id ?? null,
        episode_id: episodeId,
        order_pos: s.order_pos ?? idx + 1,
        block_number: s.block_number ?? idx + 1,
        title: s.title,
        type: s.type,
        estimated_duration_min: s.estimated_duration_min,
        estimated_duration_minutes: s.estimated_duration_minutes,
        description: s.description,
        key_themes: s.key_themes,
        suggested_camera_id: s.suggested_camera_id,
        primary_camera: s.primary_camera,
        transition_text: s.transition_text,
        b_roll_notes: s.b_roll_notes,
        notes: s.notes,
        updated_at: now,
        planned_start_sec: s.planned_start_sec,
        actual_start_sec: s.actual_start_sec,
        actual_duration_min: s.actual_duration_min,
        status: s.status ?? 'planned'
      }));
      await this.supabase.from('segments').upsert(segmentsData, { onConflict: 'id' });
    }

    if (episodeData.questions && episodeData.questions.length > 0) {
      const questionsData = episodeData.questions.map((q, idx) => ({
        id: q.id && !q.id.startsWith('temp-') ? q.id : crypto.randomUUID(),
        legacy_id: q.legacy_id ?? null,
        episode_id: episodeId,
        segment_id: q.segment_id,
        participant_id: q.participant_id,
        target_participant_name: q.target_participant_name,
        order_pos: q.order_pos ?? idx + 1,
        speaker: q.speaker,
        text: q.text,
        objective: q.objective,
        suggested_camera: q.suggested_camera,
        recommended_camera: q.recommended_camera,
        eye_direction: q.eye_direction,
        status: q.status ?? 'pending',
        block_id: q.block_id,
        updated_at: now
      }));
      await this.supabase.from('questions').upsert(questionsData, { onConflict: 'id' });
    }

    if (episodeData.questions) {
      for (const q of episodeData.questions) {
        if (q.followUps && q.followUps.length > 0) {
          const followUpsData = q.followUps.map((fu, idx) => ({
            id: fu.id && !fu.id.startsWith('temp-') ? fu.id : crypto.randomUUID(),
            legacy_id: fu.legacy_id ?? null,
            question_id: fu.question_id ?? q.id,
            order_pos: fu.order_pos ?? idx + 1,
            trigger_condition: fu.trigger_condition,
            condition: fu.condition,
            action_or_question: fu.action_or_question,
            action: fu.action,
            camera_cue: fu.camera_cue,
            target_participant: fu.target_participant,
            tag: fu.tag,
            updated_at: now
          }));
          await this.supabase.from('question_follow_ups').upsert(followUpsData, { onConflict: 'id' });
        }
      }
    }

    if (episodeData.script_items && episodeData.script_items.length > 0) {
      const scriptItemsData = episodeData.script_items.map((si, idx) => ({
        id: si.id && !si.id.startsWith('temp-') ? si.id : crypto.randomUUID(),
        legacy_id: si.legacy_id ?? null,
        episode_id: episodeId,
        segment_id: si.segment_id,
        question_id: si.question_id,
        order_pos: si.order_pos ?? idx + 1,
        timestamp: si.timestamp,
        type: si.type,
        camera: si.camera,
        camera_instruction: si.camera_instruction,
        alternative_camera: si.alternative_camera,
        speaker: si.speaker,
        target_person: si.target_person,
        eye_direction: si.eye_direction,
        shot_type: si.shot_type,
        content: si.content,
        directional_markers: si.directional_markers ?? [],
        is_teleprompter: si.is_teleprompter,
        estimated_duration_seconds: si.estimated_duration_seconds,
        notes: si.notes,
        transition: si.transition,
        block_id: si.block_id,
        updated_at: now
      }));
      await this.supabase.from('script_items').upsert(scriptItemsData, { onConflict: 'id' });
    }

    if (episodeData.assets && episodeData.assets.length > 0) {
      const assetsData = episodeData.assets.map((a, idx) => ({
        id: a.id && !a.id.startsWith('temp-') ? a.id : crypto.randomUUID(),
        legacy_id: a.legacy_id ?? null,
        episode_id: episodeId,
        segment_id: a.segment_id,
        type: a.type,
        title: a.title,
        description: a.description,
        content: a.content,
        display_time: a.display_time,
        moment: a.moment,
        status: a.status ?? 'pending',
        file_url: a.file_url,
        notes: a.notes,
        block_id: a.block_id,
        updated_at: now
      }));
      await this.supabase.from('production_assets').upsert(assetsData, { onConflict: 'id' });
    }

    if (episodeData.shorts && episodeData.shorts.length > 0) {
      const shortsData = episodeData.shorts.map((s, idx) => ({
        id: s.id && !s.id.startsWith('temp-') ? s.id : crypto.randomUUID(),
        legacy_id: s.legacy_id ?? null,
        episode_id: episodeId,
        segment_id: s.segment_id,
        title: s.title,
        hook: s.hook,
        suggested_hook: s.suggested_hook,
        narrative_arc: s.narrative_arc,
        generating_question: s.generating_question,
        estimated_duration: s.estimated_duration,
        expected_duration_seconds: s.expected_duration_seconds,
        camera_focus: s.camera_focus,
        b_roll_notes: s.b_roll_notes,
        target_platform: s.target_platform,
        status: s.status ?? 'planned',
        notes: s.notes,
        updated_at: now
      }));
      await this.supabase.from('planned_shorts').upsert(shortsData, { onConflict: 'id' });
    }

    if (episodeData.recordingMarkers && episodeData.recordingMarkers.length > 0) {
      const markersData = episodeData.recordingMarkers.map((m, idx) => ({
        id: m.id && !m.id.startsWith('temp-') ? m.id : crypto.randomUUID(),
        legacy_id: m.legacy_id ?? null,
        episode_id: episodeId,
        timestamp_sec: m.timestamp_sec,
        formatted_time: m.formatted_time,
        type: m.type,
        block_title: m.block_title,
        reference_text: m.reference_text,
        comment: m.comment,
        updated_at: now
      }));
      await this.supabase.from('recording_markers').upsert(markersData, { onConflict: 'id' });
    }

    if (episodeData.versions && episodeData.versions.length > 0) {
      const versionsData = episodeData.versions.map((v, idx) => ({
        id: v.id && !v.id.startsWith('temp-') ? v.id : crypto.randomUUID(),
        episode_id: episodeId,
        version: v.version ?? idx + 1,
        snapshot: v.snapshot,
        changed_by: v.changed_by,
        change_summary: v.change_summary,
        created_at: v.created_at ?? now
      }));
      await this.supabase.from('episode_versions').upsert(versionsData, { onConflict: 'id' });
    }
  }

  private async deleteRelatedTables(episodeId: string): Promise<void> {
    const { data: segments } = await this.supabase.from('segments').select('id').eq('episode_id', episodeId);
    const segmentIds = segments?.map(s => s.id) ?? [];

    const { data: questions } = await this.supabase.from('questions').select('id').eq('episode_id', episodeId);
    const questionIds = questions?.map(q => q.id) ?? [];

    if (questionIds.length > 0) {
      await this.supabase.from('question_follow_ups').delete().in('question_id', questionIds);
    }

    if (segmentIds.length > 0) {
      await this.supabase.from('segments').delete().in('id', segmentIds);
    }

    if (questionIds.length > 0) {
      await this.supabase.from('questions').delete().in('id', questionIds);
    }

    await this.supabase.from('script_items').delete().eq('episode_id', episodeId);
    await this.supabase.from('production_assets').delete().eq('episode_id', episodeId);
    await this.supabase.from('planned_shorts').delete().eq('episode_id', episodeId);
    await this.supabase.from('recording_markers').delete().eq('episode_id', episodeId);
    await this.supabase.from('episode_versions').delete().eq('episode_id', episodeId);
  }

  async createEpisode(episodeData: Omit<Episode, 'id' | 'created_at' | 'updated_at'>): Promise<Episode> {
    const id = (episodeData as any).id || crypto.randomUUID();
    const now = new Date().toISOString();

    const episodeToInsert = {
      id,
      legacy_id: episodeData.legacy_id ?? null,
      program_id: episodeData.program_id,
      episode_number: episodeData.episode_number,
      title: episodeData.title,
      idea: episodeData.idea,
      topic: episodeData.topic,
      synopsis: episodeData.synopsis,
      format: episodeData.format,
      target_duration_min: episodeData.target_duration_min,
      target_duration_minutes: episodeData.target_duration_minutes,
      presenter_name: episodeData.presenter_name,
      host: episodeData.host,
      tone: episodeData.tone,
      objective: episodeData.objective,
      additional_info: episodeData.additional_info,
      status: episodeData.status,
      diagnosis: episodeData.diagnosis,
      research: episodeData.research,
      technical_checklist: episodeData.technical_checklist,
      editorial_notes_for_post: episodeData.editorial_notes_for_post,
      editor_script_synthesis: episodeData.editor_script_synthesis,
      recording_time_elapsed: episodeData.recording_time_elapsed,
      scheduled_date: episodeData.scheduled_date,
      production_status: episodeData.production_status,
      version: episodeData.version,
      season_id: episodeData.season_id,
      created_at: now,
      updated_at: now,
      checklist: episodeData.checklist ?? []
    };

    const { error } = await this.supabase
      .from('episodes')
      .insert(episodeToInsert);

    if (error) throw error;

    if (episodeData.guest_name || episodeData.guest_id) {
      let participantId = null;
      if (episodeData.guest_id) {
        const { data: participant, error } = await this.supabase
          .from('participants')
          .select('id')
          .eq('id', episodeData.guest_id)
          .single();
        if (!error && participant) {
          participantId = participant.id;
        }
      }
      if (!participantId && episodeData.guest_name) {
        const { data: participants, error } = await this.supabase
          .from('participants')
          .select('id')
          .ilike('name', episodeData.guest_name)
          .limit(1);
        if (!error && participants.length > 0) {
          participantId = participants[0].id;
        }
      }
      if (!participantId) {
        const newParticipant = {
          name: episodeData.guest_name ?? '',
          role: '',
          company: '',
          bio: '',
          contacts: '',
          links: [],
          notes: '',
          created_at: now,
          updated_at: now
        };
        const { data: insertedParticipant, error } = await this.supabase
          .from('participants')
          .insert(newParticipant)
          .select()
          .single();
        if (error) throw error;
        if (!insertedParticipant) throw new Error('Failed to create participant');
        participantId = insertedParticipant.id;
      }
      const linkData = {
        episode_id: id,
        participant_id: participantId,
        name: episodeData.guest_name ?? '',
        type: episodeData.format ?? 'guest',
        role: 'convidado',
        created_at: now,
        updated_at: now
      };
      const { error: linkError } = await this.supabase
        .from('episode_participants')
        .insert(linkData);
      if (linkError) throw linkError;
    }

    await this.insertRelatedTables(id, episodeData, now);

    return {
      id,
      legacy_id: episodeData.legacy_id ?? null,
      program_id: episodeData.program_id,
      episode_number: episodeData.episode_number,
      title: episodeData.title,
      idea: episodeData.idea,
      topic: episodeData.topic,
      synopsis: episodeData.synopsis,
      format: episodeData.format as ShowFormat,
      target_duration_min: episodeData.target_duration_min,
      target_duration_minutes: episodeData.target_duration_minutes,
      presenter_name: episodeData.presenter_name,
      host: episodeData.host,
      tone: episodeData.tone,
      objective: episodeData.objective ?? null,
      additional_info: episodeData.additional_info ?? null,
      status: episodeData.status as EpisodeStatus,
      diagnosis: episodeData.diagnosis,
      research: episodeData.research,
      technical_checklist: episodeData.technical_checklist,
      editorial_notes_for_post: episodeData.editorial_notes_for_post ?? null,
      editor_script_synthesis: episodeData.editor_script_synthesis ?? null,
      recording_time_elapsed: episodeData.recording_time_elapsed ?? null,
      scheduled_date: episodeData.scheduled_date ?? null,
      production_status: episodeData.production_status,
      version: episodeData.version,
      season_id: episodeData.season_id ?? null,
      created_at: now,
      updated_at: now,
      checklist: episodeData.checklist ?? []
    };
  }

  async updateEpisode(id: string, episodeData: Partial<Episode>): Promise<Episode> {
    const existing = await this.getEpisode(id);
    if (!existing) {
      throw new Error(`Episode with id ${id} not found`);
    }

    const now = new Date().toISOString();

    // Only include fields that exist in the episodes table
    const allowedFields = [
      'legacy_id',
      'program_id',
      'episode_number',
      'title',
      'idea',
      'topic',
      'synopsis',
      'format',
      'target_duration_min',
      'target_duration_minutes',
      'presenter_name',
      'host',
      'tone',
      'objective',
      'additional_info',
      'status',
      'diagnosis',
      'research',
      'technical_checklist',
      'editorial_notes_for_post',
      'editor_script_synthesis',
      'recording_time_elapsed',
      'scheduled_date',
      'production_status',
      'version',
      'season_id',
      'checklist',
      'updated_at'
    ] as const;

    const updateData: Record<string, any> = { updated_at: now };
    for (const field of allowedFields) {
      if (field !== 'updated_at' && episodeData[field as keyof Episode] !== undefined) {
        updateData[field] = episodeData[field as keyof Episode];
      }
    }

    const { error } = await this.supabase
      .from('episodes')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;

    if (episodeData.guest_name !== undefined || episodeData.guest_id !== undefined) {
      let participantId = null;
      if (episodeData.guest_id !== undefined) {
        const { data: participant, error } = await this.supabase
          .from('participants')
          .select('id')
          .eq('id', episodeData.guest_id)
          .single();
        if (!error && participant) {
          participantId = participant.id;
        }
      }
      if (!participantId && episodeData.guest_name !== undefined) {
        const { data: participants, error } = await this.supabase
          .from('participants')
          .select('id')
          .ilike('name', episodeData.guest_name!)
          .limit(1);
        if (!error && participants.length > 0) {
          participantId = participants[0].id;
        }
      }
      if (!participantId) {
        const newParticipant = {
          name: episodeData.guest_name ?? '',
          role: '',
          company: '',
          bio: '',
          contacts: '',
          links: [],
          notes: '',
          created_at: now,
          updated_at: now
        };
        const { data: insertedParticipant, error } = await this.supabase
          .from('participants')
          .insert(newParticipant)
          .select()
          .single();
        if (error) throw error;
        if (!insertedParticipant) throw new Error('Failed to create participant');
        participantId = insertedParticipant.id;
      }
      const { data: existingLink, error: linkCheckError } = await this.supabase
        .from('episode_participants')
        .select('id')
        .eq('episode_id', id)
        .eq('participant_id', participantId)
        .single();
      if (linkCheckError || !existingLink) {
        const linkData = {
          episode_id: id,
          participant_id: participantId,
          name: episodeData.guest_name ?? '',
          type: episodeData.format ?? 'guest',
          role: 'convidado',
          created_at: now,
          updated_at: now
        };
        const { error: linkError } = await this.supabase
          .from('episode_participants')
          .insert(linkData);
        if (linkError) throw linkError;
      }
    }

    await this.updateRelatedTables(id, episodeData, now);

    const updatedEpisode = await this.getEpisode(id);
    if (!updatedEpisode) {
      throw new Error(`Episode with id ${id} not found after update`);
    }
    return updatedEpisode;
  }

  async deleteEpisode(id: string): Promise<boolean> {
    await this.deleteRelatedTables(id);
    const { error } = await this.supabase.from('episodes').delete().eq('id', id);
    if (error) throw error;
    return true;
  }

  async getCatalogStats(): Promise<CatalogStats> {
    const [programsResult, episodesResult, participantsResult, assetsResult, shortsResult, segmentsResult] = await Promise.all([
      this.supabase.from('programs').select('id', { count: 'exact', head: true }),
      this.supabase.from('episodes').select('id, status', { count: 'exact' }),
      this.supabase.from('participants').select('id', { count: 'exact', head: true }),
      this.supabase.from('production_assets').select('id', { count: 'exact', head: true }),
      this.supabase.from('planned_shorts').select('id', { count: 'exact', head: true }),
      this.supabase.from('segments').select('id', { count: 'exact', head: true }),
    ]);

    if (episodesResult.error) throw episodesResult.error;

    const episodesByStatus: Record<string, number> = {};
    episodesResult.data?.forEach((ep: any) => {
      const status = ep.status || 'unknown';
      episodesByStatus[status] = (episodesByStatus[status] || 0) + 1;
    });

    const programsWithEpisodesResult = await this.supabase
      .from('episodes')
      .select('program_id', { count: 'exact' })
      .not('program_id', 'is', null);
    
    const uniqueProgramsWithEpisodes = new Set(programsWithEpisodesResult.data?.map((e: any) => e.program_id) || []).size;

    return {
      totalPrograms: programsResult.count ?? 0,
      totalEpisodes: episodesResult.count ?? 0,
      totalParticipants: participantsResult.count ?? 0,
      totalAssets: assetsResult.count ?? 0,
      totalShorts: shortsResult.count ?? 0,
      totalSegments: segmentsResult.count ?? 0,
      episodesByStatus,
      programsWithEpisodes: uniqueProgramsWithEpisodes,
    };
  }

  async searchCatalog(query: string, limit: number = 10): Promise<SearchCatalogResult> {
    const searchTerm = `%${query}%`;
    
    const [programsResult, episodesResult, participantsResult] = await Promise.all([
      this.supabase
        .from('programs')
        .select(`
          id, name, description, host, format, default_duration_min, default_episode_duration_minutes,
          default_opening, default_closing, default_presenter_name, default_segments,
          editorial_style, scenario, standard_segments, standard_structure, target_audience,
          title, tone, updated_at, created_at, legacy_id, organization_id, catalog_program_id,
          cameras (id, name, label, purpose, framing, active)
        `)
        .or(`title.ilike.${searchTerm},description.ilike.${searchTerm},host.ilike.${searchTerm}`)
        .limit(limit),
      this.supabase
        .from('episodes')
        .select(`
          id, legacy_id, program_id, episode_number, title, idea, topic, synopsis, format,
          target_duration_min, target_duration_minutes, presenter_name, host, tone, objective,
          additional_info, status, diagnosis, research, technical_checklist, editorial_notes_for_post,
          editor_script_synthesis, recording_time_elapsed, scheduled_date, production_status,
          version, season_id, created_at, updated_at, checklist
        `)
        .or(`title.ilike.${searchTerm},idea.ilike.${searchTerm},topic.ilike.${searchTerm},synopsis.ilike.${searchTerm}`)
        .limit(limit),
      this.supabase
        .from('participants')
        .select(`
          id, legacy_id, program_id, name, type, group_type, role, company, company_or_group,
          bio, contacts, notes, links, members, entity_type, social_handles, previous_episodes,
          created_at, updated_at
        `)
        .or(`name.ilike.${searchTerm},company.ilike.${searchTerm},role.ilike.${searchTerm}`)
        .limit(limit),
    ]);

    const programs: Program[] = (programsResult.data ?? []).map(p => ({
      id: p.id,
      title: p.title ?? p.name ?? '',
      description: p.description,
      host: p.host ?? '',
      format: p.format as ShowFormat,
      defaultDurationMin: p.default_duration_min ?? 0,
      defaultEpisodeDurationMinutes: p.default_episode_duration_minutes,
      editorialStyle: p.editorial_style ?? '',
      scenario: p.scenario ?? '',
      cameras: p.cameras?.map((c: any) => ({
        id: c.id, name: c.name, label: c.label ?? '', purpose: c.purpose ?? '',
        framing: c.framing ?? '', active: c.active ?? false
      })) ?? [],
      standardStructure: p.standard_structure ?? [],
      defaultOpening: p.default_opening ?? '',
      defaultClosing: p.default_closing ?? '',
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      defaultPresenterName: p.default_presenter_name,
      defaultSegments: p.default_segments,
      standardSegments: p.standard_segments,
      targetAudience: p.target_audience,
      tone: p.tone
    }));

    const episodes: Episode[] = (episodesResult.data ?? []).map((row: any) => row as Episode);

    const participants: Guest[] = (participantsResult.data ?? []).map(p => ({
      id: p.id, legacy_id: p.legacy_id ?? null, program_id: p.program_id ?? null, name: p.name,
      type: p.type as ParticipantType, group_type: p.group_type as GroupType | null, role: p.role ?? '',
      company: p.company ?? '', company_or_group: p.company_or_group ?? null, bio: p.bio ?? '',
      contacts: p.contacts ?? '', notes: p.notes ?? '', links: Array.isArray(p.links) ? p.links : [],
      members: Array.isArray(p.members) ? p.members : [], entity_type: p.entity_type as EntityType,
      social_handles: typeof p.social_handles === 'object' && !Array.isArray(p.social_handles) ? p.social_handles : {},
      previous_episodes: Array.isArray(p.previous_episodes) ? p.previous_episodes : [],
      previous_research_summary: null, created_at: p.created_at, updated_at: p.updated_at
    }));

    const totalCount = programs.length + episodes.length + participants.length;

    return { programs, episodes, participants, totalCount };
  }

  async listProgramsCatalog(filters: ProgramsCatalogFilters = {}): Promise<PaginatedResult<Program>> {
    const { search, format, limit = 20, offset = 0 } = filters;
    
    let query = this.supabase
      .from('programs')
      .select(`
        id, name, description, host, format, default_duration_min, default_episode_duration_minutes,
        default_opening, default_closing, default_presenter_name, default_segments,
        editorial_style, scenario, standard_segments, standard_structure, target_audience,
        title, tone, updated_at, created_at, legacy_id, organization_id, catalog_program_id,
        cameras (id, name, label, purpose, framing, active)
      `, { count: 'exact' });

    if (search) {
      const searchTerm = `%${search}%`;
      query = query.or(`title.ilike.${searchTerm},description.ilike.${searchTerm},host.ilike.${searchTerm}`);
    }

    if (format) {
      query = query.eq('format', format);
    }

    query = query.order('updated_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data: result, error, count } = await query;
    if (error) throw error;

    const programs: Program[] = (result ?? []).map(p => ({
      id: p.id, title: p.title ?? p.name ?? '', description: p.description, host: p.host ?? '',
      format: p.format as ShowFormat, defaultDurationMin: p.default_duration_min ?? 0,
      defaultEpisodeDurationMinutes: p.default_episode_duration_minutes,
      editorialStyle: p.editorial_style ?? '', scenario: p.scenario ?? '',
      cameras: p.cameras?.map((c: any) => ({
        id: c.id, name: c.name, label: c.label ?? '', purpose: c.purpose ?? '',
        framing: c.framing ?? '', active: c.active ?? false
      })) ?? [], standardStructure: p.standard_structure ?? [],
      defaultOpening: p.default_opening ?? '', defaultClosing: p.default_closing ?? '',
      createdAt: p.created_at, updatedAt: p.updated_at,
      defaultPresenterName: p.default_presenter_name, defaultSegments: p.default_segments,
      standardSegments: p.standard_segments, targetAudience: p.target_audience, tone: p.tone
    }));

    return {
      data: programs,
      count: count ?? 0,
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
      totalPages: Math.ceil((count ?? 0) / limit)
    };
  }

  async getCatalogStats(): Promise<CatalogStats> {
    // First, get program IDs that have episodes (for programsWithEpisodes calculation)
    const { data: episodesWithProgramIds } = await this.supabase
      .from('episodes')
      .select('program_id');
    const programIdsWithEpisodes = [...new Set((episodesWithProgramIds || []).map((e: any) => e.program_id).filter(Boolean))];

    const [
      programsResult,
      episodesResult,
      participantsResult,
      assetsResult,
      shortsResult,
      segmentsResult,
      episodesByStatusResult,
      programsWithEpisodesResult,
      recentEpisodesResult,
      recentParticipantsResult
    ] = await Promise.all([
      this.supabase.from('programs').select('id', { count: 'exact', head: true }),
      this.supabase.from('episodes').select('status', { count: 'exact', head: true }),
      this.supabase.from('participants').select('id', { count: 'exact', head: true }),
      this.supabase.from('production_assets').select('id', { count: 'exact', head: true }),
      this.supabase.from('planned_shorts').select('id', { count: 'exact', head: true }),
      this.supabase.from('segments').select('id', { count: 'exact', head: true }),
      this.supabase.from('episodes').select('status'),
      // programsWithEpisodes: count of programs that HAVE episodes
      programIdsWithEpisodes.length > 0
        ? this.supabase
            .from('programs')
            .select('id', { count: 'exact', head: true })
            .in('id', programIdsWithEpisodes)
        : { data: null, count: 0, error: null },
      this.supabase.from('episodes').select('id, title, status, created_at, program_id').order('created_at', { ascending: false }).limit(5),
      this.supabase.from('participants').select('id, name, type, company, created_at').order('created_at', { ascending: false }).limit(5),
    ]);

    const programsError = programsResult.error;
    if (programsError) throw programsError;

    const episodesError = episodesResult.error;
    if (episodesError) throw episodesError;

    const participantsError = participantsResult.error;
    if (participantsError) throw participantsError;

    const assetsError = assetsResult.error;
    if (assetsError) throw assetsError;

    const shortsError = shortsResult.error;
    if (shortsError) throw shortsError;

    const segmentsError = segmentsResult.error;
    if (segmentsError) throw segmentsError;

    const episodesByStatusError = episodesByStatusResult.error;
    if (episodesByStatusError) throw episodesByStatusError;

    const programsWithEpisodesError = programsWithEpisodesResult.error;
    if (programsWithEpisodesError) throw programsWithEpisodesError;

    const recentEpisodesError = recentEpisodesResult.error;
    if (recentEpisodesError) throw recentEpisodesError;

    const recentParticipantsError = recentParticipantsResult.error;
    if (recentParticipantsError) throw recentParticipantsError;

    // Count episodes by status
    const episodesByStatus: Record<string, number> = {};
    (episodesByStatusResult.data || []).forEach((ep: any) => {
      episodesByStatus[ep.status] = (episodesByStatus[ep.status] || 0) + 1;
    });

    // Count programs with episodes
    const programsWithEpisodes = programsWithEpisodesResult.count ?? 0;

    // Recent episodes
    const recentEpisodes = (recentEpisodesResult.data || []).map((ep: any) => ({
      id: ep.id,
      title: ep.title,
      status: ep.status,
      created_at: ep.created_at,
      program_id: ep.program_id
    }));

    // Recent participants
    const recentParticipants = (recentParticipantsResult.data || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      type: p.type,
      company: p.company,
      created_at: p.created_at
    }));

    return {
      totalPrograms: programsResult.count ?? 0,
      totalEpisodes: episodesResult.count ?? 0,
      totalParticipants: participantsResult.count ?? 0,
      totalAssets: assetsResult.count ?? 0,
      totalShorts: shortsResult.count ?? 0,
      totalSegments: segmentsResult.count ?? 0,
      episodesByStatus,
      programsWithEpisodes,
      recentEpisodes,
      recentParticipants
    };
  }

  async searchCatalog(query: string, limit: number = 10): Promise<SearchCatalogResult> {
    if (!query.trim()) {
      return { programs: [], episodes: [], participants: [], totalCount: 0 };
    }

    const searchTerm = `%${query.trim()}%`;

    const [programsResult, episodesResult, participantsResult] = await Promise.all([
      this.supabase
        .from('programs')
        .select('id, title, description, host, format, created_at')
        .or(`title.ilike.%${query}%,description.ilike.%${query}%,host.ilike.%${query}%`)
        .limit(limit),
      this.supabase
        .from('episodes')
        .select('id, title, idea, status, program_id, created_at')
        .or(`title.ilike.%${query}%,idea.ilike.%${query}%,topic.ilike.${query}%,synopsis.ilike.%${query}%`)
        .limit(limit),
      this.supabase
        .from('participants')
        .select('id, name, type, company, role, company_or_group')
        .or(`name.ilike.%${query}%,company.ilike.%${query}%,role.ilike.%${query}%`)
        .limit(limit),
    ]);

    const programsError = programsResult.error;
    if (programsError) throw programsError;

    const episodesError = episodesResult.error;
    if (episodesError) throw episodesError;

    const participantsError = participantsResult.error;
    if (participantsError) throw participantsError;

    return {
      programs: programsResult.data || [],
      episodes: episodesResult.data || [],
      participants: participantsResult.data || [],
      totalCount: (programsResult.count ?? 0) + (episodesResult.count ?? 0) + (participantsResult.count ?? 0)
    };
  }

  async listAssetsCatalog(filters: AssetsCatalogFilters = {}): Promise<PaginatedResult<ProductionAsset>> {
    const { search, type, status, limit = 20, offset = 0 } = filters;

    let query = this.supabase
      .from('production_assets')
      .select(`
        id,
        legacy_id,
        episode_id,
        segment_id,
        type,
        title,
        description,
        content,
        display_time,
        moment,
        status,
        file_url,
        notes,
        block_id,
        created_at,
        updated_at
      `, { count: 'exact' });

    if (filters?.search) {
      const searchTerm = `%${filters.search}%`;
      query = query.or(`title.ilike.${searchTerm},description.ilike.%${filters.search}%,content.ilike.%${filters.search}%`);
    }

    if (type) query = query.eq('type', type);
    if (status) query = query.eq('status', status);

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data: result, error, count } = await query;
    if (error) throw error;

    const assets: ProductionAsset[] = (result ?? []).map(a => ({
      id: a.id,
      legacy_id: a.legacy_id ?? null,
      episode_id: a.episode_id ?? null,
      segment_id: a.segment_id ?? null,
      type: a.type,
      title: a.title,
      description: a.description ?? '',
      content: a.content ?? '',
      display_time: a.display_time ?? '',
      moment: a.moment ?? '',
      status: a.status ?? 'pending',
      file_url: a.file_url ?? null,
      notes: a.notes ?? '',
      block_id: a.block_id ?? null,
      created_at: a.created_at,
      updated_at: a.updated_at
    }));

    return {
      data: result ?? [],
      count: count ?? 0,
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
      totalPages: Math.ceil((count ?? 0) / limit)
    };
  }

  async listEpisodesCatalog(filters: EpisodesCatalogFilters = {}): Promise<PaginatedResult<Episode>> {
    const { search, program_id, status, limit = 20, offset = 0, order_by = 'created_at', ascending = false } = filters;
    
    let query = this.supabase
      .from('episodes')
      .select(`
        id, legacy_id, program_id, episode_number, title, idea, topic, synopsis, format,
        target_duration_min, target_duration_minutes, presenter_name, host, tone, objective,
        additional_info, status, diagnosis, research, technical_checklist, editorial_notes_for_post,
        editor_script_synthesis, recording_time_elapsed, scheduled_date, production_status,
        version, season_id, created_at, updated_at, checklist
      `, { count: 'exact' });

    if (search) {
      const searchTerm = `%${search}%`;
      query = query.or(`title.ilike.${searchTerm},idea.ilike.${searchTerm},topic.ilike.${searchTerm},synopsis.ilike.${searchTerm}`);
    }

    if (program_id) {
      query = query.eq('program_id', program_id);
    }

    if (status) {
      query = query.eq('status', status);
    }

    query = query.order(order_by, { ascending }).range(offset, offset + limit - 1);

    const { data: result, error, count } = await query;
    if (error) throw error;

    const episodes: Episode[] = (result ?? []).map((row: any) => row as Episode);

    return {
      data: episodes,
      count: count ?? 0,
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
      totalPages: Math.ceil((count ?? 0) / limit)
    };
  }

  async listParticipantsCatalog(filters: ParticipantsCatalogFilters = {}): Promise<PaginatedResult<Guest>> {
    const { search, type, group_type, role, entity_type, company, limit = 20, offset = 0 } = filters;
    
    let query = this.supabase
      .from('participants')
      .select(`
        id, legacy_id, program_id, name, type, group_type, role, company, company_or_group,
        bio, contacts, notes, links, members, entity_type, social_handles, previous_episodes,
        created_at, updated_at
      `, { count: 'exact' });

    if (search) {
      const searchTerm = `%${search}%`;
      query = query.or(`name.ilike.${searchTerm},company.ilike.${searchTerm},role.ilike.${searchTerm}`);
    }

    if (type) query = query.eq('type', type);
    if (group_type) query = query.eq('group_type', group_type);
    if (role) query = query.eq('role', role);
    if (entity_type) query = query.eq('entity_type', entity_type);
    if (company) query = query.ilike('company', `%${company}%`);

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data: result, error, count } = await query;
    if (error) throw error;

    const participants: Guest[] = (result ?? []).map(p => ({
      id: p.id, legacy_id: p.legacy_id ?? null, program_id: p.program_id ?? null, name: p.name,
      type: p.type as ParticipantType, group_type: p.group_type as GroupType | null, role: p.role ?? '',
      company: p.company ?? '', company_or_group: p.company_or_group ?? null, bio: p.bio ?? '',
      contacts: p.contacts ?? '', notes: p.notes ?? '', links: Array.isArray(p.links) ? p.links : [],
      members: Array.isArray(p.members) ? p.members : [], entity_type: p.entity_type as EntityType,
      social_handles: typeof p.social_handles === 'object' && !Array.isArray(p.social_handles) ? p.social_handles : {},
      previous_episodes: Array.isArray(p.previous_episodes) ? p.previous_episodes : [],
      previous_research_summary: null, created_at: p.created_at, updated_at: p.updated_at
    }));

    return {
      data: participants,
      count: count ?? 0,
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
      totalPages: Math.ceil((count ?? 0) / limit)
    };
  }

  // Recording Sessions (Agenda)
  async getRecordingSessions(filters?: {
    episode_id?: string;
    status?: RecordingSessionStatus;
    limit?: number;
    offset?: number;
    order_by?: string;
    ascending?: boolean;
  }): Promise<{ data: RecordingSession[]; count: number }> {
    let query = this.supabase
      .from('recording_sessions')
      .select('*', { count: 'exact' });

    if (filters?.episode_id) {
      query = query.eq('episode_id', filters.episode_id);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const orderBy = filters?.order_by ?? 'scheduled_start';
    const ascending = filters?.ascending ?? true;
    query = query.order(orderBy, { ascending });

    if (filters?.offset !== undefined) {
      const limit = filters.limit ?? 50;
      query = query.range(filters.offset, filters.offset + limit - 1);
    } else if (filters?.limit !== undefined) {
      query = query.limit(filters.limit);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    return {
      data: data as RecordingSession[],
      count: count ?? 0
    };
  }

  async getRecordingSession(id: string): Promise<RecordingSession | undefined> {
    const { data, error } = await this.supabase
      .from('recording_sessions')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as RecordingSession | undefined;
  }

  async createRecordingSession(session: Omit<RecordingSession, 'id' | 'created_at' | 'updated_at'>): Promise<RecordingSession> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const sessionData = { ...session, id, created_at: now, updated_at: now };
    const { error } = await this.supabase.from('recording_sessions').insert(sessionData);
    if (error) throw error;
    return sessionData as RecordingSession;
  }

  async updateRecordingSession(id: string, session: Partial<RecordingSession>): Promise<RecordingSession> {
    const now = new Date().toISOString();
    const updateData = { ...session, updated_at: now };
    const { error } = await this.supabase.from('recording_sessions').update(updateData).eq('id', id);
    if (error) throw error;
    const updated = await this.getRecordingSession(id);
    if (!updated) throw new Error('Recording session not found after update');
    return updated;
  }

  async deleteRecordingSession(id: string): Promise<boolean> {
    const { error } = await this.supabase.from('recording_sessions').delete().eq('id', id);
    if (error) throw error;
    return true;
  }

  // Agenda: Get all scheduled recordings across programs
  async getAgenda(filters?: {
    start_date?: string;
    end_date?: string;
    program_id?: string;
    status?: RecordingSessionStatus;
    limit?: number;
    offset?: number;
  }): Promise<{ data: (RecordingSession & { episode_title: string; program_title: string })[]; count: number }> {
    // This would need a join - for now return episodes with their recording sessions
    // TODO: Implement proper join via RPC or multiple queries
    const { data: episodes } = await this.supabase
      .from('episodes')
      .select('id, title, program_id')
      .eq('program_id', filters?.program_id || '');
    
    // Simplified: return empty for now, can be expanded
return { data: [], count: 0 };
  }

  // Library: Asset Folders
  async getAssetFolders(filters?: {
    episode_id?: string;
    program_id?: string;
    parent_id?: string | null;
  }): Promise<AssetFolder[]> {
    let query = this.supabase.from('asset_folders').select('*');
    
    if (filters?.episode_id) {
      query = query.eq('episode_id', filters.episode_id);
    } else if (filters?.program_id) {
      query = query.eq('program_id', filters.program_id);
    } else {
      // Global folders (no episode or program)
      query = query.is('episode_id', null).is('program_id', null);
    }
    
    if (filters?.parent_id !== undefined) {
      if (filters.parent_id === null) {
        query = query.is('parent_id', null);
      } else {
        query = query.eq('parent_id', filters.parent_id);
      }
    }
    
    query = query.order('name', { ascending: true });
    
    const { data, error } = await query;
    if (error) throw error;
    return data as AssetFolder[];
  }

  async getAssetFolder(id: string): Promise<AssetFolder | undefined> {
    const { data, error } = await this.supabase
      .from('asset_folders')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as AssetFolder | undefined;
  }

  async createAssetFolder(folder: Omit<AssetFolder, 'id' | 'created_at' | 'updated_at'>): Promise<AssetFolder> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const folderData = { ...folder, id, created_at: now, updated_at: now };
    const { error } = await this.supabase.from('asset_folders').insert(folderData);
    if (error) throw error;
    return folderData as AssetFolder;
  }

  async updateAssetFolder(id: string, folder: Partial<AssetFolder>): Promise<AssetFolder> {
    const now = new Date().toISOString();
    const updateData = { ...folder, updated_at: now };
    const { error } = await this.supabase.from('asset_folders').update(updateData).eq('id', id);
    if (error) throw error;
    const updated = await this.getAssetFolder(id);
    if (!updated) throw new Error('Asset folder not found after update');
    return updated;
  }

  async deleteAssetFolder(id: string): Promise<boolean> {
    const { error } = await this.supabase.from('asset_folders').delete().eq('id', id);
    if (error) throw error;
    return true;
  }

  // Library: Asset Tags
  async getAssetTags(filters?: {
    episode_id?: string;
    program_id?: string;
  }): Promise<AssetTag[]> {
    let query = this.supabase.from('asset_tags').select('*');
    
    if (filters?.episode_id) {
      query = query.eq('episode_id', filters.episode_id);
    } else if (filters?.program_id) {
      query = query.eq('program_id', filters.program_id);
    } else {
      query = query.is('episode_id', null).is('program_id', null);
    }
    
    query = query.order('name', { ascending: true });
    
    const { data, error } = await query;
    if (error) throw error;
    return data as AssetTag[];
  }

  async createAssetTag(tag: Omit<AssetTag, 'id' | 'created_at' | 'usage_count'>): Promise<AssetTag> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const tagData = { ...tag, id, created_at: now, usage_count: 0 };
    const { error } = await this.supabase.from('asset_tags').insert(tagData);
    if (error) throw error;
    return tagData as AssetTag;
  }

  async updateAssetTag(id: string, tag: Partial<AssetTag>): Promise<AssetTag> {
    const { error } = await this.supabase.from('asset_tags').update(tag).eq('id', id);
    if (error) throw error;
    const { data } = await this.supabase.from('asset_tags').select('*').eq('id', id).single();
    return data as AssetTag;
  }

  async deleteAssetTag(id: string): Promise<boolean> {
    const { error } = await this.supabase.from('asset_tags').delete().eq('id', id);
    if (error) throw error;
    return true;
  }

  // Library: Enhanced Asset Search
  async searchAssets(filters: LibrarySearchFilters = {}): Promise<{ data: ProductionAsset[]; count: number }> {
    let query = this.supabase
      .from('production_assets')
      .select('*', { count: 'exact' });

    if (filters.episode_id) {
      query = query.eq('episode_id', filters.episode_id);
    }
    if (filters.program_id) {
      // Join through episodes to filter by program
      const { data: episodes } = await this.supabase
        .from('episodes')
        .select('id')
        .eq('program_id', filters.program_id);
      const episodeIds = episodes?.map(e => e.id) || [];
      if (episodeIds.length > 0) {
        query = query.in('episode_id', episodeIds);
      } else {
        return { data: [], count: 0 };
      }
    }
    if (filters.folder_id) {
      query = query.eq('folder_id', filters.folder_id);
    }
    if (filters.tags && filters.tags.length > 0) {
      query = query.contains('tags', filters.tags);
    }
    if (filters.type) {
      query = query.eq('type', filters.type);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.mime_type) {
      query = query.eq('mime_type', filters.mime_type);
    }
    if (filters.is_favorite !== undefined) {
      query = query.eq('is_favorite', filters.is_favorite);
    }
    if (filters.query) {
      const searchTerm = `%${filters.query}%`;
      query = query.or(`title.ilike.${searchTerm},description.ilike.${searchTerm},content.ilike.${searchTerm}`);
    }
    if (filters.date_from) {
      query = query.gte('created_at', filters.date_from);
    }
    if (filters.date_to) {
      query = query.lte('created_at', filters.date_to);
    }

    const orderBy = filters.order_by ?? 'created_at';
    const ascending = filters.ascending ?? false;
    query = query.order(orderBy, { ascending });

    if (filters.offset !== undefined) {
      const limit = filters.limit ?? 50;
      query = query.range(filters.offset, filters.offset + limit - 1);
    } else if (filters.limit !== undefined) {
      query = query.limit(filters.limit);
    }

    const { data, error, count } = await query;
    if (error) throw error;
    return {
      data: data as ProductionAsset[],
      count: count ?? 0
    };
  }

  // Library: Get asset with folder/tag details
  async getAssetWithDetails(id: string): Promise<(ProductionAsset & { folder?: AssetFolder; tags?: AssetTag[] }) | undefined> {
    const { data: asset, error } = await this.supabase
      .from('production_assets')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    if (!asset) return undefined;

    // Get folder
    let folder: AssetFolder | undefined;
    if (asset.folder_id) {
      const { data: folderData } = await this.supabase
        .from('asset_folders')
        .select('*')
        .eq('id', asset.folder_id)
        .single();
      folder = folderData as AssetFolder | undefined;
    }

    // Get tags
    let tags: AssetTag[] = [];
    if (asset.tags && asset.tags.length > 0) {
      const { data: tagsData } = await this.supabase
        .from('asset_tags')
        .select('*')
        .in('id', asset.tags);
      tags = (tagsData as AssetTag[]) || [];
    }

    return { ...asset, folder, tags } as (ProductionAsset & { folder?: AssetFolder; tags?: AssetTag[] });
  }

  // Library: Bulk tag operations
  async addTagsToAssets(assetIds: string[], tagIds: string[]): Promise<number> {
    let updated = 0;
    for (const assetId of assetIds) {
      const { data: asset } = await this.supabase
        .from('production_assets')
        .select('tags')
        .eq('id', assetId)
        .single();
      
      const existingTags = asset?.tags || [];
      const newTags = [...new Set([...existingTags, ...tagIds])];
      
      const { error } = await this.supabase
        .from('production_assets')
        .update({ tags: newTags })
        .eq('id', assetId);
      
      if (!error) updated++;
    }
    return updated;
  }

  async removeTagsFromAssets(assetIds: string[], tagIds: string[]): Promise<number> {
    let updated = 0;
    for (const assetId of assetIds) {
      const { data: asset } = await this.supabase
        .from('production_assets')
        .select('tags')
        .eq('id', assetId)
        .single();
      
      const existingTags = asset?.tags || [];
      const newTags = existingTags.filter((t: string) => !tagIds.includes(t));
      
      const { error } = await this.supabase
        .from('production_assets')
        .update({ tags: newTags })
        .eq('id', assetId);
      
      if (!error) updated++;
    }
    return updated;
  }

  // Library: Move assets to folder
  async moveAssetsToFolder(assetIds: string[], folderId: string | null): Promise<number> {
    let updated = 0;
    for (const assetId of assetIds) {
      const { error } = await this.supabase
        .from('production_assets')
        .update({ folder_id: folderId })
        .eq('id', assetId);
      if (!error) updated++;
    }
    return updated;
  }
}

export const db = new SupabasePersistence();