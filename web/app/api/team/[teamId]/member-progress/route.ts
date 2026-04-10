import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { deriveActingUserId } from '../../../../../../src/webProxy/authHardening';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type RouteContext = { params: { teamId: string } };

export const runtime = 'nodejs';

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { teamId } = context.params;
    const { searchParams } = new URL(request.url);
    const session = await auth();
    const clientUserId = searchParams.get('userId');
    const userId = deriveActingUserId({ session, clientProvidedUserId: clientUserId });
    const memberUserId = searchParams.get('memberUserId');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!memberUserId) {
      return NextResponse.json(
        { error: 'memberUserId query parameter required' },
        { status: 400 }
      );
    }
    const q = new URLSearchParams({
      userId,
      memberUserId,
    });
    const res = await fetch(
      `${API_BASE}/team/${encodeURIComponent(teamId)}/member-progress?${q.toString()}`,
      { method: 'GET', headers: { 'Content-Type': 'application/json' } }
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Team member progress API error:', error);
    return NextResponse.json({ error: 'Failed to fetch member progress' }, { status: 500 });
  }
}
