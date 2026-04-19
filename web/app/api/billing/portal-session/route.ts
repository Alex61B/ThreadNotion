export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import { prisma } from '@/lib/prisma';
import { postUserBillingPortalSession } from '@server/api/handlers/billing';
import { nextFromHandlerResult } from '@/lib/nextJsonHandler';

export const runtime = 'nodejs';

export async function POST() {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const acct = await prisma.billingAccount.findUnique({ where: { userId } });
    if (!acct) {
      return NextResponse.json({ error: 'No billing account for user' }, { status: 400 });
    }

    const r = await postUserBillingPortalSession({ stripeCustomerId: acct.stripeCustomerId });
    return nextFromHandlerResult(r);
  } catch (error) {
    console.error('Billing portal-session API error:', error);
    return nextFromHandlerResult({ status: 500, body: { error: 'Failed to create portal session' } });
  }
}
