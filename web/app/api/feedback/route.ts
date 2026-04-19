export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { auth } from '../../../auth';
import { postFeedback } from '@server/api/handlers/feedback';
import { nextFromHandlerResult } from '@/lib/nextJsonHandler';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const r = await postFeedback(body);
    return nextFromHandlerResult(r);
  } catch (error) {
    console.error('Feedback API error:', error);
    return nextFromHandlerResult({ status: 500, body: { error: 'Failed to submit feedback' } });
  }
}
