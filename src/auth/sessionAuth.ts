import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../db';
import { getSessionTokenFromParsedCookies, parseCookieHeader } from '../webProxy/authHardening';

async function getUserIdFromSession(req: Request): Promise<string | null> {
  const cookies = parseCookieHeader(req.headers.cookie);
  const token = getSessionTokenFromParsedCookies(cookies);
  if (!token) return null;

  const session = await prisma.session.findUnique({ where: { sessionToken: token } });
  if (!session) return null;
  if (session.expires.getTime() <= Date.now()) return null;
  return session.userId;
}

export type AuthedRequest = Request & { authUserId?: string };

export function requireAuthSession() {
  return async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = await getUserIdFromSession(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      req.authUserId = userId;
      return next();
    } catch (e) {
      return next(e);
    }
  };
}

