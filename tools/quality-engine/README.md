# CreatorVault Quality Standards Engine

**Author:** Manus AI for CreatorVault  
**Version:** 1.0  
**Location:** `tools/quality-engine/`

This is the master standards enforcement system for CreatorVault. It exists for one reason: to ensure that every feature shipped to production is world-class, not demo-level. It replaces "it ran" and "looks good" with a strict, data-driven scoring gate.

---

## Files in This Directory

| File | Purpose |
|---|---|
| `README.md` | This file. Master index and quickstart. |
| `RUBRIC.md` | The scoring dimensions, scale definitions, and pass/fail logic. |
| `TEMPLATES.md` | Module-specific evaluation checklists (VaultX, Clone, Telegram, etc.). |
| `PROTOCOL.md` | Human-review rules and the enforcement loop. |
| `score.py` | The CLI scoring engine. Runs evaluations, stores results, generates reports. |
| `results.json` | The persistent ledger of all evaluation records. Never delete this file. |

---

## Quickstart

### Run an Evaluation
```bash
cd tools/quality-engine
python3 score.py
```
The wizard will guide you through selecting a module, naming the feature, and scoring each dimension. Results are saved automatically.

### View All History
```bash
python3 score.py --history
```

### Filter by Module
```bash
python3 score.py --module vaultx-analytics
```

### Generate a Full Quality Report
```bash
python3 score.py --report
```

---

## Scoring Dimensions

Every feature is scored across five dimensions on a 0–5 scale.

| Code | Dimension | Core Question |
|---|---|---|
| **FT** | Functional Truth | Does it actually work end-to-end? |
| **OQ** | Output Quality | Does the result look premium, not demo-like? |
| **CV** | Creator Value | Does it improve monetization, workflow, or speed? |
| **RE** | Reliability | Does it work repeatedly? |
| **UX** | UX Confidence | Does it feel trustworthy and polished? |

### Score Scale

| Score | Label |
|---|---|
| 0 | Broken |
| 1 | Barely runs |
| 2 | Demo-level — **AUTO-FAIL** |
| 3 | Functional, acceptable |
| 4 | Premium |
| 5 | World-class |

---

## Pass / Fail Logic

A feature **PASSES** only when all three conditions are met simultaneously:

1. **Average score >= 4.0** across all five dimensions.
2. **No single dimension scores below 3.** A score of 2 or lower in any category is an automatic fail, regardless of the average.
3. **No zero-tolerance triggers** are present (mock data in production, unhandled exceptions, silent failures, outdated UI).

A feature that scores 5/5/5/5/2 has an average of 4.4 but **FAILS** automatically due to the score of 2.

---

## Grade Scale

| Grade | Average | Meaning |
|---|---|---|
| **S — World-Class** | 4.8 – 5.0 | Benchmark-level. Exceeds Pollo AI / Runway standard. |
| **A — Premium** | 4.5 – 4.7 | Excellent. Ships with confidence. |
| **B — Passes Standard** | 4.0 – 4.4 | Meets the bar. Acceptable for production. |
| **FAIL** | < 4.0 or any dim < 3 | Does not ship. Returned to development. |

---

## Module Coverage

The engine covers every major module in CreatorVault:

| Module Key | Description |
|---|---|
| `vaultx-studio` | Content upload, PPV gating, subscriber access |
| `vaultx-editor` | Video timeline editor, trim, export |
| `vaultx-analytics` | Revenue, subscriber, content performance charts |
| `clone-engine` | Talking head / full-body AI generation |
| `clone-gallery` | Generated asset management and reuse |
| `telegram-automation` | Drip campaigns, paywall messages, bot delivery |
| `whatsapp-automation` | WhatsApp broadcast and sequence delivery |
| `monetization-checkout` | Stripe / crypto checkout modal |
| `monetization-ppv` | Per-video pay-per-view gating |
| `monetization-subscriptions` | Recurring subscription management |
| `monetization-tips` | Tip and donation flows |
| `admin-command-hub` | Global stats, command execution, impersonation |
| `admin-analytics` | Platform-wide revenue and usage analytics |
| `music-ai` | Lyric generation, track analysis |
| `viral-optimizer` | Content virality analysis and optimization |
| `recruitment-dashboard` | Creator outreach and sequence management |
| `thumbnail-generator` | AI thumbnail concept generation |
| `script-director` | Script writing and import |
| `design-department` | Design brief generation |
| `other` | Any new feature not yet categorized |

---

## Enforcement Rules

1. **No feature is "done" without a PASS score logged in `results.json`.**
2. **A screenshot is not proof.** The evaluator must interact with the live feature using real data.
3. **Any feature that was previously PASS but regresses must be re-evaluated** before the next deployment.
4. **Three consecutive FAILs on the same feature** trigger an escalation: scope audit, resource audit, or design audit.
5. **The pre-commit hook** (`.git/hooks/pre-commit`) enforces TypeScript cleanliness before every commit. The quality engine enforces feature completeness before every deployment.

---

## Integration with Development Workflow

```
Developer builds feature
        ↓
TypeScript check passes (pre-commit hook)
        ↓
Developer runs: python3 score.py
        ↓
Score >= 4.0, no dim < 3?
    YES → Feature is eligible for deployment
    NO  → Feature returns to development
        ↓
Human reviewer verifies live on creatorvault.live
        ↓
Result logged in results.json
        ↓
git commit + deploy
```
