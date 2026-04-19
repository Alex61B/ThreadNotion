---
name: execution-test-strategy
description: Use when designing test coverage, deciding what to mock, or reviewing whether tests reflect real production behavior.
---

- Use real Prisma (test DB) for tests that exercise DB-dependent service logic — mocked Prisma hides real query behavior
- Mock LLM calls (`src/services/llm.ts`) in tests — LLM output is non-deterministic and external
- Mock external HTTP calls (Stripe, email) — never make real network calls in tests
- Test against observable behavior (what the route returns, what the DB state is), not implementation internals
- Name tests as behavioral assertions: "returns 401 when unauthenticated", not "calls auth()"
- Group tests by feature or flow, not by function or file structure
- Test error paths explicitly: `EvaluationError`, auth failures (missing session), missing Prisma records
- Write a regression test for every bug fix before fixing — confirms the fix, prevents recurrence
- Evaluation pipeline tests must cover: valid LLM output, malformed LLM output (should throw), and metric computation independently
- Auth boundary tests must cover: unauthenticated (401), authenticated with wrong userId (403/data isolation), and team membership checks
- Don't test that Prisma was called with specific arguments — test the outcome (returned data, DB state)
- Vitest is the test runner — `npx vitest` runs all tests; `npx vitest <file>` runs a single file
