export class AppError extends Error {
  constructor(message: string, public readonly code: string, public readonly status = 400) {
    super(message);
  }
}

export function errorResponse(error: unknown) {
  if (error instanceof AppError) return { status: error.status, body: { error: error.code, message: error.message } };
  console.error('[api] unexpected error', error);
  return { status: 500, body: { error: 'INTERNAL_ERROR', message: 'Erro interno do servidor' } };
}
