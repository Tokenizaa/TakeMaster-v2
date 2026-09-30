import type { NextFunction, Request, Response } from 'express';
import { getAuthenticatedUser } from './supabase';

export type AuthenticatedRequest = Request & {
  user?: { id: string; email?: string };
  accessToken?: string;
};

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const header = req.header('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return res.status(401).json({ error: 'AUTH_REQUIRED' });

  try {
    const user = await getAuthenticatedUser(match[1]);
    if (!user) return res.status(401).json({ error: 'INVALID_SESSION' });
    req.accessToken = match[1];
    req.user = { id: user.id, email: user.email };
    return next();
  } catch (error) {
    console.error('[auth] validation failed', error);
    return res.status(401).json({ error: 'AUTH_VALIDATION_FAILED' });
  }
}
