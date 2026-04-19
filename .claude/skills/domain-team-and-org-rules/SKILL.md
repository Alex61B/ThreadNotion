---
name: domain-team-and-org-rules
description: Use when working with team membership, org access control, billing entitlements, seat limits, or token quotas.
---

- `Team` is owned by `ownerId`; members are `TeamMember` rows with role `manager` or `rep`
- Always verify a `TeamMember` row exists for the acting userId before serving any team-scoped data
- `TrainingAssignment` is scoped to `teamId` — never expose assignments across team boundaries
- `BillingAccount` can be `USER` or `TEAM` type — billing routes differ by type (`/api/billing/` vs `/api/team/[teamId]/billing/`)
- `Entitlement` controls `maxSeats`, `dailyTokenLimit`, `freeSimulationLimit` — check before allowing actions that consume quota
- `TokenUsageDaily` tracks usage per scope (`USER` or `TEAM`) and date — quota enforcement reads this
- `UserSimulationUsage` tracks free-tier simulation count per user — gate free users at `freeSimulationLimit`
- `SubscriptionStatus` gates feature access: only `ACTIVE` (and grace-period `PAST_DUE`) should have full access
- `AccountRole` on `User` (`MANAGER` | `SALES_REP`) gates team management actions — check at the route level
- Team membership checks are server-side only — never trust client-provided teamId as proof of membership
- `Subscription.cancelAtPeriodEnd` and `gracePeriodEndsAt` must be respected in entitlement checks
- Billing event log (`BillingEventLog`) is append-only — never modify existing entries
