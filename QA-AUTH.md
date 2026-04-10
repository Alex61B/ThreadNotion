## Auth QA checklist (focused)

**Environment and magic-link email:** see [AUTH-SETUP.md](AUTH-SETUP.md) for required variables, local Mailpit/SMTP, and how to test sign-up and sign-in.

### Preconditions
- Backend running (Express) and DB migrated.
- Web app running (`web` Next.js).
- Email delivery working (Mailpit/Mailhog locally or real SMTP in env).

### 1) Server-side gate
- Visit `/` logged out → should redirect to `/auth/signin` before app UI renders.
- Visit `/auth/signin` logged out → page loads.
- Visit `/auth/register` logged out → page loads.

### 2) Role assignment
- Register with role **Sales Rep** → after completing magic link, header shows **Sales rep**.
- Register with role **Manager** → after completing magic link, header shows **Manager**.
- Sign out, then sign in again (existing user) → role persists.

### 3) Session identity enforcement
- While signed in, call `GET /api/user-progress?userId=forged` in devtools/network.
  - Response should reflect the signed-in user (server ignores forged id).
- Try the same while logged out.
  - Should be blocked (401 from proxy or redirected by gate depending on route).

### 4) Anonymous history linking (safety + idempotency)
- In a fresh browser profile, before signing in, do a few chats / grade at least once.
- Sign in via magic link.
- Verify previous conversations appear under the authenticated account.
- Sign out and sign in again.
  - No duplicated conversations/skills; linking remains idempotent.

### 5) Manager/team explicit-target routes
- As manager, open Team panel, view a rep’s member-progress analytics.
- As a rep (non-manager), attempt to access team member progress for another user.
  - Should be blocked by backend authorization (403/404 as appropriate).

