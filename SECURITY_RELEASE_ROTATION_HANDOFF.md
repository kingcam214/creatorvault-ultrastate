# CreatorVault — Final Integrated Security Release

## Current authorized recovery — October 3, 2026

Main is `985144d35c40d294cf5548c7ba5d0110cbd82910`; the last verified live baseline remains `46d3021a1bd09222a61ff1390c9cfe8f82d06422`. Workflow `37130961582` passed every test, compiler, build and guarded-artifact gate, root-side runtime/source proof, ordinary native login, old-key signature and authenticated ordinary-session checks. The preserved rejection is `PRE_RELEASE_OWNER_READ_FAILED`, phase `preflight`, recovery `NONE`. Baseline source shows the chosen stats route accepts legacy `owner`/`admin`, not the verifier's supported `king`/`admin` roles. Artifact activation, JWT rotation and PM2 reload have not occurred. Exact-path permission repairs preserved source bytes, and no excluded feature has been activated.

The next verifier-only maintenance child keeps actual pre-release owner access mandatory, using the existing non-mutating `waitlist.getAll` endpoint. Its baseline `kingProcedure` explicitly permits exactly trusted database `king`/`admin` roles; response data must be an actual list and stays in memory without output or persistence. No existing account, role, password, database permission, product route or application byte is changed. All post-release checks still use the security-fixed stats endpoint: old session 401, fresh ordinary login and rotated-key signature, ordinary owner-read 403, and existing trusted owner 200 with numeric total. The committed diagnostic correction preserves only a fixed preflight error code without changing failure phases or rotation safety.

The committed PM2 maintenance addresses its [official fork-container process-title rewrite](https://raw.githubusercontent.com/Unitech/pm2/master/lib/ProcessContainerFork.js): `process.title` becomes `node ` plus the absolute app entry. Linux may expose that as one command-line argument, not separate executable/script arguments. The controller accepts only the exact one-argument title `node /root/creatorvault/dist/index.js`, only with the same canonical PM2 launcher and already verified application-dotenv source. Kernel Node executable, root process identity, working directory, static dotenv import, protected source lifetime, inherited-key agreement or absence, old-session signature and real owner read remain mandatory. Arbitrary names, other paths, extra arguments, unverified source and mismatched inherited keys remain rejected.

The maintenance successor verifies the active root-owned, unchanged Node entry's static `dotenv/config` import against the baseline startup source, exact working directory, approved Node container and canonical `.env` path. A real existing-key login signature is still mandatory before mutation. The guarded new entry then loads only `JWT_SECRET` from the root-protected rotated source after boot authorization and before the unchanged application import. This avoids stale PM2 inheritance without changing any provider variable or writing the new key into PM2's cached environment. The actual active Node entry may receive the same narrowly targeted byte-preserving ownership/mode correction as the old launcher.

The owner authorizes completing this same security deployment and necessary narrowly scoped production maintenance. The existing controller now inspects only metadata, ACL availability and the actual root service identity before repairing exact application-root, secret, launcher, active-artifact-directory and optional log-directory ownership/modes. It does not recursively chmod/chown, change file contents, expose credentials, change accounts/SSH/firewall/database/provider settings, or deploy features. Secret bytes are verified unchanged and cleared from memory. Permission-only ctime changes are accepted only with a root-protected metadata record tied to the same process lifetime and exact unchanged source identity; actual signing-source, launcher bytes and live-login verification remain required.

The live result is not inferred from this record: the existing production workflow, its sanitized controller result, verified journal, and public release stamp supply the final outcome. All original feature exclusions and forward-only rotation safeguards remain in force. Later historical preparation statements below are not current release-status evidence.

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
