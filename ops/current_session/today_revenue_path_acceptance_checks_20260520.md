# Today Revenue Path Acceptance Checks — 2026-05-20

The user’s outcome standard is that VaultX and the AI Agent Challenge must stop circling and be capable of acquiring a user and generating real revenue today. This cannot be measured by another broad audit. It must be measured by concrete platform behavior.

| Acceptance check | Pass condition | Failure condition |
|---|---|---|
| Money truth | The AI Agent Challenge only increments real challenge revenue from live-mode provider-confirmed payment proof. | Test Stripe events, manual dashboard entries, agent telemetry, abandoned checkout value, or projections can increase `empire_challenges.current_revenue`. |
| Purchase path | A prospect can move from the AI Agent Challenge or VaultX acquisition surface to a real offer or checkout path without dead ends. | The path ends in copy, dashboards, internal-only controls, or a broken/missing checkout call-to-action. |
| Acquisition execution | Existing automated acquisition tooling can expose a real offer and record whether outreach, handoff, or conversion steps ran. | Acquisition remains invisible, manual-only, or disconnected from the offer and challenge outcome. |
| Dashboard clarity | Operators can see live cash separately from attempted value, projected impact, and agent activity. | Any surface presents non-cash as collected revenue or challenge progress. |
| Proof | Build/typecheck and targeted route checks run, and the final report names exact files changed and exact remaining blockers. | Final output relies on claims without build or route proof. |

No claim will be made that a specific buyer has paid unless there is a real live payment proof record. The platform fix target is that the system can acquire and convert today, and that any resulting challenge revenue is clean live cash only.
