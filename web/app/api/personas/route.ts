export const dynamic = 'force-dynamic';

import { listPersonas } from '@server/api/handlers/catalog';
import { nextFromHandlerResult } from '@/lib/nextJsonHandler';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const r = await listPersonas();
    return nextFromHandlerResult(r);
  } catch (e) {
    console.error('Personas API error:', e);
    return nextFromHandlerResult({ status: 500, body: { error: 'Failed to fetch personas' } });
  }
}
