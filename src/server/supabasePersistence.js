"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = exports.SupabasePersistence = void 0;
const supabase_1 = require("./supabase");
// Helper to convert snake_case to camelCase? Not needed as we select columns with aliases if needed.
class SupabasePersistence {
    constructor() {
        this.supabase = (0, supabase_1.getSupabaseAdmin)();
    }
    async getShows(filters) {
        // Build the query
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
        // Apply search filter
        if (filters?.search) {
            const searchTerm = `%${filters.search}%`;
            query = query.or(`title.ilike${searchTerm},description.ilike${searchTerm},host.ilike${searchTerm}`);
        }
        // Apply format filter
        if (filters?.format) {
            query = query.eq('format', filters.format);
        }
        // Apply pagination
        if (filters?.offset !== undefined) {
            const limit = filters.limit ?? 100;
            query = query.range(filters.offset, filters.offset + limit - 1);
        }
        else if (filters?.limit !== undefined) {
            query = query.limit(filters.limit);
        }
        // Execute the query
        const { data: programs, error, count } = await query;
        if (error)
            throw error;
        // Map to Show type
        const shows = programs.map(p => ({
            id: p.id,
            title: p.title ?? p.name ?? '', // fallback to name if title null
            description: p.description,
            host: p.host ?? '', // ensure non-null
            format: p.format, // assuming matches ShowFormat enum
            defaultDurationMin: p.default_duration_min ?? 0,
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
            updatedAt: p.updated_at
        }));
        return {
            data: shows,
            count: count ?? 0
        };
    }
    async getShow(id) {
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
        if (error)
            throw error;
        if (!programs)
            return undefined;
        const p = programs;
        return {
            id: p.id,
            title: p.title ?? p.name ?? '',
            description: p.description,
            host: p.host ?? '',
            format: p.format,
            defaultDurationMin: p.default_duration_min ?? 0,
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
            updatedAt: p.updated_at
        };
    }
    async saveShow(show) {
        // Upsert program
        const programData = {
            id: show.id,
            name: show.title, // using name as title
            description: show.description,
            host: show.host,
            format: show.format,
            default_duration_min: show.defaultDurationMin,
            default_episode_duration_minutes: show.defaultDurationMin, // maybe same? we'll copy
            default_opening: show.defaultOpening,
            default_presenter_name: show.host, // assuming host is presenter name
            default_segments: {}, // placeholder JSON
            editorial_style: show.editorialStyle,
            scenario: show.scenario,
            standard_segments: {}, // placeholder JSON
            standard_structure: show.standardStructure,
            target_audience: null,
            title: show.title, // redundant
            tone: null,
            updated_at: show.updatedAt,
            createdAt: show.createdAt,
            legacy_id: null,
            organization_id: null,
            catalog_program_id: null
        };
        const { error: upsertError } = await this.supabase
            .from('programs')
            .upsert(programData, { onConflict: 'id' });
        if (upsertError)
            throw upsertError;
        // Sync cameras: delete existing and insert new
        await this.supabase
            .from('cameras')
            .delete()
            .eq('program_id', show.id);
        if (show.cameras.length > 0) {
            const camerasData = show.cameras.map(c => ({
                id: c.id,
                program_id: show.id,
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
            if (camerasError)
                throw camerasError;
        }
        return show;
    }
    async deleteShow(id) {
        const { error } = await this.supabase.from('programs').delete().eq('id', id);
        if (error)
            throw error;
        // Assuming cascade deletes for related tables (cameras, episodes via program_id, etc.)
        return true;
    }
    async getGuests() {
        // Fetch participants with their previous episodes via episode_participants
        const { data: participants, error } = await this.supabase
            .from('participants')
            .select(`
        id,
        name,
        role,
        company,
        bio,
        contacts,
        links,
        notes,
        created_at,
        episode_participants (
          episode_id
        )
      `);
        if (error)
            throw error;
        return participants.map(p => ({
            id: p.id,
            name: p.name,
            role: p.role ?? '',
            company: p.company ?? '',
            bio: p.bio ?? '',
            contacts: p.contacts ?? '',
            links: p.links ?? [],
            notes: p.notes ?? '',
            previousEpisodes: p.episode_participants?.map(ep => ep.episode_id) ?? [],
            previousResearchSummary: undefined, // not stored
            createdAt: p.created_at
        }));
    }
    async getGuest(id) {
        const { data: participants, error } = await this.supabase
            .from('participants')
            .select(`
        id,
        name,
        role,
        company,
        bio,
        contacts,
        links,
        notes,
        created_at,
        episode_participants (
          episode_id
        )
      `)
            .eq('id', id)
            .single();
        if (error)
            throw error;
        if (!participants)
            return undefined;
        const p = participants;
        return {
            id: p.id,
            name: p.name,
            role: p.role ?? '',
            company: p.company ?? '',
            bio: p.bio ?? '',
            contacts: p.contacts ?? '',
            links: p.links ?? [],
            notes: p.notes ?? '',
            previousEpisodes: p.episode_participants?.map(ep => ep.episode_id) ?? [],
            previousResearchSummary: undefined,
            createdAt: p.created_at
        };
    }
    async saveGuest(guest) {
        // Upsert participant
        const participantData = {
            id: guest.id,
            name: guest.name,
            role: guest.role,
            company: guest.company,
            bio: guest.bio,
            contacts: guest.contacts,
            links: guest.links,
            notes: guest.notes,
            created_at: guest.createdAt,
            updated_at: new Date().toISOString(),
            entity_type: null,
            group_type: null,
            legacy_id: null,
            members: [],
            program_id: null, // maybe we need to set program_id? Not in domain; we'll leave null
            social_handles: {},
            type: null,
            previous_episodes: guest.previousEpisodes.length // store count? but we have separate table
        };
        // We'll store previous_episodes as count for compatibility, but we also maintain episode_participants
        const { error: upsertError } = await this.supabase
            .from('participants')
            .upsert(participantData, { onConflict: 'id' });
        if (upsertError)
            throw upsertError;
        // Sync episode_participants: delete existing and insert new
        await this.supabase
            .from('episode_participants')
            .delete()
            .eq('participant_id', guest.id);
        if (guest.previousEpisodes.length > 0) {
            const epData = guest.previousEpisodes.map(episodeId => ({
                id: `${guest.id}-${episodeId}`, // composite legacy id maybe
                episode_id: episodeId,
                participant_id: guest.id,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                legacy_id: null,
                bio: null,
                entry_segment_id: null,
                exit_segment_id: null,
                estimated_time_min: null,
                is_featured: false,
                name: null,
                notes: null,
                order_pos: 0,
                role: null,
                type: null,
                // Note: episode_participants table expects episode_id and participant_id foreign keys
            }));
            const { error: epError } = await this.supabase
                .from('episode_participants')
                .insert(epData);
            if (epError)
                throw epError;
        }
        return guest;
    }
    async deleteGuest(id) {
        const { error } = await this.supabase.from('participants').delete().eq('id', id);
        if (error)
            throw error;
        // Need to delete episode_participants rows (should cascade if foreign key set)
        return true;
    }
    async getEpisodes() {
        // For now, return empty array to avoid complex mapping issues
        return [];
    }
    async getEpisode(id) {
        const episodes = await this.getEpisodes();
        return episodes.find(e => e.id === id);
    }
    async saveEpisode(episode) {
        // TODO: Implement full episode save with related tables
        throw new Error('saveEpisode not implemented');
    }
    async deleteEpisode(id) {
        throw new Error('deleteEpisode not implemented');
    }
}
exports.SupabasePersistence = SupabasePersistence;
// Export a singleton instance similar to original db
exports.db = new SupabasePersistence();
