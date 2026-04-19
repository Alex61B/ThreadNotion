---
name: domain-repo-architecture
description: Use when navigating or modifying ThreadNotion's monorepo layout, deployment config, or top-level data model concepts.
---

- Monorepo: `web/` (Next.js 14, app router) + `src/` (Express on :3001) + Prisma schema at repo root
- Prisma client output: `../generated/prisma` — import from there, not `@prisma/client` directly
- Prisma pinned to v6; Node 20.19.0 on Render; schema path must be passed explicitly on deploy
- `web/app/api/` routes are thin proxies: enforce auth, strip client identity, forward to Express
- Business logic lives in `src/services/` — route handlers never own logic
- Key models: Conversation (central), Message, Persona, Product, Script, SimulationEvaluationSummary, User, Team, BillingAccount
- `generated/prisma` is gitignored — always regenerate after schema changes (`npx prisma generate`)
- `DATABASE_URL` for Postgres; `NEXT_PUBLIC_API_URL` defaults to `http://localhost:3001`
- Auth is enforced in the Next.js layer — Express receives userId already validated by the proxy
- Top-level `src/server.ts` registers all Express routes; `web/app/api/` registers all Next.js routes
- Billing models (BillingAccount, Subscription, Entitlement, TokenUsageDaily) are live in schema — not planned
- `SalesSkill` enum: discovery_questions, objection_handling, product_knowledge, closing, storytelling, empathy
