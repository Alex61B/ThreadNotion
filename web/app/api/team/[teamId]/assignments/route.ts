import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type RouteContext = { params: { teamId: string } };

export const runtime = 'nodejs';

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { teamId } = context.params;
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    // Backend expects CreateAssignmentBodySchema: includes userId (acting user).
    body.userId = userId;
    const res = await fetch(`${API_BASE}/team/${encodeURIComponent(teamId)}/assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Team assignments API error:', error);
    return NextResponse.json({ error: 'Failed to create assignment' }, { status: 500 });
  }
}
