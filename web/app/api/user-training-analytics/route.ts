export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { auth } from '../../../auth';
import { getUserTrainingAnalytics } from '@server/api/handlers/training';
import { nextFromHandlerResult } from '@/lib/nextJsonHandler';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const r = await getUserTrainingAnalytics(userId);
    return nextFromHandlerResult(r);
  } catch (error) {
    console.error('User training analytics API error:', error);
    return nextFromHandlerResult({ status: 500, body: { error: 'Failed to fetch training analytics' } });
  }
}
