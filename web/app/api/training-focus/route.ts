export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { auth } from '../../../auth';
import {
  deleteTrainingFocus,
  getTrainingFocus,
  patchTrainingFocus,
} from '@server/api/handlers/training';
import { nextFromHandlerResult } from '@/lib/nextJsonHandler';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const r = await getTrainingFocus(userId);
    return nextFromHandlerResult(r);
  } catch (error) {
    console.error('Training focus API error:', error);
    return nextFromHandlerResult({ status: 500, body: { error: 'Failed to fetch training focus' } });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const r = await patchTrainingFocus(userId, body);
    return nextFromHandlerResult(r);
  } catch (error) {
    console.error('Training focus API error:', error);
    return nextFromHandlerResult({ status: 500, body: { error: 'Failed to update training focus' } });
  }
}

export async function DELETE() {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const r = await deleteTrainingFocus(userId);
    return nextFromHandlerResult(r);
  } catch (error) {
    console.error('Training focus API error:', error);
    return nextFromHandlerResult({ status: 500, body: { error: 'Failed to clear training focus' } });
  }
}
