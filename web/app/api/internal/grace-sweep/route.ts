export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { runGraceSweep } from '@server/api/handlers/graceSweeper';

export const runtime = 'nodejs';

/**
 * Call on a schedule (e.g. Render cron) with header:
 *   Authorization: Bearer <INTERNAL_CRON_SECRET>
 */
export async function POST(request: Request) {
  const secret = process.env.INTERNAL_CRON_SECRET;
  const auth = request.headers.get('authorization');
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    await runGraceSweep();
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[grace-sweep]', msg);
    return NextResponse.json({ ok: false, error: 'Grace sweep failed' }, { status: 500 });
  }
}
