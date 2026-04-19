export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { getTeamMemberProgress } from '@server/api/handlers/training';
import { nextFromHandlerResult } from '@/lib/nextJsonHandler';

export const runtime = 'nodejs';

type Params = { params: { teamId: string } };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const memberUserId = request.nextUrl.searchParams.get('memberUserId');
    if (!memberUserId) {
      return NextResponse.json({ error: 'memberUserId query parameter required' }, { status: 400 });
    }
    const r = await getTeamMemberProgress(params.teamId, userId, memberUserId);
    return nextFromHandlerResult(r);
  } catch (error) {
    console.error('Team member progress API error:', error);
    return nextFromHandlerResult({ status: 500, body: { error: 'Failed to fetch member progress' } });
  }
}
