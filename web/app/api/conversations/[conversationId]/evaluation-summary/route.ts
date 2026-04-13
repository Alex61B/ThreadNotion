export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function GET(
  _request: NextRequest,
  context: { params: { conversationId: string } }
) {
  try {
    const { conversationId } = context.params;
    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId required' }, { status: 400 });
    }

    const res = await fetch(
      `${API_BASE}/conversations/${encodeURIComponent(conversationId)}/evaluation-summary`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Evaluation summary API error:', error);
    return NextResponse.json({ error: 'Failed to fetch evaluation summary' }, { status: 500 });
  }
}
