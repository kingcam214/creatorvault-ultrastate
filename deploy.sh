#!/usr/bin/env bash
set -Eeuo pipefail

# CreatorVault production deployment script
# Steps: git pull -> pnpm install -> pnpm build -> (optional) pnpm test -> pm2 reload
# Includes rollback on failure.

APP_DIR="${APP_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"
BRANCH="${BRANCH:-main}"
REMOTE="${REMOTE:-origin}"
PM2_APP_NAME="${PM2_APP_NAME:-}"
HEALTHCHECK_URL="${HEALTHCHECK_URL:-https://creatorvault.live}"
RUN_TESTS="${RUN_TESTS:-true}"

PRE_DEPLOY_COMMIT=""
ROLLBACK_ENABLED="false"

log() {
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    log "ERROR: Required command '$1' is not installed."
    exit 1
  fi
}

detect_pm2_app_name() {
  if [[ -n "$PM2_APP_NAME" ]]; then
    echo "$PM2_APP_NAME"
    return
  fi

  local detected
  detected="$(pm2 jlist | node -e '
let raw = "";
process.stdin.on("data", c => (raw += c));
process.stdin.on("end", () => {
  const list = JSON.parse(raw || "[]");
  if (list.length === 1 && list[0]?.name) process.stdout.write(list[0].name);
});
' 2>/dev/null || true)"

  if [[ -n "$detected" ]]; then
    echo "$detected"
    return
  fi

  log "ERROR: Could not auto-detect PM2 process name."
  log "Set it explicitly, e.g.: PM2_APP_NAME=creatorvault-ultrastate ./deploy.sh"
  exit 1
}

validate_pm2_watch_disabled() {
  local app_name="$1"
  local watch_value

  watch_value="$(pm2 jlist | node -e '
let raw = "";
process.stdin.on("data", c => (raw += c));
process.stdin.on("end", () => {
  const appName = process.argv[1];
  const list = JSON.parse(raw || "[]");
  const app = list.find(p => p?.name === appName);
  if (!app) process.exit(2);
  const value = app?.pm2_env?.watch;
  process.stdout.write(String(value));
});
' "$app_name" 2>/dev/null || true)"

  if [[ "$watch_value" == "true" ]]; then
    log "ERROR: PM2 watch mode is enabled for '$app_name'. Disable it in production."
    log "Hint: pm2 set pm2:watch false OR update ecosystem config with watch: false"
    exit 1
  fi

  log "Verified PM2 watch mode is disabled for '$app_name' (watch=$watch_value)."
}

rollback() {
  trap - ERR

  if [[ "$ROLLBACK_ENABLED" != "true" || -z "$PRE_DEPLOY_COMMIT" ]]; then
    log "Rollback skipped (deployment failed before pull/update stage)."
    exit 1
  fi

  log "Starting rollback to commit $PRE_DEPLOY_COMMIT ..."
  git reset --hard "$PRE_DEPLOY_COMMIT"

  log "Reinstalling dependencies for rollback state..."
  pnpm install

  log "Rebuilding rollback state..."
  pnpm build

  if [[ "$RUN_TESTS" == "true" ]]; then
    log "Running tests for rollback state..."
    pnpm test
  fi

  local app_name
  app_name="$(detect_pm2_app_name)"

  log "Reloading PM2 app '$app_name' to restore prior release..."
  pm2 reload "$app_name" --update-env
  validate_pm2_watch_disabled "$app_name"

  log "Rollback completed successfully."
  exit 1
}

on_error() {
  local exit_code=$?
  local line_no=${1:-unknown}
  log "ERROR: Deployment failed at line $line_no (exit code: $exit_code)."
  rollback
}

trap 'on_error $LINENO' ERR

require_cmd git
require_cmd pnpm
require_cmd pm2
require_cmd node
require_cmd curl

cd "$APP_DIR"

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  log "ERROR: $APP_DIR is not a git repository."
  exit 1
fi

if ! git diff --quiet || ! git diff --cached --quiet; then
  log "ERROR: Working tree has uncommitted changes. Commit/stash before deploy."
  exit 1
fi

PRE_DEPLOY_COMMIT="$(git rev-parse HEAD)"
log "Current commit: $PRE_DEPLOY_COMMIT"

log "Fetching latest changes from $REMOTE/$BRANCH..."
git fetch "$REMOTE" "$BRANCH"

log "Pulling latest changes (fast-forward only)..."
git pull --ff-only "$REMOTE" "$BRANCH"
ROLLBACK_ENABLED="true"

NEW_COMMIT="$(git rev-parse HEAD)"
log "Updated to commit: $NEW_COMMIT"

log "Installing/updating dependencies..."
pnpm install

log "Running production build..."
pnpm build

if [[ "$RUN_TESTS" == "true" ]]; then
  log "Running tests before reload..."
  pnpm test
else
  log "Skipping tests (RUN_TESTS=$RUN_TESTS)."
fi

APP_NAME="$(detect_pm2_app_name)"
log "Reloading PM2 app '$APP_NAME' (no restart)..."
pm2 reload "$APP_NAME" --update-env
validate_pm2_watch_disabled "$APP_NAME"

log "Running health check: $HEALTHCHECK_URL"
curl --fail --silent --show-error --max-time 20 "$HEALTHCHECK_URL" >/dev/null

log "Deployment completed successfully."
log "Deployed commit: $NEW_COMMIT"
