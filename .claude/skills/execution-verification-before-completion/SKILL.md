---
name: execution-verification-before-completion
description: Use before claiming any task is complete, fixed, or passing — requires running verification steps and confirming output.
---

- Run the test suite: `npm test` or `npx vitest` — all tests must pass before claiming done
- Check TypeScript compiles cleanly: `npx tsc --noEmit` — no new type errors in changed files
- Manually exercise the changed path end-to-end — don't rely on tests alone
- Check adjacent features for regressions: evaluation flow, auth, simulation mode creation
- If schema changed: verify migration ran cleanly and existing rows still parse correctly
- If LLM contract changed: verify Zod schema validation still passes on representative sample outputs
- If an API route changed: verify identity is still derived from `auth()`, not client body
- If service logic changed: verify all callers (routes, tests) still receive the expected response shape
- Don't claim complete if TypeScript errors exist anywhere in changed files
- Don't claim complete if any previously-passing test is now failing
- Don't claim complete without confirming the build (`npm run build`) succeeds in `web/`
