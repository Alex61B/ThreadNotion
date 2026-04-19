# ThreadNotion — Claude working guide (keep this lean)

If a line here wouldn’t prevent a likely mistake, delete it.

## Project snapshot
- **Backend**: Node/TypeScript Express app at repo root (`src/` → `dist/`).
- **Frontend**: Next.js app in `web/` (App Router).
- **DB**: PostgreSQL via Prisma. **Schema lives at repo root**: `prisma/schema.prisma`.
- **Prisma Client output**: `generated/prisma` (gitignored). Regenerate after schema changes.

## Repo layout
- Root: Express server + shared domain/services (`src/`, `dist/`, `prisma/`, `generated/`).
- `web/`: Next.js UI + NextAuth v5 + API routes (`web/app/`, `web/middleware.ts`).

## Commands you should use (don’t guess)

### Dev
- **Backend dev** (root): `npm run dev`
- **Web dev**: `cd web && npm run dev`

### Typecheck
- **Backend**: `npx tsc -p tsconfig.json`
- **Web**: `cd web && npx tsc -p tsconfig.json`

### Tests (prefer targeted)
- **Run all**: `npm test`
- **Run a single file**: `npx vitest run src/path/to.test.ts`

### Prisma (explicit schema path when unsure)
- **Generate client** (root): `npx prisma generate --schema=prisma/schema.prisma`
- **Generate client from `web/`**: `cd web && npx prisma generate --schema=../prisma/schema.prisma`
- **Local dev migrations** (create/apply): `npx prisma migrate dev --schema=prisma/schema.prisma`
- **Prod deploy migrations**: `npx prisma migrate deploy --schema=prisma/schema.prisma`
- **Studio**: `npx prisma studio --schema=prisma/schema.prisma`

## Render deployment notes (single service: backend + Next)
- **Node version**: 20.19.0
- **Prisma**: pinned to v6 (keep both root + `web/` aligned)
- Use **explicit Prisma schema path** in build steps if Render runs commands outside repo root.
- This is a monorepo: if you run commands from `web/`, Prisma needs `--schema=../prisma/schema.prisma`.

## Workflow rules
- After code changes, run **typecheck** (backend and/or web depending on what you touched).
- Prefer **one failing test** over the full suite while iterating.
- Don’t commit generated artifacts unless the repo already does.

## Pointers
- `@README.md` (project overview; may be stale vs current Node/Next/Prisma reality)
- `@package.json` and `@web/package.json` (canonical scripts)
- `@prisma/schema.prisma` (data model + Prisma client output path)
