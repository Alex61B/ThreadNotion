export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import { prisma } from '../../../../lib/prisma';
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

    // Backend portal endpoint currently requires stripeCustomerId in the body.
    const acct = await prisma.billingAccount.findUnique({ where: { userId } });
    if (!acct) {
      return NextResponse.json({ error: 'No billing account for user' }, { status: 400 });
    }

    const res = await fetch(`${API_BASE}/api/billing/portal-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stripeCustomerId: acct.stripeCustomerId }),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Billing portal-session API error:', error);
    return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 });
  }
}

