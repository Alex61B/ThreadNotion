---
name: engineering-api-contracts
description: Use when adding or modifying API routes, request/response shapes, or the boundary between Next route handlers and shared server logic.
---

- Production API lives in `web/app/api/**/route.ts`: auth check → overwrite identity where needed → call `@server/api/handlers/*` → return `nextFromHandlerResult` — keep routes thin
- Shared handlers in `src/api/handlers/` call `src/services/` and `src/billing/` — no Express types in handlers
- Business logic belongs in `src/services/` (and billing modules) — if a handler grows, extract a service
- Validate request shape at the boundary — use Zod in handlers (or route) for body parsing
- Response shapes must be explicitly typed — don't return raw Prisma model objects to the frontend
- Never expose internal DB field names if they don't match API semantics
- Extend payloads additively — don't remove or rename fields in responses the frontend already consumes
- Optional response fields must be typed as `T | null`, not omitted — omitting breaks existing callers
- Error responses use `{ error: string }` with appropriate HTTP status — be consistent across all routes
- Frontend calls same-origin `/api/*` only — no separate API origin env vars
- Follow the identity-overwrite pattern from `web/app/api/chat/route.ts` for user-scoped POST bodies
