export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { auth } from '../../../auth';
import { listConversations } from '@server/api/handlers/conversations';
import { nextFromHandlerResult } from '@/lib/nextJsonHandler';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const r = await listConversations(userId);
    return nextFromHandlerResult(r);
  } catch (error) {
    console.error('Conversations API error:', error);
    return nextFromHandlerResult({
      status: 500,
      body: { ok: false, error: 'Failed to fetch conversations' },
    });
  }
}
