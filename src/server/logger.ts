import { Request, Response, NextFunction } from 'express';

export interface SystemMetrics {
  startedAt: string;
  uptimeSeconds: number;
  requestsTotal: number;
  errorsTotal: number;
  autosavesTotal: number;
  aiCallsTotal: number;
  aiFallbacksTotal: number;
  authFailuresTotal: number;
  lastErrorAt?: string;
  lastErrorMessage?: string;
}

const metricsState = {
  startedAt: new Date().toISOString(),
  startedAtMs: Date.now(),
  requestsTotal: 0,
  errorsTotal: 0,
  autosavesTotal: 0,
  aiCallsTotal: 0,
  aiFallbacksTotal: 0,
  authFailuresTotal: 0,
  lastErrorAt: undefined as string | undefined,
  lastErrorMessage: undefined as string | undefined,
};

export function incrementMetric(
  key:
    | 'requestsTotal'
    | 'errorsTotal'
    | 'autosavesTotal'
    | 'aiCallsTotal'
    | 'aiFallbacksTotal'
    | 'authFailuresTotal',
  errorMessage?: string
) {
  metricsState[key] += 1;
  if (key === 'errorsTotal' && errorMessage) {
    metricsState.lastErrorAt = new Date().toISOString();
    metricsState.lastErrorMessage = errorMessage;
  }
}

export function getSystemMetrics(): SystemMetrics {
  return {
    startedAt: metricsState.startedAt,
    uptimeSeconds: Math.floor((Date.now() - metricsState.startedAtMs) / 1000),
    requestsTotal: metricsState.requestsTotal,
    errorsTotal: metricsState.errorsTotal,
    autosavesTotal: metricsState.autosavesTotal,
    aiCallsTotal: metricsState.aiCallsTotal,
    aiFallbacksTotal: metricsState.aiFallbacksTotal,
    authFailuresTotal: metricsState.authFailuresTotal,
    lastErrorAt: metricsState.lastErrorAt,
    lastErrorMessage: metricsState.lastErrorMessage,
  };
}

export function logStructured(
  level: 'INFO' | 'WARN' | 'ERROR',
  event: string,
  meta: Record<string, any> = {}
) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    service: 'takemaster-v2',
    event,
    ...meta,
  };
  if (process.env.NODE_ENV !== 'test') {
    if (level === 'ERROR') {
      console.error(JSON.stringify(entry));
    } else {
      console.log(JSON.stringify(entry));
    }
  }
}

export function requestTracingMiddleware(req: Request, res: Response, next: NextFunction) {
  const requestId =
    (req.headers['x-request-id'] as string) ||
    `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  (req as any).requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  if (req.path.startsWith('/api/')) {
    incrementMetric('requestsTotal');
    const startMs = Date.now();
    res.on('finish', () => {
      const durationMs = Date.now() - startMs;
      if (res.statusCode >= 400) {
        logStructured(res.statusCode >= 500 ? 'ERROR' : 'WARN', 'http_request_error', {
          requestId,
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          durationMs,
        });
      }
    });
  }

  next();
}
