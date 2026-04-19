---
name: domain-auth-boundaries
description: Use when working with authentication, session identity, user isolation, anonymous users, or access control.
---

- Auth stack: next-auth v5 beta (5.0.0-beta.25) + @auth/prisma-adapter v1.0.0
- Session identity is at `session.user.id` — always derive userId from there, never from client body or query params
- `src/webProxy/authHardening.ts` — `deriveActingUserId()` is the canonical helper; use it in all proxy routes
- All `web/app/api/` routes overwrite any client-provided `userId` with `session.user.id` before forwarding to Express
- Express receives a userId that was validated by the proxy — but new Express routes added directly must not trust raw body userId
- Anonymous users use a localStorage UUID as userId — tracked in `AnonymousIdentityClaim` for post-login merge
- `AnonymousIdentityClaim` links anonymous UUID → authenticated `User.id` after sign-in; check before assuming userId is auth'd
- `AccountRole` on `User`: `MANAGER` or `SALES_REP` — used for access control and team management gates
- `SignUpIntent` holds pending email verifications with role — consumed in Auth.js `createUser` event
- Session cookies: `authjs.session-token` (dev), `__Secure-authjs.session-token` (prod); chunked variants handled in `authHardening.ts`
- Team access: verify `TeamMember` row exists for the acting userId before serving any team-scoped data
- Never expose one user's data to another — always scope queries by the session-derived userId or teamId
