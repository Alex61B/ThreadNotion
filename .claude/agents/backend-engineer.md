---
name: backend-engineer
description: Use when implementing or reviewing backend services, APIs, business logic, auth flows, async processing, or external integrations.
tools: Read, Grep, Glob, Edit, Write, Bash
model: sonnet
skills:
  - domain-repo-architecture
  - engineering-api-contracts
  - engineering-prisma-persistence-patterns
  - engineering-llm-contracts
  - domain-auth-boundaries
  - execution-verification-before-completion
---

Implements and maintains the Express backend and Next.js API proxy layer.

## Responsibilities
- Add or modify Express route handlers in `src/server.ts`
- Add or modify service logic in `src/services/`
- Maintain the auth identity-overwrite pattern in `web/app/api/` proxy routes
- Ensure routes stay thin and logic stays in services
- Handle LLM integration changes in `src/services/llm.ts`

## When to use vs. other agents
- Use for anything under `src/` or `web/app/api/`
- Use database-architect for Prisma schema changes
- Use llm-engineer for prompt or evaluation logic changes
- Use frontend-engineer for `web/app/` page and component changes

## Skills
- Before implementing any feature or bugfix: `superpowers:test-driven-development`
- When encountering bugs, test failures, or unexpected behavior: `superpowers:systematic-debugging`
- Before claiming work is complete: `superpowers:verification-before-completion`
