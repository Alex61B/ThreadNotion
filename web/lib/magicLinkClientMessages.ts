/**
 * Maps Auth.js client `error` / `code` query params (from signIn redirect URL) to safe UI copy.
 * Email send failures often surface as `Configuration` because EmailSignInError is not client-exposed.
 */

export function messageForMagicLinkSignInFailure(
  error: string | undefined | null,
  code: string | undefined | null
): string {
  const e = error ?? undefined;
  const c = code ?? undefined;

  if (e === 'AccessDenied') {
    return 'Sign-in was denied. If this keeps happening, contact support.';
  }
  if (e === 'Verification') {
    return 'This sign-in link is invalid or has expired. Request a new magic link.';
  }
  if (e === 'Configuration') {
    return 'We could not send the magic link. Check email (SMTP) settings and AUTH_SECRET / AUTH_URL (or NEXTAUTH_URL) in the environment, then see the server terminal for details.';
  }
  if (e === 'MissingCSRF') {
    return 'Sign-in could not continue for security reasons. Refresh the page and try again.';
  }

  if (e || c) {
    return 'We could not send the magic link. Check the server terminal for details and verify email configuration.';
  }

  return 'We could not send the magic link. Please try again.';
}
