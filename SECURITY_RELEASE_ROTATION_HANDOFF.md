# CreatorVault — Final Integrated Security Release

## Release contract

The final candidate is prepared on `release/creatorvault-security-final` as exactly one direct, non-merge child of production baseline `46d3021a1bd09222a61ff1390c9cfe8f82d06422`. No intermediate release commit is a prerequisite. The final SHA is determined by Git only after closure and all local validation pass; it is not embedded in its own source.

**NOT PUSHED. NOT MERGED. NOT DEPLOYED.** This preparation does not access the VPS, rotate an actual signing key, execute PM2, create a production account, or call a media/payment provider. A successful local candidate audit is not proof of a completed production deployment or full platform launch.

## Security content and exclusions

The release permanently retires `/api/dev-login`, uses the actual authenticated database user's owner/admin role before privileged procedures, removes numeric-ID-only authority shortcuts, preserves ordinary authentication and creator/purchaser-owned resource checks, and includes the eight reviewed compiler corrections. Existing media/router files receive only reviewed authorization or compiler changes; provider execution, spend controls, product behavior, payment calculations, and generation capabilities are not expanded.

No migration, schema, dependency, lockfile, Stripe, payout, Persona, continuity, Telegram, AI/media generation, Video Studio, or feature-branch implementation is added. The only allowed package manifest delta adds `test:security` and `check:security`; all existing commands and non-script metadata are frozen.

## Closed immutable policy

`APPROVED_RELEASE_PATHS` in `scripts/securityReleasePolicy.ts` is the sole exact changed-file set. It includes this record, the workflow itself, security changes, all tests/configs, the runner/verification/boot-safety modules, and the real GitHub workflow-permission parser. No prefix or glob file allowance is accepted. Missing, duplicate, deleted/symlinked, or extra paths fail. Reviewed application bytes are additionally SHA-256 pinned in `scripts/securityReleaseIntegrity.ts`.

Every entry path requires the expected baseline parent, a non-merge parent string, exactly one commit after baseline, exact event SHA equal to HEAD, main/push, and the push's `before` value equal to baseline. Later commits, merge commits, replay against a changed baseline, uncommitted changes, modified dependencies/lockfiles, and unapproved application bytes fail closed. The actual immutable Git tree supplies file existence and contents. The closure audit verifies all workflow/security-package script references exist and gates occur in order. No final SHA or intermediate SHA is hard-coded as an acceptance dependency; the baseline and event SHA bind the one deployment.

## Existing runner path and gates

The only production entry is the existing `main` push workflow on `creatorvault-production`, invoking `deploy_work_to_prod.sh`. It runs, in order:

1. Main/push, baseline event/parent and one-commit preflight; frozen manifest/lockfile proof; isolated non-symlink build root.
2. Frozen install; committed-tree integrity and controller checkout proof.
3. Security tests and strict security check.
4. Controlled-release/integrity tests; permission-parser tests; strict release check; shell syntax.
5. Full type check and full build.
6. Guarded-artifact preparation and public release stamping.
7. Existing root-side controlled transaction and PM2 environment-refresh reload.

The real non-mutating GitHub App permission probe is run locally before a future push using the configured GitHub connection. It is not run with the Actions read-only token, which has no workflow-file write capability. It uses clean `--jq .content` stdout followed by an impossible-SHA `--silent` PUT and accepts only the exact 409 diagnostic. It cannot create a commit. Every other response fails closed.

## Runtime JWT proof and one rotation

The retained controller proves the actual active signing-source mechanism and writable protected file before mutation. `/root/creatorvault/.env` is a candidate, not an assumed source. It requires the existing root PM2 context, approved baseline launcher or explicit supported dotenv override, actual key agreement, static source semantics, metadata predating process startup, no debug/preload hooks, and a root-owned regular single-link `0600` file. Unknown provenance or unavailable OS/runtime prerequisites stop without generating or persisting a key.

The same bounded transient supervisor and shared environment-writer lock guard the transaction. It stages and byte-verifies the secure artifact, then generates one new key on the VPS only during a separately approved deployment, writes only `JWT_SECRET` using exclusive temporary storage/fsync/atomic rename, and executes the established `pm2 reload creatorvault --update-env`. A durable non-secret intent journal precedes atomic persistence. No reload occurs after a failed key write. Secrets, cookie values, passwords, full PM2 environment data, and raw logs are never reported.

Artifact activation also has a durable `activation-intent` record before its first live rename. An interruption in activation or staging forces a safe app stop; the new artifact cannot boot using the old key. Boot requires either a fully verified journal or a durably rotated key plus the active matching supervisor. The controller never restores the insecure prior artifact after activation begins.

After rotation, errors are forward-only: the old key/insecure artifact are never restored. The independent guard and boot gate prevent unverified resurrection. No manual restart path, force push, alternate server deployment, migration, or retry is provided.

## Future mandatory live proof

The approved future workflow must verify final main/live SHA, GET/POST/PUT development-login 404 with no cookie/redirect, real pre-rotation session 401, a fresh native ordinary login, ordinary user's safe owner-only read 403, trusted owner's same read 200, and stable online PM2/new PID with no serious errors in its bounded log window.

Native login proof uses one precisely owned temporary `.invalid` ordinary account provisioned only during the future deployment. Its random password and sessions stay in memory. The exact fixture is cleaned on success/failure; existing users' records are not repurposed. Owner role proof uses a currently trusted database owner for a safe read, not a fabricated role. No creator enrollment, purchase, message, or paid generation is triggered.

## Local validation and handoff

Before the sole local commit: frozen install, focused security tests, strict security types, full compiler, full build, release/integrity suite, parser suite, strict release types, YAML/shell validation, real no-commit permission probe, full baseline diff/type/credential audit, and staged immutable-tree closure. After that commit: rerun the exact committed-tree workflow/controller policy, accepted/rejected simulations, verify one baseline child and clean tree. Complete command logs and exact final identity accompany the external final report.

Production runtime/source permissions and post-deployment results remain untested in this local-only run. They are explicit gates in the future workflow, not inferred successes. The next authorized action requires owner approval of the final immutable SHA and a single main fast-forward deployment run.
