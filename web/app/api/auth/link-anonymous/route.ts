import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '../../../../auth';
import { prisma } from '../../../../lib/prisma';
import { linkAnonymousToAuth } from '../../../../../src/services/anonymousUserLinkService';

export const runtime = 'nodejs';

const BodySchema = z.object({
  anonymousUserId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  const authUserId = session?.user?.id;
  if (!authUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const result = await linkAnonymousToAuth(prisma as never, {
    anonymousUserId: parsed.data.anonymousUserId,
    authUserId,
  });
  return NextResponse.json(result);
}

