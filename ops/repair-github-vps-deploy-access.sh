#!/usr/bin/env bash
set -euo pipefail

# Repairs CreatorVault GitHub Actions -> VPS deployment access permanently.
# Run from a trusted machine that has:
#   1. GitHub CLI authenticated with permission to set repo Actions secrets.
#   2. SSH access to the VPS as the deployment user, usually root.
#
# Example:
#   VPS_HOST=203.0.113.10 VPS_USER=root ./ops/repair-github-vps-deploy-access.sh
#
# Optional:
#   REPO=kingcam214/creatorvault-ultrastate KEY_PATH=$HOME/.ssh/creatorvault_actions_deploy ./ops/repair-github-vps-deploy-access.sh

REPO="${REPO:-kingcam214/creatorvault-ultrastate}"
VPS_HOST="${VPS_HOST:-}"
VPS_USER="${VPS_USER:-root}"
KEY_PATH="${KEY_PATH:-$HOME/.ssh/creatorvault_actions_deploy}"
REMOTE_PROJECT_DIR="${REMOTE_PROJECT_DIR:-/root/creatorvault}"
APP_NAME="${CREATORVAULT_PM2_APP:-creatorvault}"

log() { printf '[deploy-access-repair] %s\n' "$*"; }
fail() { printf '[deploy-access-repair:ERROR] %s\n' "$*" >&2; exit 1; }

[ -n "$VPS_HOST" ] || fail "Set VPS_HOST before running, for example: VPS_HOST=your.server.ip VPS_USER=root $0"
command -v ssh >/dev/null 2>&1 || fail "ssh is required"
command -v ssh-keygen >/dev/null 2>&1 || fail "ssh-keygen is required"
command -v gh >/dev/null 2>&1 || fail "GitHub CLI gh is required"

gh auth status >/dev/null 2>&1 || fail "gh is not authenticated. Run: gh auth login"

mkdir -p "$(dirname "$KEY_PATH")"
chmod 700 "$(dirname "$KEY_PATH")"

if [ ! -f "$KEY_PATH" ]; then
  log "creating dedicated ed25519 deploy key at $KEY_PATH"
  ssh-keygen -t ed25519 -f "$KEY_PATH" -N "" -C "creatorvault-github-actions-deploy@$(date +%Y%m%d)"
else
  log "using existing deploy key at $KEY_PATH"
fi

chmod 600 "$KEY_PATH"
PUB_KEY="$(cat "$KEY_PATH.pub")"

log "installing public key for ${VPS_USER}@${VPS_HOST}"
ssh -o StrictHostKeyChecking=accept-new "${VPS_USER}@${VPS_HOST}" "mkdir -p ~/.ssh && chmod 700 ~/.ssh && touch ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && grep -qxF '$PUB_KEY' ~/.ssh/authorized_keys || echo '$PUB_KEY' >> ~/.ssh/authorized_keys"

log "setting GitHub Actions deployment secrets on ${REPO}"
printf '%s' "$VPS_HOST" | gh secret set CREATORVAULT_VPS_HOST --repo "$REPO" --body-file -
printf '%s' "$VPS_USER" | gh secret set CREATORVAULT_VPS_USER --repo "$REPO" --body-file -
gh secret set CREATORVAULT_VPS_SSH_KEY --repo "$REPO" < "$KEY_PATH"

log "verifying passwordless SSH and read-only VPS state"
ssh -i "$KEY_PATH" -o BatchMode=yes -o StrictHostKeyChecking=accept-new "${VPS_USER}@${VPS_HOST}" "set -e; echo deploy-ssh-ok; hostname; whoami; test -d '$REMOTE_PROJECT_DIR' && echo project-dir-present || echo project-dir-missing; command -v pm2 >/dev/null 2>&1 && pm2 describe '$APP_NAME' >/dev/null 2>&1 && echo pm2-app-present || echo pm2-app-not-verified"

log "repair complete. Re-run the failed GitHub Actions deployment workflow for ${REPO}."
