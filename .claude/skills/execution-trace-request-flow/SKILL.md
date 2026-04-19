---
name: execution-trace-request-flow
description: Use when tracing how a request flows through the stack, finding where logic lives, or mapping which files a change will touch.
---

- Full request path: browser → `web/app/api/<route>/route.ts` → `@server/api/handlers/*` (shared) → `src/services/` → Prisma query
- Auth enforcement happens in the Next route (`auth()`) — pass `userId` into handlers; handlers do not trust client identity fields
- Identity overwrite happens in the route handler before calling shared handlers — check `web/app/api/<route>/route.ts` first when tracing auth issues
- `web/middleware.ts` runs before all Next.js routes — check it for any global guards or rewrites
- Optional Express mirror: `src/server.ts` (Vitest/supertest only) — not the production path; production endpoints are under `web/app/api/`
- Business logic is in `src/services/` — route handlers and `src/api/handlers/` should stay thin
- LLM calls go through `src/services/llm.ts` only — any LLM behavior trace ends there
- Prisma client is at `src/db.ts` (or `web/lib/prisma.ts` in Next) — imported in services/handlers, not duplicated in UI
- For evaluation flow specifically: route → `simulationEvaluationService.ts` → `transcriptMetrics.ts` + `llm.ts` → `weaknessProfileService.ts`
- For auth flow: `web/app/api/auth/[...nextauth]/route.ts` → next-auth handlers → Prisma adapter → `User`/`Session` models
- Use Grep on the Next route path or handler name to find the implementation, then trace into the called service
