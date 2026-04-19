export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { backendHttpOrigin } from '@/lib/backendHttpOrigin';

const API_BASE = backendHttpOrigin();

export const runtime = 'nodejs';

export async function GET() {
  try {
    const res = await fetch(`${API_BASE}/products`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    const text = await res.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      return NextResponse.json(
        { ok: false, error: 'Backend returned non-JSON for /products', status: res.status },
        { status: 502 }
      );
    }
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    console.error('Products proxy error:', e);
    return NextResponse.json({ ok: false, error: 'Failed to reach backend /products' }, { status: 502 });
  }
}