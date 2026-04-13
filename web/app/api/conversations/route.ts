export const dynamic = 'force-dynamic';

// import { NextResponse } from 'next/server';

// export async function GET() {
//   try {
//     const res = await fetch('http://localhost:3001/conversations', {
//       // Add timeout
//       signal: AbortSignal.timeout(10000),
//     });
    
//     if (!res.ok) {
//       return NextResponse.json(
//         { ok: false, error: 'Backend returned error', conversations: [] },
//         { status: res.status }
//       );
//     }
    
//     const data = await res.json();
//     return NextResponse.json(data);
//   } catch (error) {
//     console.error('Conversations API error:', error);
//     return NextResponse.json(
//       { ok: false, error: 'Failed to connect to backend', conversations: [] },
//       { status: 503 }
//     );
//   }
// }

// web/app/api/conversations/route.ts
// This is a Next.js API route that proxies requests to the backend
// UPDATED: Now forwards userId query param for filtering

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Build the backend URL with userId if provided
    let backendUrl = `${API_BASE}/conversations`;
    backendUrl += `?userId=${encodeURIComponent(userId)}`;

    const res = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Conversations API error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}
