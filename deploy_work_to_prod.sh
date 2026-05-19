#!/usr/bin/env bash
set -euo pipefail

# CreatorVault production deploy entrypoint.
# This script is intentionally committed so GitHub Actions and the VPS use the same deploy path.

APP_NAME="${CREATORVAULT_PM2_APP:-creatorvault}"
APP_ENTRY="${CREATORVAULT_APP_ENTRY:-dist/index.js}"
APP_PORT="${PORT:-5000}"
HEALTH_PATH="${CREATORVAULT_HEALTH_PATH:-/api/health}"
RELEASE_FILE="public/release.json"

log() {
  printf '[creatorvault-deploy] %s\n' "$*"
}

fail() {
  printf '[creatorvault-deploy:ERROR] %s\n' "$*" >&2
  exit 1
}

log "starting deploy in $(pwd)"

command -v node >/dev/null 2>&1 || fail "node is not installed or not in PATH"
command -v pnpm >/dev/null 2>&1 || fail "pnpm is not installed or not in PATH"

if ! command -v pm2 >/dev/null 2>&1; then
  log "pm2 missing; installing pm2 globally with npm"
  command -v npm >/dev/null 2>&1 || fail "npm is required to install pm2"
  npm install -g pm2
fi

[ -f package.json ] || fail "package.json missing; wrong working directory"
[ -f "$APP_ENTRY" ] || fail "$APP_ENTRY missing; pnpm build must complete before deployment"
[ -f "$RELEASE_FILE" ] || log "$RELEASE_FILE not found; continuing without release stamp"

mkdir -p logs uploads tmp

log "node=$(node --version) pnpm=$(pnpm --version) app=${APP_NAME} entry=${APP_ENTRY} port=${APP_PORT}"

if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  log "reloading existing pm2 app ${APP_NAME}"
  pm2 reload "$APP_NAME" --update-env
else
  log "starting new pm2 app ${APP_NAME}"
  NODE_ENV=production PORT="$APP_PORT" pm2 start "$APP_ENTRY" --name "$APP_NAME" --time --update-env
fi

pm2 save || log "pm2 save failed; process is still running but resurrection state may not be persisted"

log "pm2 status for ${APP_NAME}"
pm2 describe "$APP_NAME" >/dev/null 2>&1 || fail "pm2 app ${APP_NAME} is not registered after deploy"
pm2 jlist | APP_NAME="$APP_NAME" node -e "let data='';process.stdin.on('data',d=>data+=d);process.stdin.on('end',()=>{const apps=JSON.parse(data||'[]');const app=apps.find(a=>a.name===process.env.APP_NAME); if(!app){process.exit(2)}; console.log(JSON.stringify({name:app.name,status:app.pm2_env.status,restarts:app.pm2_env.restart_time,pid:app.pid},null,2)); if(app.pm2_env.status!=='online') process.exit(3);})" || fail "pm2 app ${APP_NAME} is not online"

if command -v curl >/dev/null 2>&1; then
  log "health probe http://127.0.0.1:${APP_PORT}${HEALTH_PATH}"
  if curl -fsS --max-time 8 "http://127.0.0.1:${APP_PORT}${HEALTH_PATH}" >/tmp/creatorvault-health.txt 2>/tmp/creatorvault-health.err; then
    log "health probe passed"
  else
    log "health probe did not pass; showing recent pm2 logs and continuing only if process is online"
    cat /tmp/creatorvault-health.err >&2 || true
    pm2 logs "$APP_NAME" --lines 40 --nostream || true
  fi
fi

log "deploy complete"
