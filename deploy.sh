#!/usr/bin/env bash
set -euo pipefail

# CreatorVault local/server deploy wrapper.
# This script intentionally does not SSH/SCP anywhere and does not require a GitHub-stored VPS private key.
# Run it from inside the checked-out app directory on the production VPS or from the self-hosted runner workflow.

APP_DIR="${CREATORVAULT_APP_DIR:-$(pwd)}"
APP_NAME="${CREATORVAULT_PM2_APP:-creatorvault}"
RUN_BUILD="${RUN_BUILD:-true}"

log() {
  printf '[creatorvault-local-deploy] %s\n' "$*"
}

fail() {
  printf '[creatorvault-local-deploy:ERROR] %s\n' "$*" >&2
  exit 1
}

cd "$APP_DIR"
[ -f package.json ] || fail "package.json missing in ${APP_DIR}"

command -v pnpm >/dev/null 2>&1 || fail "pnpm is required"
command -v node >/dev/null 2>&1 || fail "node is required"

log "deploying locally from ${APP_DIR} with PM2 app ${APP_NAME}"
pnpm install --frozen-lockfile

if [ "$RUN_BUILD" = "true" ]; then
  pnpm build
fi

chmod +x ./deploy_work_to_prod.sh
CREATORVAULT_PM2_APP="$APP_NAME" ./deploy_work_to_prod.sh
