export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../auth';
import { postChat } from '@server/api/handlers/chat';
import { nextFromHandlerResult } from '@/lib/nextJsonHandler';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    body.userId = userId;

    const r = await postChat(body);
    return nextFromHandlerResult(r);
  } catch (error) {
    console.error('Chat API error:', error);
    return nextFromHandlerResult({ status: 500, body: { error: 'Failed to send message' } });
  }
}
