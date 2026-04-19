import { prisma } from '../../db';
import type { JsonHandlerResult } from '../httpTypes';

export async function getHealth(): Promise<JsonHandlerResult> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      status: 200,
      body: { ok: true, db: 'connected' as const, timestamp: new Date().toISOString() },
    };
  } catch {
    return { status: 500, body: { ok: false, db: 'disconnected' as const } };
  }
}
