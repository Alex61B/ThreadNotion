export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { postTeamAssignment } from '@server/api/handlers/training';
import { nextFromHandlerResult } from '@/lib/nextJsonHandler';

export const runtime = 'nodejs';

type Params = { params: { teamId: string } };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = (await request.json()) as Record<string, unknown>;
    body.userId = userId;
    const r = await postTeamAssignment(params.teamId, body);
    return nextFromHandlerResult(r);
  } catch (error) {
    console.error('Team assignments API error:', error);
    return nextFromHandlerResult({ status: 500, body: { error: 'Failed to create assignment' } });
  }
}
