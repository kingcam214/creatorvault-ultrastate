#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${REPO_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
SITE_ORIGIN="${CREATORVAULT_SITE_ORIGIN:-https://creatorvault.live}"
SITE_URL="${CREATORVAULT_SITE_URL:-${SITE_ORIGIN}/outreach}"
MARKER="${CREATORVAULT_DEPLOY_MARKER:-Acquisition War Room}"

cd "$REPO_DIR"
LOCAL_HEAD="$(git rev-parse HEAD)"
ORIGIN_HEAD="$(git rev-parse origin/main 2>/dev/null || git rev-parse HEAD)"

printf 'local_head=%s\n' "$LOCAL_HEAD"
printf 'origin_main=%s\n' "$ORIGIN_HEAD"

RELEASE_JSON="$(curl -fsSL --max-time 20 "${SITE_ORIGIN}/api/release" || true)"
printf 'live_release=%s\n' "${RELEASE_JSON:-unavailable}"

if [ -n "$RELEASE_JSON" ] && command -v node >/dev/null 2>&1; then
  LIVE_COMMIT="$(printf '%s' "$RELEASE_JSON" | node -e "let s=''; process.stdin.on('data',d=>s+=d); process.stdin.on('end',()=>{try{const r=JSON.parse(s); console.log(r.commit||r.gitSha||'')}catch{console.log('')}})")"
  if [ -n "$LIVE_COMMIT" ] && [ "$LIVE_COMMIT" != "$ORIGIN_HEAD" ]; then
    printf 'SYNC_FAIL: live release commit does not match GitHub origin/main. live=%s origin=%s\n' "$LIVE_COMMIT" "$ORIGIN_HEAD" >&2
    exit 20
  fi
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
curl -fsSL --max-time 30 "${SITE_ORIGIN}${ASSET_PATH}" -o "$ASSET_TMP"
if ! grep -Fq "$MARKER" "$ASSET_TMP"; then
  printf 'SYNC_FAIL: live bundle marker was not found: %s\n' "$MARKER" >&2
  exit 22
fi
printf 'SYNC_OK: public release and live bundle are verified without SSH: %s\n' "$MARKER"
