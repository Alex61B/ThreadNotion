export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../../auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type RouteContext = { params: { teamId: string } };

export const runtime = 'nodejs';

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cookie = request.headers.get('cookie') ?? undefined;
    const teamId = context.params.teamId;
    const res = await fetch(`${API_BASE}/api/team/${encodeURIComponent(teamId)}/billing/portal-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cookie ? { cookie } : {}),
      },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Team billing portal-session API error:', error);
    return NextResponse.json({ error: 'Failed to create team portal session' }, { status: 500 });
  }
}

