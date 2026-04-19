export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { auth } from '../../../../../../auth';
import { getTeamBillingInvoices } from '@server/api/handlers/billing';
import { nextFromHandlerResult } from '@/lib/nextJsonHandler';

export const runtime = 'nodejs';

type Params = { params: { teamId: string } };

export async function GET(_request: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const r = await getTeamBillingInvoices(params.teamId, session.user.id);
    return nextFromHandlerResult(r);
  } catch (error) {
    console.error('Team billing invoices API error:', error);
    return nextFromHandlerResult({ status: 500, body: { error: 'Failed to fetch team invoices' } });
  }
}
