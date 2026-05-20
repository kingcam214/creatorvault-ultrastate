# AI Agent Challenge End-to-End Feature Contract — 2026-05-20

The AI Agent Challenge is not complete unless the full acquisition, monetization, automation, and truth-reporting system works together. A payment gate alone is not the challenge. A dashboard alone is not the challenge. Agent telemetry alone is not the challenge. The system only works when a real user can be acquired, see a real offer, pay through a real checkout path, have the live payment verified, and have the challenge dashboard update from live proof while the agents and distribution surfaces keep driving traffic.

| Feature lane | What must work end to end | Completion standard |
|---|---|---|
| Public acquisition surface | A prospect must have a public, non-operator page that explains the AI Agent Challenge, presents a paid offer, and gives a clear action to buy or join. | The page is routable without operator-only context and contains a working call-to-action into checkout or a real conversion path. |
| Paid offer definition | The challenge must expose at least one concrete paid product, unlock, subscription, tip, or VaultX offer tied to the challenge. | The offer has a price, title, description, and metadata that can be carried into payment and attribution. |
| Checkout creation | The CTA must create or open a real checkout session rather than end at copy, internal dashboards, or manual instructions only. | Stripe or another configured provider creates a payment session, or the UI clearly reports provider configuration as the blocker instead of pretending completion. |
| Live-payment proof | Payment completion must arrive through provider-confirmed live-mode proof. | Test mode, manual entries, abandoned checkouts, agent estimates, and projections cannot increment challenge revenue. |
| Challenge crediting | The challenge progress must update only through the centralized proof gate. | Direct writes to `empire_challenge_transactions` and `empire_challenges.current_revenue` are blocked outside the live-proof hook. |
| Agent execution | Challenge agents must execute real tasks, persist outputs, and avoid pretending generated impact is cash. | Agent outputs save as telemetry/reports/distribution actions with zero real challenge credit unless payment proof arrives. |
| Content generation | The story engine must generate useful public-facing challenge content that includes a real CTA and does not market fake progress. | Generated text points traffic toward the active offer or public challenge page and reflects live cash truth. |
| Distribution | Telegram/free-channel/money-loop drops must be capable of sending the challenge offer link and tracking delivery. | Distribution records the tracking URL, delivery status, and related offer metadata. |
| Attribution and tracking | Acquisition attempts, checkout starts, conversions, and live credits must be distinguishable. | Operators can see funnel stages separately from collected revenue. |
| Dashboard truth | Dashboards must label live cash, attempts, projections, and agent activity separately. | No surface presents non-cash as collected challenge revenue. |
| Operator controls | The owner must be able to run the challenge cycle, generate/post content, view status, and know why revenue was or was not credited. | Controls return clear success/failure states and proof-required reasons instead of silent failure. |

This contract replaces any claim that the AI Agent Challenge is complete because one component was patched. The remaining audit and fixes must map each file and route to these lanes and produce pass/fail evidence.
