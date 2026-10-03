#!/usr/bin/env bash
set -euo pipefail
umask 077

# Owner-approved feature consolidation. Existing security and signing epoch are retained.
# The completed one-time rotation controller is historical and is not invoked here.
fail() { printf '[creatorvault-consolidated-release] FAIL %s\n' "$1" >&2; exit 1; }

[ "$#" -eq 0 ] || fail UNSUPPORTED_ARGUMENTS
[ "$(id -u)" -eq 0 ] || fail EXISTING_ROOT_DEPLOY_CONTEXT_REQUIRED
[ "${CREATORVAULT_RELEASE_REF:-}" = 'refs/heads/main' ] || fail UNAPPROVED_REF
[ "${CREATORVAULT_RELEASE_EVENT:-}" = 'push' ] || fail UNAPPROVED_EVENT
[ -n "${CREATORVAULT_RELEASE_SHA:-}" ] || fail MISSING_RELEASE_SHA
[ -n "${CREATORVAULT_RELEASE_WORKSPACE:-}" ] || fail MISSING_CHECKOUT_WORKSPACE

command -v pnpm >/dev/null 2>&1 || fail PNPM_MISSING
command -v node >/dev/null 2>&1 || fail NODE_MISSING
command -v pm2 >/dev/null 2>&1 || fail PM2_MISSING
cd -- "$CREATORVAULT_RELEASE_WORKSPACE"
[ -f scripts/consolidatedReleaseRunner.ts ] || fail RELEASE_CONTROLLER_MISSING
[ -f dist/consolidated-release-runtime.mjs ] || fail BUILT_RELEASE_CONTROLLER_MISSING

# Only fixed error codes and verified nonsecret release metadata are emitted.
# The controller owns preflight, protected backup, additive migrations,
# artifact activation, one reload, live verification and fixture cleanup.
exec env -u NODE_OPTIONS -u NODE_PATH -u NODE_DEBUG -u NODE_DEBUG_NATIVE \
  -u DEBUG -u BASH_ENV -u ENV -u LD_PRELOAD -u LD_LIBRARY_PATH \
  node "$PWD/dist/consolidated-release-runtime.mjs"
