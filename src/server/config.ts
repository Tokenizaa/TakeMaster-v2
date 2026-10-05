export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function getServerConfig() {
  return {
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || '',
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    nimBaseUrl: (process.env.NIM_BASE_URL || 'https://integrate.api.nvidia.com').replace(/\/$/, ''),
    nimApiKey: process.env.NIM_API_KEY || process.env.NVIDIA_API_KEY || '',
    nimPrimaryModel: process.env.NIM_PRIMARY_MODEL || 'nvidia/nemotron-3-super-120b-a12b',
    nimFallbackModel:
      process.env.NIM_FALLBACK_MODEL || 'nvidia/nemotron-3-ultra-550b-a55b',
    nimTimeoutMs: Number(process.env.NIM_TIMEOUT_MS || 60000),
  };
}

export function assertServerConfig() {
  const c = getServerConfig();
  const missing = [
    !c.supabaseUrl && 'SUPABASE_URL',
    !c.supabaseServiceRoleKey && 'SUPABASE_SERVICE_ROLE_KEY',
    !c.nimApiKey && 'NIM_API_KEY',
    !process.env.INTERNAL_SESSION_KEY && 'INTERNAL_SESSION_KEY',
  ].filter(Boolean) as string[];
  if (missing.length) throw new Error(`Server configuration missing: ${missing.join(', ')}`);
  return c;
}
