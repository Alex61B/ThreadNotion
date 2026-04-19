---
name: domain-repo-architecture
description: Use when navigating or modifying ThreadNotion's monorepo layout, deployment config, or top-level data model concepts.
---

- Monorepo: `web/` (Next.js 14, app router) + shared server modules in `src/` + Prisma schema at repo root
- Prisma client output: `../generated/prisma` — import from there, not `@prisma/client` directly
- Prisma pinned to v6; Node 20.19.0 on Render; schema path must be passed explicitly on deploy
- `web/app/api/` route handlers enforce NextAuth and call `@server/*` (path alias → `src/`)
- Business logic lives in `src/services/` and `src/api/handlers/` orchestration — keep route files thin
- Key models: Conversation (central), Message, Persona, Product, Script, SimulationEvaluationSummary, User, Team, BillingAccount
- `generated/prisma` is gitignored — always regenerate after schema changes (`npx prisma generate`)
- `DATABASE_URL` for Postgres; optional `INTERNAL_CRON_SECRET` for scheduled `POST /api/internal/grace-sweep`
- Auth is enforced in the Next.js route layer — pass `session.user.id` into handlers, never trust client `userId`
- Optional legacy Express entry: `src/server.ts` (tests / local); production API is Next-only
- Billing models (BillingAccount, Subscription, Entitlement, TokenUsageDaily) are live in schema — not planned
- `SalesSkill` enum: discovery_questions, objection_handling, product_knowledge, closing, storytelling, empathy
