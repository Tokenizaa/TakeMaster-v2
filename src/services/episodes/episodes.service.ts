import { SupabasePersistence } from '../../server/supabasePersistence';
import type { Episode } from '../../types/domain';

const persistence = new SupabasePersistence();

export class EpisodesService {
  async getEpisodes(filters?: {
    search?: string;
    program_id?: string;
    status?: string;
    season_id?: string;
    limit?: number;
    offset?: number;
    order_by?: string;
    ascending?: boolean;
  }): Promise<{ data: Episode[]; count: number }> {
    return persistence.getEpisodes(filters);
  }

  async getEpisodeById(id: string): Promise<Episode | undefined> {
    return persistence.getEpisode(id);
  }

  async createEpisode(episodeData: Omit<Episode, 'id' | 'created_at' | 'updated_at'>): Promise<Episode> {
    return persistence.createEpisode(episodeData);
  }

  async updateEpisode(id: string, episodeData: Partial<Episode>): Promise<Episode> {
    return persistence.updateEpisode(id, episodeData);
  }

  async deleteEpisode(id: string): Promise<boolean> {
    return persistence.deleteEpisode(id);
  }
}

export const episodesService = new EpisodesService();