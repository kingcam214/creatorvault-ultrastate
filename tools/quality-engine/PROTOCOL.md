# CreatorVault Standards Enforcement Protocol

This protocol dictates exactly how the Quality Standards Engine is integrated into the development lifecycle. It removes subjective "looks good to me" approvals and replaces them with strict, data-driven gates.

## The Enforcement Loop

1. **Self-Evaluation:** Before any feature is presented for review, the developer or agent must run the CLI scoring engine (`python3 score.py`) and log the result.
2. **Pass Requirement:** The evaluation must result in a `PASS` (Average >= 4.0, No dimension < 3).
3. **Failing Features:** If a feature fails, it is immediately routed back to the development phase. It cannot be merged into `main` or deployed to production.
4. **Historical Auditing:** The `results.json` ledger is permanent. A feature that passed previously but degrades in a later sprint must be re-evaluated and fixed.

## Human-Review Rules

Even when the CLI engine generates a `PASS`, human review serves as the final arbiter of "UX Confidence" and "Output Quality." 

### 1. The "No Demo" Rule
If a human reviewer opens a feature and it feels like a demo (e.g., placeholder text, unstyled scrollbars, generic loading spinners), the reviewer is authorized to manually override the score to a `2` (Auto-Fail).

### 2. The "Real Data" Rule
Reviewers must never test features with test data (e.g., "Test Video 1"). Features must be tested with realistic, production-weight data to ensure UI layouts don't break under load.

### 3. The "Silent Failure" Rule
If a reviewer clicks a button and nothing happens (no success toast, no error toast, no loading state), the Reliability (RE) score is automatically capped at `2`. Silent failures are strictly forbidden.

### 4. Visual Proof Mandate
Code completion is not feature completion. A feature is only considered complete when visual proof (screenshots or video) of the premium output is attached to the evaluation record.

---

## Escalation Path

If a feature repeatedly fails the evaluation loop (3+ attempts), the following escalation path is triggered:
1. **Scope Audit:** Is the feature too complex for a single sprint? Break it down.
2. **Resource Audit:** Are the required APIs or UI libraries sufficient to hit the 4.0+ standard? If not, replace them.
3. **Design Audit:** Does the feature need a UX redesign before further engineering effort is applied?
