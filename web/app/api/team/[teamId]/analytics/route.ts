export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { backendHttpOrigin } from '@/lib/backendHttpOrigin';

const API_BASE = backendHttpOrigin();

type RouteContext = { params: { teamId: string } };

export const runtime = 'nodejs';

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { teamId } = context.params;
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const res = await fetch(
      `${API_BASE}/team/${encodeURIComponent(teamId)}/analytics?userId=${encodeURIComponent(userId)}`,
      { method: 'GET', headers: { 'Content-Type': 'application/json' } }
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Team analytics API error:', error);
    return NextResponse.json({ error: 'Failed to fetch team analytics' }, { status: 500 });
  }
}
