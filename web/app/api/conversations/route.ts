import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch('http://localhost:3001/conversations', {
      // Add timeout
      signal: AbortSignal.timeout(10000),
    });
    
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: 'Backend returned error', conversations: [] },
        { status: res.status }
      );
    }
    
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Conversations API error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to connect to backend', conversations: [] },
      { status: 503 }
    );
  }
}