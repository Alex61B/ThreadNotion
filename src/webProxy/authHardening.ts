export type MinimalSession = { user?: { id?: string | null } | null } | null | undefined;

/**
 * Always prefer authenticated session identity over any client-provided userId.
 * This makes it easy to harden proxy routes against forged query/body userId.
 */
export function deriveActingUserId(args: {
  session: MinimalSession;
  clientProvidedUserId?: string | null;
}): string | null {
  const sessionUserId = args.session?.user?.id ?? null;
  if (typeof sessionUserId === 'string' && sessionUserId.trim()) return sessionUserId;
  return null;
}

export function hasAuthSessionCookie(hasCookie: (name: string) => boolean): boolean {
  return (
    hasCookie('authjs.session-token') ||
    hasCookie('__Secure-authjs.session-token') ||
    hasCookie('next-auth.session-token') ||
    hasCookie('__Secure-next-auth.session-token')
  );
}

