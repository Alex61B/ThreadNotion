---
name: execution-execution-planning
description: Use when breaking down a multi-step task into an ordered implementation plan before any code is written.
---

- Identify all layers touched before proposing steps: schema, service, route, proxy, UI
- Order phases by dependency — schema before service, service before route, route before UI
- Name the right specialist agent for each phase — don't assign implementation to planner
- Flag protected invariants the task must not violate before any phase begins
- Surface ambiguities that would block a phase — resolve them before planning that phase
- Estimate blast radius: which existing tests, routes, and stored records could break
- A plan is not complete until every phase has a clear owner, inputs, and expected outputs
- Don't start Phase N until Phase N-1 is verified complete
- If a task touches billing or team boundaries, include an explicit auth/entitlement check phase
- Write the plan before spawning subagents — agents need a scoped brief, not an open-ended task
- Keep phases small enough to verify independently — "implement the whole feature" is not a phase
