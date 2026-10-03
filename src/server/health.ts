import { checkSupabaseConnection } from './supabase';
import { getServerConfig } from './config';

export async function getHealth() {
  const config = getServerConfig();
  const supabase = config.supabaseUrl && config.supabaseServiceRoleKey
    ? await checkSupabaseConnection()
    : { connected: false, latencyMs: 0, error: 'NOT_CONFIGURED' };

  return {
    status: supabase.connected ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    dependencies: {
      supabase: supabase.connected ? { status: 'ok', latencyMs: supabase.latencyMs } : { status: 'error', latencyMs: supabase.latencyMs, error: supabase.error },
      nvidia: config.nimApiKey ? { status: 'configured' } : { status: 'not_configured' },
    },
  };
}
