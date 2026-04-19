export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import { backendHttpOrigin } from '@/lib/backendHttpOrigin';

const API_BASE = backendHttpOrigin();

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cookie = request.headers.get('cookie') ?? undefined;
    const res = await fetch(`${API_BASE}/api/billing/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(cookie ? { cookie } : {}),
      },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Billing status API error:', error);
    return NextResponse.json({ error: 'Failed to fetch billing status' }, { status: 500 });
  }
}

