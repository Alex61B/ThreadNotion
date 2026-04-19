export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { auth } from '../../../auth';
import { postGenerateScript } from '@server/api/handlers/generateScript';
import { nextFromHandlerResult } from '@/lib/nextJsonHandler';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    const r = await postGenerateScript(body, userId);
    return nextFromHandlerResult(r);
  } catch (error) {
    console.error('Generate-script API error:', error);
    return nextFromHandlerResult({ status: 500, body: { error: 'Failed to generate script' } });
  }
}
