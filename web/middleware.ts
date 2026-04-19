import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { hasAnySessionCookieName } from '../src/webProxy/authHardening';

const PUBLIC_PATH_PREFIXES = ['/auth/signin', '/auth/register'];

function hasAuthSessionCookie(req: NextRequest): boolean {
  const names = req.cookies.getAll().map((c) => c.name);
  return hasAnySessionCookieName(names);
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/api/auth')) return NextResponse.next();
  // App Router API routes enforce auth inside route handlers (e.g. auth()). Do not redirect to HTML sign-in here:
  // client fetch() would follow redirect and break response.json(), showing a misleading "Failed to load billing".
  if (pathname.startsWith('/api/')) return NextResponse.next();
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

