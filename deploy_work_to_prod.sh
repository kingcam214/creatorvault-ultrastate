#!/usr/bin/env bash
set -euo pipefail
umask 077

# One-time clean security release only. No credentials or signing keys are inputs.
# This script deliberately refuses the previous generic deploy/start/restart path.
fail() { printf '[creatorvault-security-release] FAIL %s\n' "$1" >&2; exit 1; }

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
[ -f scripts/securityReleaseRunner.ts ] || fail RELEASE_CONTROLLER_MISSING

# The controller captures all environment-bearing output in memory, reports only
# fixed failure codes, proves the active local source, stages the secure artifact,
# persists the key atomically, then uses PM2 reload --update-env exactly once.
exec pnpm exec tsx scripts/securityReleaseRunner.ts
