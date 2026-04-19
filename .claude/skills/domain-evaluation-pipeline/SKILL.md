---
name: domain-evaluation-pipeline
description: Use when modifying evaluation logic, skill scoring, weakness profiles, or any post-conversation feedback computation.
---

- Evaluation is two-step: deterministic metrics first, LLM scoring second — never merge these
- `src/services/transcriptMetrics.ts` computes: questionCount, avgMessageLength, talkRatio — no LLM involved
- LLM scores 6 sales skills (see `SalesSkill` enum) via `simulationEvaluationService.ts`
- LLM output validated against `SalesEvaluationLLMSchema` (Zod) — malformed output throws `EvaluationError`, never silently accepted
- Results written to `SimulationSkillScore` (one row per skill per conversation) and `SimulationEvaluationSummary`
- `SimulationEvaluationSummary.rawEvaluatorOutput` stores the full LLM JSON — preserve this field, it enables debugging and compat
- `weaknessProfileService` updates `UserWeaknessProfile` after each simulation — trend direction computed from score history
- Never move deterministic metrics into LLM evaluation — they must be reproducible without an LLM call
- Stored evaluation data must remain readable as rubrics evolve — don't change field semantics on existing rows
- `EvaluationError` (not generic `Error`) signals evaluation-specific failures — callers can handle these distinctly
- Adding new rubric dimensions must not break reads of old `SimulationEvaluationSummary` rows
