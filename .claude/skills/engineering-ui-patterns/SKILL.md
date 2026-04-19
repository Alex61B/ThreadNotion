---
name: engineering-ui-patterns
description: Use when building or reviewing UI components, pages, or layouts in the Next.js frontend.
---

- Simulation mode (adaptive/drill/generic) must be visually indicated on every relevant view — use banners or badges, not just implicit behavior
- Feedback scores and tips must be scannable at a glance — no walls of text, structured layout
- Mode and state indicators should be obvious but not visually noisy — one clear signal per state
- Don't add friction to the core training loop (start → converse → evaluate → view feedback)
- Empty states must be handled gracefully with a useful message — no blank or broken UI on first session
- Loading states should not block core interaction — use skeletons or inline indicators, not full-page spinners where avoidable
- Live coaching tips are non-blocking overlays — they must not interrupt or obscure the conversation
- Progress views should surface trends and actionable weaknesses, not just raw numbers
- Use `useSession` from next-auth/react for client-side auth state — never derive identity from localStorage on authenticated pages
- Components that depend on session must handle unauthenticated state explicitly (redirect or gate)
- Don't duplicate mode/state logic in components — read `simulationMode` from the API response, don't infer from plan presence
