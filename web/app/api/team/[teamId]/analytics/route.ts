export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { getTeamAnalytics } from '@server/api/handlers/training';
import { nextFromHandlerResult } from '@/lib/nextJsonHandler';

export const runtime = 'nodejs';

type Params = { params: { teamId: string } };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const r = await getTeamAnalytics(params.teamId, userId);
    return nextFromHandlerResult(r);
  } catch (error) {
    console.error('Team analytics API error:', error);
    return nextFromHandlerResult({ status: 500, body: { error: 'Failed to fetch team analytics' } });
  }
}
