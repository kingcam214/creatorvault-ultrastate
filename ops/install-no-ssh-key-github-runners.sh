#!/usr/bin/env bash
set -euo pipefail

# Install GitHub self-hosted runners for CreatorVault without storing a private VPS SSH key in GitHub Actions.
# Run on the VPS as root. Registration tokens are short-lived and must be created from:
# GitHub repo -> Settings -> Actions -> Runners -> New self-hosted runner.

REPO_URL="${REPO_URL:-https://github.com/kingcam214/creatorvault-ultrastate}"
RUNNER_BASE="${RUNNER_BASE:-/opt/actions-runner}"
PROD_TOKEN="${PROD_TOKEN:-}"
PREVIEW_TOKEN="${PREVIEW_TOKEN:-}"
RUNNER_VERSION="${RUNNER_VERSION:-2.325.0}"
RUNNER_ARCHIVE="actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz"
RUNNER_DOWNLOAD_URL="https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/${RUNNER_ARCHIVE}"

fail() {
  printf '[runner-install:ERROR] %s\n' "$*" >&2
  exit 1
}

log() {
  printf '[runner-install] %s\n' "$*"
}

[ "$(id -u)" = "0" ] || fail "Run this on the VPS as root so the runner can deploy into /root/creatorvault and reload PM2."
[ -n "$PROD_TOKEN" ] || fail "Set PROD_TOKEN to the production self-hosted runner registration token."
[ -n "$PREVIEW_TOKEN" ] || log "PREVIEW_TOKEN not set; production runner will be installed and preview runner will be skipped."

command -v curl >/dev/null 2>&1 || fail "curl is required"
command -v tar >/dev/null 2>&1 || fail "tar is required"
command -v node >/dev/null 2>&1 || fail "node is required"
command -v pnpm >/dev/null 2>&1 || fail "pnpm is required"
command -v pm2 >/dev/null 2>&1 || npm install -g pm2

install_runner() {
  local name="$1"
  local labels="$2"
  local token="$3"
  local dir="${RUNNER_BASE}/${name}"

  log "installing ${name} runner in ${dir} with labels ${labels}"
  mkdir -p "$dir"
  cd "$dir"

  if [ ! -f ./config.sh ]; then
    curl -fsSL "$RUNNER_DOWNLOAD_URL" -o "$RUNNER_ARCHIVE"
    tar xzf "$RUNNER_ARCHIVE"
    rm -f "$RUNNER_ARCHIVE"
  fi

  if [ -f .runner ]; then
    log "${name} runner is already configured; removing old config before re-registering"
    ./config.sh remove --unattended --token "$token" || true
  fi

  ./config.sh \
    --unattended \
    --url "$REPO_URL" \
    --token "$token" \
    --name "$name" \
    --labels "$labels" \
    --work _work \
    --replace

  ./svc.sh install root
  ./svc.sh start
  ./svc.sh status || true
}

install_runner "creatorvault-production" "linux,creatorvault-production" "$PROD_TOKEN"

if [ -n "$PREVIEW_TOKEN" ]; then
  install_runner "creatorvault-preview" "linux,creatorvault-preview" "$PREVIEW_TOKEN"
fi

mkdir -p /root/creatorvault /root/creatorvault-preview

log "runner install complete"
log "production deploys now run on VPS with no CREATORVAULT_VPS_SSH_KEY secret"
