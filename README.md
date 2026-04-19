# ThreadNotion

AI-powered sales training for fashion retail: persona-based simulations, coaching feedback, and team features. Monorepo: **Next.js** (App Router) + shared TypeScript in `src/`, PostgreSQL via Prisma.

## Production architecture

- **Single Next.js process** serves the UI and all `/api/*` routes. Shared business logic lives in [`src/api/handlers/`](src/api/handlers/) and [`src/services/`](src/services/).
- **Do not** use the root Express `npm start` for production; that entry is for tests and optional local API harness only.

### Build and start (repo root)

Use these on hosts like Render when the **root directory is the repository root**:

| Step | Command |
|------|---------|
| Install | `npm install` (runs `postinstall` → `prisma generate`) |
| Build | `npm run build:web` |
| Start | `npm run start:web` |

If Render’s **root directory** is `web/` instead, install **parent** dependencies too (shared `src/` imports resolve from the repo root unless you configure otherwise), then build, e.g. `cd .. && npm install && cd web && npx prisma generate --schema=../prisma/schema.prisma && npm run build`, then `npm start` inside `web/`. Prefer setting the service **root directory** to the repository root and using the table above.

### Integrations

| Purpose | URL / method |
|---------|----------------|
| **Stripe webhooks** | `POST https://<your-host>/api/stripe/webhook` — configure this in the Stripe Dashboard. |
| **Grace period sweeper (cron)** | `POST https://<your-host>/api/internal/grace-sweep` with header `Authorization: Bearer <INTERNAL_CRON_SECRET>`. Schedule from your platform (e.g. Render cron) on your chosen interval. |

### Environment variables (production)

Set at least:

- `DATABASE_URL` — PostgreSQL connection string
- NextAuth: `AUTH_SECRET`, `AUTH_URL` (or equivalent for your Auth.js setup), and provider secrets as configured
- `OPENAI_API_KEY`
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and related keys as used by [`src/billing/`](src/billing/)
- `INTERNAL_CRON_SECRET` — required for the grace-sweep route to accept scheduled calls
- Email/SMTP or provider vars if you use outbound mail (see app config)

Do **not** rely on split-stack vars such as `BACKEND_HTTP_ORIGIN`, `INTERNAL_API_URL`, or `NEXT_PUBLIC_API_URL` for API routing; the app uses same-origin `/api/*`.

### Node

Node **20.19.0** is recommended (see `CLAUDE.md` / Render notes). Prisma v6; keep root and `web/` Prisma versions aligned.

## Development

- **Next app (recommended):** `cd web && npm run dev`
- **Express harness (tests / optional local):** `npm run dev` at repo root
- **Tests:** `npm test` (Vitest; many tests hit `src/server.ts` via supertest)

## Author

Alexander Woodward Smith  
[LinkedIn](https://www.linkedin.com/in/alexander-smith-879067293/)  
woodward21@berkeley.edu
