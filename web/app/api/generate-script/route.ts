export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { backendHttpOrigin } from '@/lib/backendHttpOrigin';

export async function POST(req: Request) {
  const body = await req.json();

  const res = await fetch(`${backendHttpOrigin()}/generate-script`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return NextResponse.json(data);
}