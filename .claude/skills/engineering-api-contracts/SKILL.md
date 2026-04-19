---
name: engineering-api-contracts
description: Use when adding or modifying API routes, request/response shapes, or the boundary between web proxy and Express backend.
---

- `web/app/api/` routes are thin proxies: auth check → overwrite identity → forward to Express — no logic here
- Express route handlers in `src/server.ts` are thin: validate input → call service → return typed response — no logic here either
- Business logic belongs exclusively in `src/services/` — if a route is getting complex, extract a service
- Validate request shape at the boundary — use Zod in Next.js routes for body parsing
- Response shapes must be explicitly typed — don't return raw Prisma model objects to the frontend
- Never expose internal DB field names if they don't match API semantics
- Extend payloads additively — don't remove or rename fields in responses the frontend already consumes
- Optional response fields must be typed as `T | null`, not omitted — omitting breaks existing callers
- Error responses use `{ error: string }` with appropriate HTTP status — be consistent across all routes
- `NEXT_PUBLIC_API_URL` is the Express base URL — always use it, never hardcode localhost
- New proxy routes must follow the identity-overwrite pattern from `web/app/api/chat/route.ts`
