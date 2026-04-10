import { describe, it, expect } from 'vitest';
import { deriveActingUserId, hasAuthSessionCookie } from './authHardening';

describe('webProxy auth hardening helpers', () => {
  it('deriveActingUserId prefers session user id over client userId', () => {
    expect(
      deriveActingUserId({ session: { user: { id: 'auth-1' } }, clientProvidedUserId: 'evil' })
    ).toBe('auth-1');
  });

  it('deriveActingUserId returns null when unauthenticated', () => {
    expect(deriveActingUserId({ session: null, clientProvidedUserId: 'evil' })).toBeNull();
  });

  it('hasAuthSessionCookie checks known cookie names', () => {
    const has = (name: string) => name === '__Secure-authjs.session-token';
    expect(hasAuthSessionCookie(has)).toBe(true);
  });
});

