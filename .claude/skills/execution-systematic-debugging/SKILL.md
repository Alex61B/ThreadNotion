---
name: execution-systematic-debugging
description: Use when encountering any bug, test failure, or unexpected behavior — before proposing fixes.
---

- Reproduce the failure first — confirm you can trigger it reliably before touching code
- Read the full error message and stack trace; don't skim — the root cause is usually stated directly
- Check git log for recent changes to the affected area before assuming the bug is new
- Isolate the failing unit: is it the route, the service, the Prisma query, or the LLM call?
- Check TypeScript types first — many runtime errors are type mismatches that `tsc` would catch
- For test failures: run the specific test in isolation (`npx vitest <file>`) before running the full suite
- For evaluation failures: check whether `SalesEvaluationLLMSchema` validation is the failing point, or whether metrics computation is
- For auth failures: verify session identity flow — is `deriveActingUserId` returning null? Is the cookie present?
- Add targeted logging at the boundary where expected and actual diverge — don't log everything
- Verify the fix addresses root cause, not just the symptom — trace back one more level before committing
- Don't modify tests to make them pass — if a test is correct and failing, the implementation is wrong
