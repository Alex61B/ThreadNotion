'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { messageForMagicLinkSignInFailure } from '../../../lib/magicLinkClientMessages';

const NAVY_ACCENT = '#1e3a5f';

type Role = 'MANAGER' | 'SALES_REP';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('SALES_REP');
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
      const intentRes = await fetch('/api/auth/register-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: value, role }),
      });
      if (intentRes.status === 409) {
        setError('An account with this email already exists. Please sign in instead.');
        return;
      }

      const intentBody = (await intentRes.json().catch(() => ({}))) as {
        code?: string;
        error?: string;
      };

      if (!intentRes.ok) {
        if (intentBody.code === 'VALIDATION') {
          setError('That email or role is not valid. Check your input and try again.');
        } else if (intentBody.code === 'DATABASE') {
          setError(
            'We could not save your signup request. Check that the database is running and migrations are applied, then see the server terminal for details.'
          );
        } else if (intentBody.code === 'MISSING_DATABASE_URL') {
          setError(
            'The web app is missing DATABASE_URL. Add it to web/.env.local (or your Next.js env file), not only the repo root .env.'
          );
        } else {
          setError('Could not start account creation. Please try again.');
        }
        return;
      }

      const res = await signIn('email', { email: value, callbackUrl: '/', redirect: false });
      if (!res?.ok || res.error) {
        setError(messageForMagicLinkSignInFailure(res?.error, res?.code));
      } else {
        setSent(true);
      }
    } catch (err) {
      console.error(err);
      setError('Something went wrong while creating your account. Check the server terminal and try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
        <h1 className="text-xl font-semibold">Create account</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Choose your role. You&apos;ll finish signup by clicking the magic link sent to your email.
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

          <label className="block">
            <span className="text-xs text-zinc-400 mb-1 block">Role</span>
            <select
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              disabled={sending}
            >
              <option value="SALES_REP">Sales Rep</option>
              <option value="MANAGER">Manager</option>
            </select>
            <p className="text-xs text-zinc-500 mt-1.5 leading-snug">
              Managers can create teams and assign training. Sales reps use ThreadNotion for individual practice.
            </p>
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
            {sending ? 'Sending…' : 'Create account / Send magic link'}
          </button>
        </form>

        <div className="mt-6 border-t border-zinc-800 pt-4 flex items-center justify-between">
          <p className="text-xs text-zinc-500">Already have an account?</p>
          <Link className="text-sm text-zinc-200 hover:text-white underline" href="/auth/signin">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

