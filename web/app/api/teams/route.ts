export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { auth } from '../../../auth';
import { getTeams, postTeams } from '@server/api/handlers/teams';
import { nextFromHandlerResult } from '@/lib/nextJsonHandler';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const r = await getTeams(userId);
    return nextFromHandlerResult(r);
  } catch (error) {
    console.error('Teams API error:', error);
    return nextFromHandlerResult({ status: 500, body: { error: 'Failed to fetch teams' } });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    body.userId = userId;
    const r = await postTeams(body);
    return nextFromHandlerResult(r);
  } catch (error) {
    console.error('Teams API error:', error);
    return nextFromHandlerResult({ status: 500, body: { error: 'Failed to create team' } });
  }
}
