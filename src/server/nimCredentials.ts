export class NimProviderError extends Error {
  constructor(readonly status: number) {
    super(`NVIDIA NIM HTTP ${status}`);
    this.name = 'NimProviderError';
  }
}

export function isNimAuthenticationError(error: unknown): error is NimProviderError {
  return error instanceof NimProviderError && [401, 403].includes(error.status);
}

export async function withNimCredentialFailover<T>(
  apiKeys: string[],
  operation: (apiKey: string) => Promise<T>,
  onCredentialRejected?: (credentialIndex: number, status: number) => void
): Promise<T> {
  const credentials = [...new Set(apiKeys.map((key) => key.trim()).filter(Boolean))];
  if (!credentials.length) throw new Error('NVIDIA NIM não configurado: defina NIM_API_KEY.');

  for (let index = 0; index < credentials.length; index += 1) {
    try {
      return await operation(credentials[index]);
    } catch (error) {
      if (!isNimAuthenticationError(error) || index === credentials.length - 1) throw error;
      onCredentialRejected?.(index + 1, error.status);
    }
  }

  throw new Error('Nenhuma credencial NVIDIA NIM disponível.');
}
