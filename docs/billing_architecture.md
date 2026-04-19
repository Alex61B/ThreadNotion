## Billing System Architecture Summary

### 1) Billing state machine

- **Stripe subscription statuses (inputs)**: `active`, `trialing`, `past_due`, `unpaid`, `canceled` (plus others treated as inactive).
- **Local `SubscriptionStatus`**:
  - **`ACTIVE`**: Stripe `active`/`trialing`
  - **`PAST_DUE`**: Stripe `past_due`/`unpaid` (payment failed; grace running)
  - **`SUSPENDED`**: grace expired without recovery
  - **`CANCELED`**: Stripe canceled
  - **`INACTIVE`**: default/unknown

- **Grace period lifecycle (USER + TEAM)**:
  - On `invoice.payment_failed`:
    - local subscription set to **`PAST_DUE`**
    - `gracePeriodEndsAt = now + 2 days`
    - entitlements remain **paid** during grace
  - On `invoice.payment_succeeded`:
    - local subscription set to **`ACTIVE`**
    - `gracePeriodEndsAt = null`
  - On grace expiry (sweeper):
    - local subscription becomes **`SUSPENDED`**
    - entitlement deterministically downgraded to **FREE**

### 2) Stripe webhook source-of-truth rules

- **Source of truth**: Stripe webhooks drive local subscription + entitlement state. Client redirects are not trusted for state changes.
- **Events handled**:
  - **`checkout.session.completed`**: creates/links BillingAccount (USER or TEAM) and creates a placeholder local Subscription row.
  - **`customer.subscription.created|updated|deleted`**: upserts local Subscription fields and updates Entitlement (USER or TEAM).
  - **`invoice.payment_failed`**: sets local subscription `PAST_DUE` + grace window and keeps paid entitlement.
  - **`invoice.payment_succeeded`**: returns subscription to `ACTIVE` and persists invoice.
  - **`invoice.finalized`**: persists invoice record (for listing/history).

- **Idempotency**:
  - `BillingEventLog.stripeEventId` is used as the dedupe key.
  - Webhook handler exits early if an event with the same `stripeEventId` has already been processed.

- **Database mapping**:
  - Webhooks update `Subscription` (by `billingAccountId`) and Entitlement snapshots (`Entitlement`) for runtime authorization/enforcement.

### 3) Entitlement precedence logic

- **Single source of truth** for enforcement: `Entitlement` rows.
- **Subjects**:
  - USER entitlements: `subjectType=USER`, `subjectId=userId`
  - TEAM entitlements: `subjectType=TEAM`, `subjectId=teamId`
- **Team vs individual**:
  - MVP assumption: a user belongs to **at most one team** (enforced in `addTeamMember`).
  - Coverage precedence: if the user is a member of a team with a **paid TEAM entitlement**, use TEAM coverage; otherwise use USER entitlement.
- **Token usage scope selection**:
  - Covered by TEAM entitlement → `TokenUsageDaily(scopeType=TEAM, scopeId=teamId)`
  - Otherwise → `TokenUsageDaily(scopeType=USER, scopeId=userId)`

### 4) Billing endpoints

#### Individual (session-scoped)
- `POST /api/billing/checkout-session`
- `POST /api/billing/portal-session`
- `POST /api/billing/cancel`
- `GET /api/billing/status`
- `GET /api/billing/invoices`

#### Team (admin-only)
- `POST /api/team/:teamId/billing/checkout-session`
- `POST /api/team/:teamId/billing/portal-session`
- `POST /api/team/:teamId/billing/cancel`
- `GET /api/team/:teamId/billing/status`
- `GET /api/team/:teamId/billing/invoices`

### 5) Enforcement architecture

- **Simulation cap enforcement**
  - Free tier: 5 simulations per user.
  - Enforced at `POST /chat` when creating a new conversation via an atomic counter in `UserSimulationUsage`.
  - Module: `src/usage/simulationCap.ts`

- **Token quota enforcement**
  - Enforced before LLM calls; usage is recorded only after successful LLM responses.
  - TEAM vs USER token scope is selected by effective coverage.
  - Module: `src/usage/quotaGuard.ts`

- **Team seat enforcement**
  - MVP: seats are derived from active `TeamMember` count.
  - When seats are full and the team is paid, new member activation is blocked and returns `409 TEAM_SEAT_LIMIT_REACHED`.
  - Enforced in `src/services/teamService.ts` (`addTeamMember`).

### 6) Usage accounting

- **Tokens**:
  - Stored in `TokenUsageDaily` with unique key `(scopeType, scopeId, dateUTC)`.
  - Daily token limits come from `Entitlement.dailyTokenLimit`.
  - Recorded using provider usage totals (`llm.chatWithUsage`).

- **Simulations**:
  - Free cap uses `UserSimulationUsage.uniqueSimulationsCount` incremented atomically.

### 7) Known MVP limitations + Phase 5 candidates

- **Refunds/credits**: no partial refunds / credits.
- **Seat fairness**: no explicit seat allocation; policy is “block joins at limit”.
- **Background job infrastructure**: grace sweeper runs in-process; long-term move to a dedicated scheduler/queue worker.
- **Invoice history richness**: stored minimally for listing; future improvement could include line items and better metadata.

