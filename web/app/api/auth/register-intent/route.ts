import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '../../../../../generated/prisma';
import { prisma } from '../../../../lib/prisma';

export const runtime = 'nodejs';

const BodySchema = z.object({
  email: z.string().email(),
  role: z.enum(['MANAGER', 'SALES_REP']),
});

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function logRegisterIntentDbError(e: unknown): void {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    console.error('[auth:register-intent] Prisma request error', {
      kind: 'PrismaClientKnownRequestError',
      prismaCode: e.code,
      meta: e.meta,
      message: e.message,
    });
    return;
  }
  if (e instanceof Prisma.PrismaClientInitializationError) {
    console.error('[auth:register-intent] Prisma initialization (connection or DATABASE_URL)', {
      kind: 'PrismaClientInitializationError',
      errorCode: e.errorCode,
      message: e.message,
    });
    return;
  }
  if (e instanceof Prisma.PrismaClientRustPanicError) {
    console.error('[auth:register-intent] Prisma engine error', {
      kind: 'PrismaClientRustPanicError',
      message: e.message,
    });
    return;
  }
  if (e instanceof Prisma.PrismaClientUnknownRequestError) {
    console.error('[auth:register-intent] Prisma unknown request error', {
      kind: 'PrismaClientUnknownRequestError',
      message: e.message,
    });
    return;
  }
  if (e instanceof Prisma.PrismaClientValidationError) {
    console.error('[auth:register-intent] Prisma validation error', {
      kind: 'PrismaClientValidationError',
      message: e.message,
    });
    return;
  }
  if (e instanceof Error) {
    console.error('[auth:register-intent] database error', {
      kind: e.name,
      message: e.message,
    });
    return;
  }
  console.error('[auth:register-intent] unknown error', e);
}

export async function POST(req: NextRequest) {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error(
      '[auth:register-intent] DATABASE_URL is not set in this Node process (Next.js loads .env.local from the web/ folder)'
    );
    return NextResponse.json(
      {
        error: 'Database is not configured for the web app.',
        code: 'MISSING_DATABASE_URL',
      },
      { status: 503 }
    );
  }

  try {
    const json = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      console.warn('[auth:register-intent] validation failed', parsed.error.flatten());
      return NextResponse.json(
        { error: 'Invalid email or role.', code: 'VALIDATION' },
        { status: 400 }
      );
    }

    const email = normalizeEmail(parsed.data.email);
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: 'Account already exists. Please sign in.' },
        { status: 409 }
      );
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 1000 * 60 * 30); // 30 minutes

    await prisma.signUpIntent.create({
      data: {
        email,
        role: parsed.data.role,
        expiresAt,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    logRegisterIntentDbError(e);
    return NextResponse.json(
      { error: 'Could not save signup request.', code: 'DATABASE' },
      { status: 500 }
    );
  }
}
