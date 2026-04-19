export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { resolveBackendHttpOrigin } from '@/lib/backendHttpOrigin';

export const runtime = 'nodejs';

const LOG = '[threadnotion:health-proxy]';

function connectivityDebug(): boolean {
  const v = process.env.BACKEND_CONNECTIVITY_DEBUG;
  return v === '1' || v === 'true' || v === 'yes';
}

export async function GET() {
  const { origin, source } = resolveBackendHttpOrigin();
  const verbose = connectivityDebug();
  const startedAt = Date.now();

  if (verbose) {
    console.log(
      LOG,
      JSON.stringify({
        step: 'resolve',
        envSource: source,
        resolvedOrigin: origin,
        renderPort: process.env.PORT ?? null,
        nodeEnv: process.env.NODE_ENV ?? null,
      })
    );
  }

  try {
    const upstreamUrl = `${origin}/health`;
    const res = await fetch(upstreamUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    const text = await res.text();
    const elapsedMs = Date.now() - startedAt;

    let data: unknown;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      console.error(
        LOG,
        JSON.stringify({
          step: 'upstream_non_json',
          envSource: source,
          resolvedOrigin: origin,
          upstreamUrl,
          upstreamStatus: res.status,
          bodyPreview: text.slice(0, 800),
          elapsedMs,
        })
      );
      return NextResponse.json(
        { ok: false, error: 'Backend returned non-JSON for /health', status: res.status },
        { status: 502 }
      );
    }

    const bodyPreview = text.slice(0, 800);

    if (!res.ok) {
      console.error(
        LOG,
        JSON.stringify({
          step: 'upstream_not_ok',
          envSource: source,
          resolvedOrigin: origin,
          upstreamUrl,
          upstreamStatus: res.status,
          bodyPreview,
          parsedOk:
            typeof data === 'object' && data !== null && 'ok' in data ? (data as { ok?: boolean }).ok : undefined,
          elapsedMs,
        })
      );
      return NextResponse.json(
        typeof data === 'object' && data !== null ? data : { ok: false, error: 'Upstream /health failed' },
        { status: 502 }
      );
    }

    console.log(
      LOG,
      JSON.stringify({
        step: 'upstream_ok',
        envSource: source,
        resolvedOrigin: origin,
        upstreamStatus: res.status,
        elapsedMs,
        ...(verbose ? { bodyPreview } : {}),
      })
    );

    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    console.error(
      LOG,
      JSON.stringify({
        step: 'upstream_fetch_error',
        envSource: source,
        resolvedOrigin: origin,
        upstreamUrl: `${origin}/health`,
        error: err,
        elapsedMs: Date.now() - startedAt,
      })
    );
    return NextResponse.json({ ok: false, error: 'Failed to reach backend /health' }, { status: 502 });
  }
}
