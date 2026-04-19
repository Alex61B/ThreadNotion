---
name: engineering-llm-contracts
description: Use when adding or modifying LLM calls, prompt templates, structured output parsing, or evaluation schema.
---

- Use JSON-only responses when structure is required — never parse free-text LLM output
- Every structured LLM response must be validated against a Zod schema before use — pattern: `Schema.safeParse(raw)`
- On validation failure, throw `EvaluationError` (or domain-appropriate error) — never silently accept malformed output
- Deterministic metrics (counts, ratios, lengths) are computed in TypeScript — see `src/services/transcriptMetrics.ts` — never derived from LLM
- Prompts must explicitly state the expected output format and scoring rubric — no implicit formatting expectations
- Store raw LLM output alongside processed results (e.g., `rawEvaluatorOutput` on `SimulationEvaluationSummary`) for debugging and backward compat
- New prompt formats must not break reads of stored historical evaluation data
- `src/services/llm.ts` is the single LLM access layer — don't add raw API calls elsewhere in the codebase
- Token budget: avoid sending full conversation history when a summary or excerpt suffices
- New structured output schemas must include all fields the downstream consumer expects — no optional-field surprises
- When rubric changes: version or guard the new fields so old stored outputs remain parseable
