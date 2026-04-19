export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { getTeamMembers, postTeamMembers } from '@server/api/handlers/teams';
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
    const r = await getTeamMembers(params.teamId, userId);
    return nextFromHandlerResult(r);
  } catch (error) {
    console.error('Team members API error:', error);
    return nextFromHandlerResult({ status: 500, body: { error: 'Failed to fetch team members' } });
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const r = await postTeamMembers(params.teamId, userId, body);
    return nextFromHandlerResult(r);
  } catch (error) {
    console.error('Team members API error:', error);
    return nextFromHandlerResult({ status: 500, body: { error: 'Failed to add team member' } });
  }
}
