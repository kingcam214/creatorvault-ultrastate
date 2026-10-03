# Task 1 — Stripe Connect 85% Net Payout Engine

## No-theater status

| Field | Record |
|---|---|
| Claim | An authorized, paid creator charge produces one source-linked Connect transfer equal to `floor((gross - actual Stripe fee) * 85 / 100)`, with fee, recipient, transfer, and settlement evidence saved. |
| Current status | **Ready for proof; not yet proven.** The repository implementation has local validation; no accepted real-creator Stripe journey is claimed. |
| Evidence | Owner's October 2, 2026 Task 1 instruction; local branch `feat/stripe-connect-net-payouts`; 58 focused tests passed; strict checking of all 23 modified/new TypeScript files passed; actual server bundle passed; additive migration exercised against isolated local MariaDB. |
| Failure / absent proof | No production access/deployment/migration, real Stripe test-mode or live transfer, connected-bank payout, or owner acceptance was performed. Whole-project checking retains eight exact pre-existing diagnostics. |
| Money used | External financial/provider spend **$0**. Local HTTP fixtures use no live key and cannot move funds. |
| One next action | Review the committed patch and this proof record. Obtain a separate bounded authorization and real test-mode creator/source before any external Stripe proof or production action. |

## Authorized task card

The owner authorized repository implementation, local validation, a clean feature-branch commit, and an exact diff summary. The authorized engineering source is `kingcam214/creatorvault-ultrastate`; the canonical payment entry remains the existing signed `POST /api/stripe/webhook` registered in `server/_core/index.ts` and handled by `server/_core/stripeWebhook.ts`.

The financial acceptance rule is one fee-aware Connect transfer per successful source charge, to the creator's persisted Connect account, with stable identical transfer parameters/key across retries and no second credit to manual withdrawal availability. The local cost ceiling is $0 external spend. No live account, payment, transfer, deployment, production migration, messaging, or paid-provider permit is open. A production/user-facing proof still needs the owner to name the authorized creator/account, source charge, mode, amount/cost ceiling, time window, stop rule, and acceptance decision.

## Starting condition and changes

The mounted webhook previously recorded gross-based subscription/VaultLive revenue without creating creator transfers. Commerce used a contradictory 70/20/10 split. VaultX PPV credited profile IDs into user-keyed balances and could leave those proceeds manually withdrawable. No persisted `users.stripe_connect_account_id` or canonical transfer ledger existed.

The new pipeline retrieves the successful captured Charge and its real Balance Transaction. It records gross, Stripe fee/fee details, net, 85% creator amount, platform remainder, currency, source IDs/metadata, recipient user/Connect account, immutable idempotency key/group, lease/attempt timestamps, transfer ID, and status. Monetary values remain integer currency minor units; rounding occurs once, downward, with the sub-unit remainder kept in the platform's integer remainder.

The only `stripe.transfers.create` call uses the persisted idempotency key and `source_transaction`. A unique charge identity, transaction-locked claim, expiring worker lease, identical frozen request, and transfer-group reconciliation protect redelivery and crash recovery. Blind creation is stopped after a conservative 23-hour replay window because Stripe may prune idempotency keys after 24 hours.

Creator account creation is persisted and idempotent. The protected existing account endpoint now returns a fresh real Stripe hosted onboarding URL, with callbacks derived from the trusted server application origin and the already registered `/dashboard` route. Active `account.updated` events resume account-blocked rows. This is an API capability; no new frontend onboarding room or route was introduced.

Checkout completion alone is not money: unpaid asynchronous sessions do not credit, fulfill, or transfer. Paid asynchronous completion uses the same pipeline. Initial subscription payments and renewals are owned by `invoice.paid`, not paid a second time by Checkout. Fee-pending charge updates, account activation, reversals, and refund/dispute review states are recorded explicitly.

## Accounting and boundary decisions

| Boundary | Decision |
|---|---|
| Net creator law | The current explicit owner instruction governs new canonical Stripe creator settlement: 85% of actual net, not the historical 70/20/10 commerce calculation. Recruiter attribution is retained; no new recruiter transfer is introduced, and no 20%-of-gross recruiter accrual reduces the required creator payout. |
| VaultX identity | Resolve `vaultx_content.creator_id` through `vaultx_creators.user_id` before selecting the user's Connect account. Retain the profile identity in source metadata/purchase rows. |
| Manual payout isolation | Record pending/lifetime USD revenue once. Successful Connect settlement clears only its pending amount. Never credit that Stripe income into manual-withdrawable availability or duplicate the legacy PPV balance/transaction writes. |
| Currency | Canonical payout accounting is currency-aware. Non-USD charges remain in that ledger and do not enter the legacy USD-only aggregate balance/transaction tables. Charge/settlement currency mismatches require review rather than inferred conversion. |
| Fee source | Use actual `balance_transaction.fee` and `fee_details`; there is no percentage-fee estimate or zero-fee fallback when the Balance Transaction is missing. IC+ pricing needs a different actual-fee reporting source and is outside this Balance Transaction implementation; verify standard fee reporting before rollout. |
| Snapshot changes | Once revenue is recorded, changed fee/Balance Transaction snapshots require reconciliation, not silent repricing of pending balances. Transfer parameters are immutable after the first attempt. |
| Historical payments | Migration seeds an activation cutoff. Older source charges are held for reconciliation instead of automatically backfilling potentially manual-paid balances. No historical records are rewritten/deleted. |
| Refunds/disputes | Hold for reconciliation and record reversals. A refund racing the successful API response keeps both the transfer ID and review status. Separate transfers are not automatically reversed by Stripe; this task does not add automatic refund/dispute clawbacks. |
| Meaning of transferred | A successful Connect Transfer submits funds to the connected Stripe balance. It does not assert receipt in a creator's bank account; that separate step follows Stripe's connected-account payout schedule. |
| Type boundary | All new financial source and added financial lines have no explicit `any`, suppression directives, placeholder implementations, or mocked production functions. Pre-existing permissive legacy code outside the new typed financial path was not globally rewritten. |

## Saved results and validation

| Check | Observed result |
|---|---|
| `pnpm check:stripe-payouts` | Passed: zero diagnostics in all 23 modified/new TypeScript files, with `strict=true` and `noImplicitAny=true`. Eight diagnostics in untouched dependencies are reported separately, not hidden as a whole-project pass. |
| `CREATORVAULT_PAYOUT_TEST_DATABASE_URL=... pnpm test:stripe-payouts` | Passed: 58 tests, including 26 actual-local-SQL / actual-Stripe-SDK HTTP-contract integration cases. No live Stripe calls occur. |
| Required integration configuration | Dedicated payout test command fails closed without the isolated database URL; it cannot silently claim a green integration run by skipping. The fixture rejects non-local hosts and any database other than `creatorvault_payout_test`. |
| Standard focused unit runner | TypeScript sources are prioritized over tracked legacy compiled CommonJS shadow files, so source tests do not import stale JavaScript copies. |
| `pnpm build:server` | Passed: actual bundled `server/_core/index.ts`, without starting the app or deploying. |
| `pnpm check` | Still exits 2 with the exact same eight pre-existing diagnostics captured before this task; no task diagnostics were added. |
| SQL migration | `0024_stripe_creator_net_payouts.sql` applied to the isolated local MariaDB database; unique charge, transfer, idempotency, group, and revenue-link constraints were inspected. No production database was touched. |
| Scope/whitespace | Exact Task 1 allowlist is registered in `scripts/scope-guard.js`; `git diff --check` and the task scope gate are included in final validation. |

Integration coverage includes actual-fee conservation/rounding, duplicate and concurrent claims, immutable retry keys/parameters, uncertain provider responses, missing/delayed fees, absent/inactive Connect accounts and activation, captured-charge ownership, profile-to-user mapping, concurrent PPV confirmation, unsafe arbitrary payment-intent rejection, initial/renewal invoices, refunds/reversals, refund/response races, historical cutoff, disable policy, non-USD isolation, signature rejection, Connect account binding, fresh onboarding links, and callback-origin validation. These are explicit isolated fixtures, not accepted real-creator evidence.

## Production prerequisites and recovery

Before any separately authorized rollout, confirm the repository's actual MySQL/Drizzle baseline and migration history, back up the production schema/data using the operator's approved process, and apply only the reviewed additive migration. The repository has older SQL files that are not in its journal; a blanket generation/push is not proof of a safe migration. Inspect existing column/index names before applying the migration. The payout-policy activation time is seeded at migration application, not code authoring time.

Verify Stripe standard actual-fee reporting, secret/webhook configuration, the trusted HTTPS application URL, the connected creator account's onboarding/transfers capability, and delivery of the relevant platform and connected-account webhook events. Use UTC database/server sessions. Refund/dispute and expired/ambiguous payout rows require an explicit reconciliation decision; do not reset them to ready or clear their idempotency identities blindly. Disabling the persisted rule stops new transfer requests but cannot revoke already in-flight or submitted transfers.

The historical production-VPS/document-access gap from the repository's master understanding was not resolved here. No provider mode/key, webhook subscription, account security setting, production release, or frontend surface was changed. No production release identifier exists for this task. The local task commit is identified by `git log -1 --format=%H -- STRIPE_CONNECT_NET_PAYOUTS_PROOF.md`; the externally delivered exact-diff report records its full hash after commit.

## Primary Stripe references

| Topic | Source |
|---|---|
| Actual processing fee and delayed expansion | https://docs.stripe.com/expand/use-cases |
| Separate charges, source-linked transfers, refunds and settlement currencies | https://docs.stripe.com/connect/separate-charges-and-transfers.md?platform=web&integration=checkout&ui=stripe-hosted |
| Marketplace Checkout and asynchronous payment events | https://docs.stripe.com/connect/marketplace/tasks/accept-payment/separate-charges-and-transfers |
| Transfer creation contract | https://docs.stripe.com/api/transfers/create |
| Idempotency behavior and key retention | https://docs.stripe.com/api/idempotent_requests |
