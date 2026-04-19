export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import { postUserBillingCheckoutSession } from '@server/api/handlers/billing';
import { nextFromHandlerResult } from '@/lib/nextJsonHandler';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    body.userId = userId;
    const r = await postUserBillingCheckoutSession(body);
    return nextFromHandlerResult(r);
  } catch (error) {
    console.error('Billing checkout-session API error:', error);
    return nextFromHandlerResult({ status: 500, body: { error: 'Failed to create checkout session' } });
  }
}
