'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { messageForMagicLinkSignInFailure } from '../../../lib/magicLinkClientMessages';

const NAVY_ACCENT = '#1e3a5f';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSent(false);
    const value = email.trim();
    if (!value) return;

    setSending(true);
    try {
      const res = await signIn('email', { email: value, callbackUrl: '/', redirect: false });
      if (!res?.ok || res.error) {
        setError(messageForMagicLinkSignInFailure(res?.error, res?.code));
      } else {
        setSent(true);
      }
    } catch (err) {
      console.error(err);
      setError('Could not send the sign-in link. Check the server terminal and try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
        <h1 className="text-xl font-semibold">Sign in</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Enter your email and we&apos;ll send you a magic link.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <label className="block">
            <span className="text-xs text-zinc-400 mb-1 block">Email</span>
            <input
              type="email"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              autoComplete="email"
              disabled={sending}
            />
          </label>

          {error ? (
            <div className="text-sm text-red-300">{error}</div>
          ) : sent ? (
            <div className="text-sm text-emerald-300">Magic link sent. Check your email.</div>
          ) : null}

          <button
            type="submit"
            className="w-full px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: NAVY_ACCENT }}
            disabled={sending || !email.trim()}
          >
            {sending ? 'Sending…' : 'Send magic link'}
          </button>
        </form>

        <div className="mt-6 border-t border-zinc-800 pt-4 flex items-center justify-between">
          <p className="text-xs text-zinc-500">New here?</p>
          <Link
            className="text-sm text-zinc-200 hover:text-white underline"
            href="/auth/register"
          >
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
}

