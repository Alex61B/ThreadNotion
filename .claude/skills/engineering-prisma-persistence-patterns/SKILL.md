---
name: engineering-prisma-persistence-patterns
description: Use when modifying Prisma schema, writing migrations, adding models or relations, or querying the database.
---

- Prisma is the only DB access layer — no raw SQL, no direct pg calls
- Import client from `../generated/prisma`, not from `@prisma/client`
- Schema changes must account for existing rows: add nullable columns or provide defaults, never add non-null without a default on a populated table
- JSON fields (`adaptiveScenarioPlan`, `drillPlan`, `rawEvaluatorOutput`, etc.) must be parsed defensively — legacy rows may be null or have an older shape
- Don't couple DB schema shape to raw LLM output structure — transform at the service layer before storing
- Migrations are append-only in meaning — don't change the semantics of an existing column that has stored data
- Use explicit `onDelete` behavior on all relations — don't rely on defaults
- Composite unique constraints (`@@unique`) and indexes (`@@index`) must be defined in schema, not assumed
- Plan for partial records: services reading JSON blobs must handle missing fields gracefully
- `generated/prisma` is gitignored — always run `npx prisma generate` after schema changes
- Test migrations against representative data shapes, including null/legacy rows
- Never return raw Prisma model objects from services — map to typed response shapes before returning
