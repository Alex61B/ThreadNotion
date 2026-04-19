'use client';

import Link from 'next/link';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

type BillingStatusResponse =
  | { ok: true; plan: Record<string, any>; usage: Record<string, any> }
  | { error: string; details?: any };

type Invoice = {
  id: string;
  stripeInvoiceId: string;
  amountDue: number;
  amountPaid: number;
  currency: string;
  status: string;
  hostedInvoiceUrl?: string | null;
  invoicePdfUrl?: string | null;
  issuedAt: string;
};

type InvoicesResponse = { ok: true; invoices: Invoice[] } | { error: string; details?: any };

type Team = { id: string; name: string };

const NAVY_ACCENT = '#1e3a5f';
const NAVY_DARK = '#152a45';

async function readJsonResponse<T>(res: Response, label: string): Promise<{ ok: true; data: T } | { ok: false; message: string }> {
  const text = await res.text();
  if (!text.trim()) {
    return { ok: false, message: `${label}: empty body (HTTP ${res.status})` };
  }
  try {
    return { ok: true, data: JSON.parse(text) as T };
  } catch {
    const hint = text.trimStart().startsWith('<') ? ' (HTML — often a redirect or error page)' : '';
    return {
      ok: false,
      message: `${label}: expected JSON, got HTTP ${res.status}${hint}: ${text.slice(0, 120)}${text.length > 120 ? '…' : ''}`,
    };
  }
}

function formatMoney(amountMinor: number, currency: string) {
  const value = amountMinor / 100;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency.toUpperCase() }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency.toUpperCase()}`;
  }
}

export default function BillingPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [userStatus, setUserStatus] = useState<BillingStatusResponse | null>(null);
  const [userInvoices, setUserInvoices] = useState<InvoicesResponse | null>(null);

  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [teamStatus, setTeamStatus] = useState<BillingStatusResponse | null>(null);
  const [teamInvoices, setTeamInvoices] = useState<InvoicesResponse | null>(null);

  const [busyAction, setBusyAction] = useState<string | null>(null);

  const loadUser = useCallback(async (): Promise<string[]> => {
    const issues: string[] = [];
    const [statusRes, invoicesRes] = await Promise.all([
      fetch('/api/billing/status', { method: 'GET', credentials: 'same-origin' }),
      fetch('/api/billing/invoices', { method: 'GET', credentials: 'same-origin' }),
    ]);
    const statusParsed = await readJsonResponse<BillingStatusResponse>(statusRes, 'Billing status');
    const invoicesParsed = await readJsonResponse<InvoicesResponse>(invoicesRes, 'Invoices');
    if (!statusParsed.ok) issues.push(statusParsed.message);
    else setUserStatus(statusParsed.data);
    if (!invoicesParsed.ok) issues.push(invoicesParsed.message);
    else setUserInvoices(invoicesParsed.data);
    if (statusRes.status === 401 || invoicesRes.status === 401) {
      issues.push('Session expired or not authorized for billing (HTTP 401). Try signing out and back in.');
    }
    return issues;
  }, []);

  const loadTeams = useCallback(async (): Promise<string[]> => {
    const res = await fetch('/api/teams', { method: 'GET', credentials: 'same-origin' });
    const parsed = await readJsonResponse<any>(res, 'Teams');
    if (!parsed.ok) {
      setTeams([]);
      if (res.status === 401) return [parsed.message, 'Not signed in for teams (HTTP 401).'];
      return [parsed.message];
    }
    const json = parsed.data;
    const list: Team[] = Array.isArray(json) ? json : Array.isArray(json?.teams) ? json.teams : [];
    setTeams(list);
    if (!selectedTeamId && list.length > 0) setSelectedTeamId(list[0]!.id);
    return [];
  }, [selectedTeamId]);

  const loadTeamBilling = useCallback(
    async (teamId: string): Promise<string[]> => {
      const issues: string[] = [];
      const [statusRes, invoicesRes] = await Promise.all([
        fetch(`/api/team/${encodeURIComponent(teamId)}/billing/status`, { method: 'GET', credentials: 'same-origin' }),
        fetch(`/api/team/${encodeURIComponent(teamId)}/billing/invoices`, { method: 'GET', credentials: 'same-origin' }),
      ]);
      const statusParsed = await readJsonResponse<BillingStatusResponse>(statusRes, 'Team billing status');
      const invoicesParsed = await readJsonResponse<InvoicesResponse>(invoicesRes, 'Team invoices');
      if (!statusParsed.ok) issues.push(statusParsed.message);
      else setTeamStatus(statusParsed.data);
      if (!invoicesParsed.ok) issues.push(invoicesParsed.message);
      else setTeamInvoices(invoicesParsed.data);
      if (statusRes.status === 401 || invoicesRes.status === 401) {
        issues.push('Team billing: not authorized (HTTP 401). Team admins only.');
      }
      if (statusRes.status === 403 || invoicesRes.status === 403) {
        issues.push('Team billing: forbidden (HTTP 403). You may need team manager/owner access.');
      }
      return issues;
    },
    []
  );

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [userIssues, teamListIssues] = await Promise.all([loadUser(), loadTeams()]);
        const combined = [...userIssues, ...teamListIssues].filter(Boolean);
        if (combined.length > 0) setError(combined.join(' '));
      } catch (e) {
        console.error(e);
        setError(e instanceof Error ? e.message : 'Network error while loading billing.');
      } finally {
        setLoading(false);
      }
    })();
  }, [loadTeams, loadUser]);

  useEffect(() => {
    if (!selectedTeamId) {
      setTeamStatus(null);
      setTeamInvoices(null);
      return;
    }
    (async () => {
      try {
        const issues = await loadTeamBilling(selectedTeamId);
        if (issues.length > 0) setError((prev) => (prev ? `${prev} ${issues.join(' ')}` : issues.join(' ')));
      } catch (e) {
        console.error(e);
        setTeamStatus({ error: 'Failed to load team billing' });
        setTeamInvoices({ error: 'Failed to load team invoices' });
      }
    })();
  }, [loadTeamBilling, selectedTeamId]);

  const userPlanType = useMemo(() => (userStatus && 'ok' in userStatus && userStatus.ok ? userStatus.plan.planType : null), [
    userStatus,
  ]);

  async function startUserCheckout() {
    setBusyAction('user_checkout');
    try {
      const res = await fetch('/api/billing/checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planType: 'INDIVIDUAL' }),
      });
      const json = await res.json();
      const url = json?.checkoutUrl as string | undefined;
      if (!res.ok || !url) throw new Error(json?.error ?? 'Could not start checkout');
      window.location.href = url;
    } catch (e) {
      console.error(e);
      setError('Could not start checkout. Check server logs and Stripe config.');
    } finally {
      setBusyAction(null);
    }
  }

  async function openUserPortal() {
    setBusyAction('user_portal');
    try {
      const res = await fetch('/api/billing/portal-session', { method: 'POST' });
      const json = await res.json();
      const url = json?.portalUrl as string | undefined;
      if (!res.ok || !url) throw new Error(json?.error ?? 'Could not open portal');
      window.location.href = url;
    } catch (e) {
      console.error(e);
      setError('Could not open billing portal. Make sure you have an active billing account.');
    } finally {
      setBusyAction(null);
    }
  }

  async function cancelUserPlan() {
    setBusyAction('user_cancel');
    try {
      const res = await fetch('/api/billing/cancel', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'Cancel failed');
      await loadUser();
    } catch (e) {
      console.error(e);
      setError('Could not cancel subscription.');
    } finally {
      setBusyAction(null);
    }
  }

  async function startTeamCheckout(seatBundle: 10 | 25 | 50) {
    if (!selectedTeamId) return;
    setBusyAction(`team_checkout_${seatBundle}`);
    try {
      const res = await fetch(`/api/team/${encodeURIComponent(selectedTeamId)}/billing/checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seatBundle }),
      });
      const json = await res.json();
      const url = json?.checkoutUrl as string | undefined;
      if (!res.ok || !url) throw new Error(json?.error ?? 'Could not start team checkout');
      window.location.href = url;
    } catch (e) {
      console.error(e);
      setError('Could not start team checkout. Are you a team admin?');
    } finally {
      setBusyAction(null);
    }
  }

  async function openTeamPortal() {
    if (!selectedTeamId) return;
    setBusyAction('team_portal');
    try {
      const res = await fetch(`/api/team/${encodeURIComponent(selectedTeamId)}/billing/portal-session`, { method: 'POST' });
      const json = await res.json();
      const url = json?.portalUrl as string | undefined;
      if (!res.ok || !url) throw new Error(json?.error ?? 'Could not open portal');
      window.location.href = url;
    } catch (e) {
      console.error(e);
      setError('Could not open team billing portal. Are you a team admin?');
    } finally {
      setBusyAction(null);
    }
  }

  async function cancelTeamPlan() {
    if (!selectedTeamId) return;
    setBusyAction('team_cancel');
    try {
      const res = await fetch(`/api/team/${encodeURIComponent(selectedTeamId)}/billing/cancel`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'Cancel failed');
      await loadTeamBilling(selectedTeamId);
    } catch (e) {
      console.error(e);
      setError('Could not cancel team plan.');
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50">
      <header className="border-b border-zinc-800" style={{ backgroundColor: NAVY_DARK }}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Billing</h1>
            <p className="text-sm text-zinc-400 mt-1">Manage your plan, seats, and invoices.</p>
          </div>
          <Link
            href="/"
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-white border border-zinc-700 hover:bg-zinc-800"
          >
            Back to app
          </Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {error ? (
          <div className="rounded-xl border border-red-900/60 bg-red-950/40 p-4 text-sm text-red-200">{error}</div>
        ) : null}

        {loading ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 text-sm text-zinc-300">Loading…</div>
        ) : null}

        <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
          <h2 className="text-lg font-semibold">Personal billing</h2>
          <p className="text-sm text-zinc-400 mt-1">Your individual plan and invoices.</p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-4">
              <p className="text-xs text-zinc-400">Plan</p>
              <p className="text-sm mt-1">
                {userStatus && 'ok' in userStatus && userStatus.ok ? (
                  <span className="font-medium text-white">{String(userStatus.plan.planType ?? 'UNKNOWN')}</span>
                ) : (
                  <span className="text-zinc-400">Unavailable</span>
                )}
              </p>
              {userStatus && 'ok' in userStatus && userStatus.ok ? (
                <div className="mt-2 text-xs text-zinc-400 space-y-1">
                  <div>Daily token limit: {String(userStatus.plan.dailyTokenLimit ?? 0)}</div>
                  <div>Tokens used today: {String(userStatus.usage.tokensUsedToday ?? 0)}</div>
                  <div>Simulations used: {String(userStatus.usage.simulationsUsed ?? 0)}</div>
                </div>
              ) : null}
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-4">
              <p className="text-xs text-zinc-400">Actions</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={startUserCheckout}
                  disabled={busyAction != null}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-60"
                  style={{ backgroundColor: NAVY_ACCENT }}
                >
                  Upgrade / Subscribe
                </button>
                <button
                  type="button"
                  onClick={openUserPortal}
                  disabled={busyAction != null}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-white border border-zinc-700 hover:bg-zinc-800 disabled:opacity-60"
                >
                  Manage billing
                </button>
                <button
                  type="button"
                  onClick={cancelUserPlan}
                  disabled={busyAction != null || userPlanType === 'FREE'}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-white border border-zinc-700 hover:bg-zinc-800 disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
              <p className="mt-3 text-xs text-zinc-500">
                Stripe Checkout/Portal opens in the same tab. Cancellation takes effect per Stripe billing rules.
              </p>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-semibold text-zinc-200">Invoices</h3>
            <div className="mt-2 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-xs text-zinc-500">
                  <tr className="border-b border-zinc-800">
                    <th className="text-left py-2 pr-4">Date</th>
                    <th className="text-left py-2 pr-4">Status</th>
                    <th className="text-left py-2 pr-4">Amount</th>
                    <th className="text-left py-2 pr-4">Links</th>
                  </tr>
                </thead>
                <tbody>
                  {userInvoices && 'ok' in userInvoices && userInvoices.ok && userInvoices.invoices.length > 0 ? (
                    userInvoices.invoices.map((inv) => (
                      <tr key={inv.id} className="border-b border-zinc-900">
                        <td className="py-2 pr-4 text-zinc-200">
                          {inv.issuedAt ? new Date(inv.issuedAt).toLocaleDateString() : '—'}
                        </td>
                        <td className="py-2 pr-4 text-zinc-300">{inv.status}</td>
                        <td className="py-2 pr-4 text-zinc-300">{formatMoney(inv.amountDue, inv.currency)}</td>
                        <td className="py-2 pr-4 text-zinc-300 space-x-3">
                          {inv.hostedInvoiceUrl ? (
                            <a className="underline hover:text-white" href={inv.hostedInvoiceUrl} target="_blank" rel="noreferrer">
                              Hosted
                            </a>
                          ) : null}
                          {inv.invoicePdfUrl ? (
                            <a className="underline hover:text-white" href={inv.invoicePdfUrl} target="_blank" rel="noreferrer">
                              PDF
                            </a>
                          ) : null}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="py-3 text-zinc-500" colSpan={4}>
                        No invoices yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
          <h2 className="text-lg font-semibold">Team billing</h2>
          <p className="text-sm text-zinc-400 mt-1">Manage seats and invoices for a team (admin only).</p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="text-xs text-zinc-400">
              Team
              <select
                className="ml-2 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
              >
                <option value="">Select…</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {selectedTeamId ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-4">
                <p className="text-xs text-zinc-400">Plan</p>
                <p className="text-sm mt-1">
                  {teamStatus && 'ok' in teamStatus && teamStatus.ok ? (
                    <span className="font-medium text-white">{String(teamStatus.plan.planType ?? 'UNKNOWN')}</span>
                  ) : (
                    <span className="text-zinc-400">Unavailable</span>
                  )}
                </p>
                {teamStatus && 'ok' in teamStatus && teamStatus.ok ? (
                  <div className="mt-2 text-xs text-zinc-400 space-y-1">
                    <div>Max seats: {String(teamStatus.plan.maxSeats ?? 0)}</div>
                    <div>Active members: {String(teamStatus.usage.activeMembers ?? 0)}</div>
                    <div>Seats remaining: {String(teamStatus.usage.seatsRemaining ?? '—')}</div>
                    <div>Daily token limit: {String(teamStatus.plan.dailyTokenLimit ?? 0)}</div>
                  </div>
                ) : null}
              </div>

              <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-4">
                <p className="text-xs text-zinc-400">Actions</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => startTeamCheckout(10)}
                    disabled={busyAction != null}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-60"
                    style={{ backgroundColor: NAVY_ACCENT }}
                  >
                    Team 10
                  </button>
                  <button
                    type="button"
                    onClick={() => startTeamCheckout(25)}
                    disabled={busyAction != null}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-60"
                    style={{ backgroundColor: NAVY_ACCENT }}
                  >
                    Team 25
                  </button>
                  <button
                    type="button"
                    onClick={() => startTeamCheckout(50)}
                    disabled={busyAction != null}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-60"
                    style={{ backgroundColor: NAVY_ACCENT }}
                  >
                    Team 50
                  </button>
                  <button
                    type="button"
                    onClick={openTeamPortal}
                    disabled={busyAction != null}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-white border border-zinc-700 hover:bg-zinc-800 disabled:opacity-60"
                  >
                    Manage team billing
                  </button>
                  <button
                    type="button"
                    onClick={cancelTeamPlan}
                    disabled={busyAction != null}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-white border border-zinc-700 hover:bg-zinc-800 disabled:opacity-60"
                  >
                    Cancel team plan
                  </button>
                </div>
                <p className="mt-3 text-xs text-zinc-500">If you’re not a team admin, these calls will be rejected.</p>
              </div>
            </div>
          ) : (
            <div className="mt-4 text-sm text-zinc-500">No team selected.</div>
          )}

          {selectedTeamId ? (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-zinc-200">Team invoices</h3>
              <div className="mt-2 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-xs text-zinc-500">
                    <tr className="border-b border-zinc-800">
                      <th className="text-left py-2 pr-4">Date</th>
                      <th className="text-left py-2 pr-4">Status</th>
                      <th className="text-left py-2 pr-4">Amount</th>
                      <th className="text-left py-2 pr-4">Links</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamInvoices && 'ok' in teamInvoices && teamInvoices.ok && teamInvoices.invoices.length > 0 ? (
                      teamInvoices.invoices.map((inv) => (
                        <tr key={inv.id} className="border-b border-zinc-900">
                          <td className="py-2 pr-4 text-zinc-200">
                            {inv.issuedAt ? new Date(inv.issuedAt).toLocaleDateString() : '—'}
                          </td>
                          <td className="py-2 pr-4 text-zinc-300">{inv.status}</td>
                          <td className="py-2 pr-4 text-zinc-300">{formatMoney(inv.amountDue, inv.currency)}</td>
                          <td className="py-2 pr-4 text-zinc-300 space-x-3">
                            {inv.hostedInvoiceUrl ? (
                              <a className="underline hover:text-white" href={inv.hostedInvoiceUrl} target="_blank" rel="noreferrer">
                                Hosted
                              </a>
                            ) : null}
                            {inv.invoicePdfUrl ? (
                              <a className="underline hover:text-white" href={inv.invoicePdfUrl} target="_blank" rel="noreferrer">
                                PDF
                              </a>
                            ) : null}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="py-3 text-zinc-500" colSpan={4}>
                          No invoices yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

