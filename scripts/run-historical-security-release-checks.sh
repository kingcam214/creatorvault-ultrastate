#!/usr/bin/env bash
set -euo pipefail
umask 077
root="$(git rev-parse --show-toplevel)"
baseline=3762e69c7bf5e59b3e6070085f2fbd4b3fb2c8da
[ "$#" -eq 0 ] || { printf 'HISTORICAL_CHECK_ARGUMENTS_FORBIDDEN\n' >&2; exit 1; }
[ -d "$root/node_modules" ] || { printf 'HISTORICAL_CHECK_DEPENDENCIES_MISSING\n' >&2; exit 1; }
snapshot="$(mktemp -d "${TMPDIR:-/tmp}/creatorvault-security-audit.XXXXXXXX")"
cleanup() { rm -rf -- "$snapshot"; }
trap cleanup EXIT
# This is a read-only historical test fixture, never a deployment or rollback.
git -C "$root" archive "$baseline" | tar -x -C "$snapshot"
ln -s "$root/node_modules" "$snapshot/node_modules"
cd -- "$snapshot"
export NODE_OPTIONS=--max-old-space-size=1536
pnpm exec vitest run --config vitest.security-release.config.ts
pnpm exec vitest run --config vitest.github-workflow-preflight.config.ts
pnpm exec tsx scripts/check-security-release-types.ts
bash -n deploy_work_to_prod.sh
printf 'HISTORICAL_SECURITY_RELEASE_CONTRACTS=PASS SHA=%s\n' "$baseline"
