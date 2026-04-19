import { NextResponse } from 'next/server';
import type { JsonHandlerResult } from '@server/api/httpTypes';

export function nextFromHandlerResult(r: JsonHandlerResult): NextResponse {
  return NextResponse.json(r.body, { status: r.status });
}
