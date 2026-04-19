export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import { getUserBillingInvoices } from '@server/api/handlers/billing';
import { nextFromHandlerResult } from '@/lib/nextJsonHandler';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const r = await getUserBillingInvoices(session.user.id);
    return nextFromHandlerResult(r);
  } catch (error) {
    console.error('Billing invoices API error:', error);
    return nextFromHandlerResult({ status: 500, body: { error: 'Failed to fetch invoices' } });
  }
}
