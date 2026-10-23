export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

// NVIDIA Nemotron Model Chain — Ordered by capability/cost ratio
// Each model has its own token limits and pricing
export const NEMOTRON_MODELS = [
  {
    id: 'nvidia/nemotron-3-ultra-550b-a55b',
    name: 'Nemotron 3 Ultra 550B A55B',
    tier: 'ultra',
    maxTokens: 4096,
    contextWindow: 131072,
    costPer1k: { input: 0.0003, output: 0.0006 },
  },
  {
    id: 'nvidia/nemotron-3-super-120b-a12b',
    name: 'Nemotron 3 Super 120B A12B',
    tier: 'super',
    maxTokens: 4096,
    contextWindow: 131072,
    costPer1k: { input: 0.00015, output: 0.0003 },
  },
  {
    id: 'nvidia/nemotron-3-brite-70b',
    name: 'Nemotron 3 Brite 70B',
    tier: 'brite',
    maxTokens: 4096,
    contextWindow: 131072,
    costPer1k: { input: 0.0001, output: 0.0002 },
  },
  {
    id: 'nvidia/nemotron-3-ultra-253b',
    name: 'Nemotron 3 Ultra 253B',
    tier: 'ultra',
    maxTokens: 4096,
    contextWindow: 131072,
    costPer1k: { input: 0.00025, output: 0.0005 },
  },
  {
    id: 'nvidia/nemotron-3-super-53b',
    name: 'Nemotron 3 Super 53B',
    tier: 'super',
    maxTokens: 4096,
    contextWindow: 131072,
    costPer1k: { input: 0.00012, output: 0.00024 },
  },
  {
    id: 'nvidia/nemotron-4-340b-instruct',
    name: 'Nemotron 4 340B Instruct',
    tier: 'ultra',
    maxTokens: 4096,
    contextWindow: 8192,
    costPer1k: { input: 0.0003, output: 0.0006 },
  },
] as const;

export type NemotronModel = typeof NEMOTRON_MODELS[number]['id'];

export function getNemotronModelChain(): NemotronModel[] {
  return NEMOTRON_MODELS.map(m => m.id);
}

export function getNemotronModelInfo(modelId: NemotronModel) {
  return NEMOTRON_MODELS.find(m => m.id === modelId);
}

export function getServerConfig() {
  // Collect all 3 NVIDIA API keys from .env
  const apiKey1 = process.env.NVIDIA_API_KEY || process.env.NIM_API_KEY || '';
  const apiKey2 = process.env.NVIDIA_API_KEY_2 || process.env.NIM_API_KEY_SECONDARY || '';
  const apiKey3 = process.env.NVIDIA_API_KEY_3 || process.env.NIM_API_KEY_TERTIARY || '';
  
  const nimApiKeys = [
    ...new Set([apiKey1, apiKey2, apiKey3].map(key => key.trim()).filter(Boolean)),
  ];

  // Full Nemotron model chain for failover
  const modelChain = getNemotronModelChain();
  
  // Primary and fallback from env, defaulting to best available
  const primaryModel = (process.env.NIM_PRIMARY_MODEL as NemotronModel) || modelChain[0];
  const fallbackModels = modelChain.slice(1); // All others as fallbacks

  return {
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || '',
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    nimBaseUrl: (process.env.NIM_BASE_URL || 'https://integrate.api.nvidia.com').replace(/\/$/, ''),
    nimApiKey: nimApiKeys[0] || '',
    nimApiKeys,
    nimModelChain: modelChain,
    nimPrimaryModel: primaryModel,
    nimFallbackModels: fallbackModels,
    nimTimeoutMs: Number(process.env.NIM_TIMEOUT_MS || 60000),
    // Token tracking for quota management
    nimTokenQuotaPerKey: Number(process.env.NIM_TOKEN_QUOTA_PER_KEY || 1000000), // 1M tokens/month default
  };
}

export function assertServerConfig() {
  const c = getServerConfig();
  const missing = [
    !c.supabaseUrl && 'SUPABASE_URL',
    !c.supabaseServiceRoleKey && 'SUPABASE_SERVICE_ROLE_KEY',
    !c.nimApiKey && 'NVIDIA_API_KEY (or NIM_API_KEY)',
    !process.env.INTERNAL_SESSION_KEY && 'INTERNAL_SESSION_KEY',
  ].filter(Boolean) as string[];
  if (missing.length) throw new Error(`Server configuration missing: ${missing.join(', ')}`);
  return c;
}
