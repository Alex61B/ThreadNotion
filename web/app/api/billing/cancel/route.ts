export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import { postUserBillingCancel } from '@server/api/handlers/billing';
import { nextFromHandlerResult } from '@/lib/nextJsonHandler';

export const runtime = 'nodejs';

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const r = await postUserBillingCancel(session.user.id);
    return nextFromHandlerResult(r);
  } catch (error) {
    console.error('Billing cancel API error:', error);
    return nextFromHandlerResult({ status: 500, body: { error: 'Failed to cancel subscription' } });
  }
}
