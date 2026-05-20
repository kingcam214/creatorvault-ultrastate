#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${REPO_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
VPS_HOST="${CREATORVAULT_VPS_HOST:-134.199.202.69}"
VPS_USER="${CREATORVAULT_VPS_USER:-root}"
VPS_APP_DIR="${CREATORVAULT_VPS_APP_DIR:-/root/creatorvault}"
SSH_KEY="${CREATORVAULT_SSH_KEY:-$HOME/.ssh/creatorvault_deploy}"
SITE_URL="${CREATORVAULT_SITE_URL:-https://creatorvault.live/outreach}"
MARKER="${CREATORVAULT_DEPLOY_MARKER:-Acquisition War Room}"

cd "$REPO_DIR"
LOCAL_HEAD="$(git rev-parse HEAD)"
ORIGIN_HEAD="$(git rev-parse origin/main 2>/dev/null || git rev-parse HEAD)"
SSH_OPTS=(-i "$SSH_KEY" -o BatchMode=yes -o StrictHostKeyChecking=no -o UserKnownHostsFile="$HOME/.ssh/known_hosts" -o ConnectTimeout=15)

printf 'local_head=%s\n' "$LOCAL_HEAD"
printf 'origin_main=%s\n' "$ORIGIN_HEAD"

VPS_HEAD="$(ssh "${SSH_OPTS[@]}" "$VPS_USER@$VPS_HOST" "cd '$VPS_APP_DIR' && git rev-parse HEAD")"
printf 'vps_head=%s\n' "$VPS_HEAD"

if [[ "$VPS_HEAD" != "$ORIGIN_HEAD" ]]; then
  printf 'SYNC_FAIL: VPS head does not match GitHub origin/main.\n' >&2
  exit 20
fi

INDEX_HTML="$(curl -fsSL --max-time 20 "$SITE_URL")"
ASSET_PATH="$(printf '%s' "$INDEX_HTML" | grep -oE '/assets/index-[^" ]+\.js' | head -1 || true)"
if [[ -z "$ASSET_PATH" ]]; then
  printf 'SYNC_FAIL: could not locate live frontend asset from %s.\n' "$SITE_URL" >&2
  exit 21
fi
printf 'live_asset=%s\n' "$ASSET_PATH"

ASSET_TMP="$(mktemp)"
trap 'rm -f "$ASSET_TMP"' EXIT
curl -fsSL --max-time 30 "https://creatorvault.live${ASSET_PATH}" -o "$ASSET_TMP"
if ! grep -Fq "$MARKER" "$ASSET_TMP"; then
  printf 'SYNC_FAIL: live bundle is synced to commit but marker was not found: %s\n' "$MARKER" >&2
  exit 22
fi
printf 'SYNC_OK: VPS matches GitHub origin/main and live bundle contains marker: %s\n' "$MARKER"
