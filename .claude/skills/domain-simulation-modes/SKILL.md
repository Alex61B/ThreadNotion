---
name: domain-simulation-modes
description: Use when working with simulation modes, conversation creation, adaptive/drill plans, or mode-specific UI behavior.
---

- 4 simulation modes (`SimulationMode` enum): `generic`, `adaptive`, `drill`, `mixed_practice`
- Personas are seeded `Persona` DB records — they are content (characters), not mode architecture
- `generic`: free roleplay with no adaptation logic; no plan stored
- `adaptive`: targets user weaknesses; `adaptiveScenarioPlan` (Json) stored on `Conversation` at creation
- `drill`: focused skill practice; `drillPlan` (Json) stored on `Conversation` at creation
- `mixed_practice`: combination mode
- Mode is stored on `Conversation.simulationMode` — must remain readable on old rows
- Plans (`adaptiveScenarioPlan`, `drillPlan`) are JSON blobs — parse defensively, legacy rows will be null
- `liveCoachingMeta` (Json) handles live tip cooldown/dedupe — separate from mode logic
- Never infer mode from plan presence — always read `Conversation.simulationMode` directly
- Each mode must remain distinguishable in both persistence and UI — use banners/badges, not just plan shape
- New modes or plan shapes must not break existing rows where those fields are null
