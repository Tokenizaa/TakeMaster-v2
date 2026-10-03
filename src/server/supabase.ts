import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getServerConfig } from './config';

let adminClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  const c = getServerConfig();
  if (!c.supabaseUrl || !c.supabaseServiceRoleKey) {
    throw new Error('Supabase server configuration is incomplete');
  }
  if (!adminClient) {
    adminClient = createClient(c.supabaseUrl, c.supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { 'X-Client-Info': 'takemaster-v2-server' } },
    });
  }
  return adminClient;
}

export async function getAuthenticatedUser(accessToken: string) {
  if (!accessToken) return null;
  const { data, error } = await getSupabaseAdmin().auth.getUser(accessToken);
  if (error || !data.user) return null;
  return data.user;
}

export async function checkSupabaseConnection() {
  const started = Date.now();
  try {
    const { error } = await getSupabaseAdmin().from('programs').select('id', { count: 'exact', head: true });
    return { connected: !error, latencyMs: Date.now() - started, error: error?.message };
  } catch (error) {
    return { connected: false, latencyMs: Date.now() - started, error: error instanceof Error ? error.message : String(error) };
  }
}
