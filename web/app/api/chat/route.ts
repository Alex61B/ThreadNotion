export const dynamic = 'force-dynamic';

// import { NextResponse } from 'next/server';

// export async function POST(req: Request) {
//   const body = await req.json();

//   const res = await fetch('http://localhost:3001/chat', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(body),
//   });

//   const data = await res.json();
//   return NextResponse.json(data);
// }
// web/app/api/chat/route.ts
// This is a Next.js API route that proxies chat requests to the backend
// UPDATED: Now forwards userId for user tracking

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../auth';
import { backendHttpOrigin } from '@/lib/backendHttpOrigin';

const API_BASE = backendHttpOrigin();

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    // Never trust client-provided userId.
    body.userId = userId;

    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
