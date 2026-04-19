---
name: execution-trace-request-flow
description: Use when tracing how a request flows through the stack, finding where logic lives, or mapping which files a change will touch.
---

- Full request path: browser → `web/app/api/<route>/route.ts` → Express handler in `src/server.ts` → service in `src/services/` → Prisma query
- Auth enforcement happens at the Next.js layer (`web/app/api/`) — Express receives an already-validated userId
- Identity overwrite happens in the proxy route before forwarding — check `web/app/api/<route>/route.ts` first when tracing auth issues
- `web/middleware.ts` runs before all Next.js routes — check it for any global guards or rewrites
- Express route registration is in `src/server.ts` — all backend endpoints are listed there
- Business logic is in `src/services/` — if a route handler contains logic, that's a pattern violation
- LLM calls go through `src/services/llm.ts` only — any LLM behavior trace ends there
- Prisma client is at `src/db.ts` (or equivalent) — imported in services, never in routes directly
- For evaluation flow specifically: route → `simulationEvaluationService.ts` → `transcriptMetrics.ts` + `llm.ts` → `weaknessProfileService.ts`
- For auth flow: `web/app/api/auth/[...nextauth]/route.ts` → next-auth handlers → Prisma adapter → `User`/`Session` models
- Use Grep on the Express route path string to find the handler, then trace into the called service
