# Auth and magic-link email setup

ThreadNotion uses [Auth.js](https://authjs.dev/) (NextAuth v5) with the **Email** provider and **database sessions**. You do **not** need a separate Auth.js cloud account or vendor signup—only environment variables and (for local dev) something to receive SMTP or a real SMTP relay.

## Required environment variables (web / Next.js)

Set these in the environment used by `cd web && npm run dev` (e.g. `web/.env.local`).

**Important:** Next.js only auto-loads `.env`, `.env.local`, and `.env.development*` from the **`web/`** directory. A `DATABASE_URL` (or other vars) defined only in the **repository root** `.env` is available to `npx prisma` and the Express API, but **not** to the Next.js server unless you duplicate it in `web/.env.local` or load it another way. Missing `DATABASE_URL` in the web app causes `register-intent` and Prisma adapter calls to fail.

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string (same DB as Prisma migrations). |
| `AUTH_SECRET` | Secret for signing tokens. Generate with `openssl rand -base64 32`. `NEXTAUTH_SECRET` is accepted as a fallback in code. |
| `AUTH_URL` or `NEXTAUTH_URL` | Public origin of the app, e.g. `http://localhost:3000`. Auth.js v5 prefers `AUTH_URL`. |
| `EMAIL_FROM` | From address for magic-link messages, e.g. `ThreadNotion <no-reply@yourdomain.com>`. |

## Email / SMTP (magic link delivery)

The app sends mail via Nodemailer. Configure using **either** Auth.js-style names **or** legacy `SMTP_*` names (both are supported; `EMAIL_SERVER_*` wins when both are set).

| Variable | Example |
|----------|---------|
| `EMAIL_SERVER_HOST` | `smtp.gmail.com` or `127.0.0.1` |
| `EMAIL_SERVER_PORT` | `587`, `465`, or `1025` (Mailpit default SMTP) |
| `EMAIL_SERVER_USER` | SMTP username (if required) |
| `EMAIL_SERVER_PASSWORD` | SMTP password or app password |

Legacy equivalents: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`.

**Behavior:**

- **Host + user + password** → authenticated SMTP (typical production or Gmail with app password).
- **Host only** (no user/password) → no SMTP auth (common for local Mailpit/Mailhog).
- **No host** → defaults to `localhost:1025` (Mailpit’s default SMTP port). Nothing listening there causes connection errors until you start Mailpit or set real SMTP vars.

## Local email testing with Mailpit

Run Mailpit with Docker (detached container, SMTP on 1025, web UI on 8025):

```bash
docker run -d --name mailpit -p 1025:1025 -p 8025:8025 axllent/mailpit
```

Open the Mailpit UI: [http://localhost:8025](http://localhost:8025)

Auth.js magic-link emails sent during local development are delivered to Mailpit and appear in that inbox (set `EMAIL_SERVER_HOST=127.0.0.1` and `EMAIL_SERVER_PORT=1025` in `web/.env.local`, with `EMAIL_FROM` and other auth vars as usual).

### Example: Gmail SMTP (app password)

Google requires an [app password](https://support.google.com/accounts/answer/185833) for SMTP when 2FA is on.

```bash
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=you@gmail.com
EMAIL_SERVER_PASSWORD=your-app-password
EMAIL_FROM="ThreadNotion <you@gmail.com>"
```

## Database

From the repository root, apply migrations so tables such as `SignUpIntent`, `User`, and `VerificationToken` exist:

```bash
npx prisma migrate deploy
```

For local iteration you may use `npx prisma migrate dev` instead. Regenerate the client after schema changes:

```bash
npx prisma generate
```

## Optional debugging

| Variable | Effect |
|----------|--------|
| `AUTH_DEBUG=1` | Enables Auth.js `[auth][debug]` logging (verbose). |

Magic-link send failures are also logged as `[auth:email]` with a short error kind (`ECONNREFUSED`, `SMTP_AUTH`, etc.). Signup intent API logs use `[auth:register-intent]`.

## Run and test locally

```bash
# Terminal 1: database + (optional) Mailpit
# Terminal 2:
cd web && npm run dev
```

1. Open `http://localhost:3000/auth/register`, enter email and role, submit.
2. In the browser Network tab, `POST /api/auth/register-intent` should return **200** if the DB is OK.
3. Then the magic link is sent via SMTP; pick it up from Mailpit or your real inbox.
4. Sign-in-only flow: `http://localhost:3000/auth/signin` uses the same SMTP configuration.

See [QA-AUTH.md](QA-AUTH.md) for broader manual checks (roles, linking, API hardening).
