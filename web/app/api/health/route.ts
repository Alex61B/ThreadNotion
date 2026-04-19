export const dynamic = 'force-dynamic';

import { getHealth } from '@server/api/handlers/health';
import { nextFromHandlerResult } from '@/lib/nextJsonHandler';

export const runtime = 'nodejs';

export async function GET() {
  const r = await getHealth();
  return nextFromHandlerResult(r);
}
