/**
 * Express app for Vitest/supertest and optional local dev parity — not used for production.
 * Production API: Next.js `web/app/api/*` → shared handlers in `src/api/handlers/`.
 * Stripe webhooks: `POST /api/stripe/webhook` is handled only by Next (`web/app/api/stripe/webhook/route.ts`).
 */
import 'dotenv/config';
declare const app: import("express-serve-static-core").Express;
export { app };
//# sourceMappingURL=server.d.ts.map