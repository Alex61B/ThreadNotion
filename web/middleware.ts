import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { hasAuthSessionCookie as hasAuthSessionCookieFromHelpers } from '../src/webProxy/authHardening';

const PUBLIC_PATH_PREFIXES = ['/auth/signin', '/auth/register'];

function hasAuthSessionCookie(req: NextRequest): boolean {
  return hasAuthSessionCookieFromHelpers((name) => req.cookies.has(name));
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/api/auth')) return NextResponse.next();
  if (pathname.startsWith('/_next')) return NextResponse.next();
  if (pathname === '/favicon.ico') return NextResponse.next();
  if (PUBLIC_PATH_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();

  if (!hasAuthSessionCookie(req)) {
    const url = new URL('/auth/signin', req.url);
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};

