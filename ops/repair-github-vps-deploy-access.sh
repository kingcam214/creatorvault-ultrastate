#!/usr/bin/env bash
set -euo pipefail

# CreatorVault deploy-access repair.
# This no longer creates SSH keys and no longer stores a VPS private key in GitHub Actions.
# Run this on the production VPS as root after creating short-lived GitHub runner registration tokens.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="${REPO:-kingcam214/creatorvault-ultrastate}"

log() { printf '[deploy-access-repair] %s\n' "$*"; }
fail() { printf '[deploy-access-repair:ERROR] %s\n' "$*" >&2; exit 1; }

[ "$(id -u)" = "0" ] || fail "Run this on the VPS as root. It installs/repairs local GitHub runner services."
[ -x "$SCRIPT_DIR/install-no-ssh-key-github-runners.sh" ] || fail "Missing executable: $SCRIPT_DIR/install-no-ssh-key-github-runners.sh"

cat <<'MSG'
CreatorVault deployment now uses GitHub self-hosted runners on the VPS.
It does not use CREATORVAULT_VPS_SSH_KEY, appleboy/ssh-action, appleboy/scp-action, or a GitHub-stored private VPS key.

Before running this script, create short-lived runner registration tokens:

  GitHub repo -> Settings -> Actions -> Runners -> New self-hosted runner

Then run, on the VPS:

  PROD_TOKEN=<production_runner_token> PREVIEW_TOKEN=<preview_runner_token_optional> ./ops/repair-github-vps-deploy-access.sh

MSG

[ -n "${PROD_TOKEN:-}" ] || fail "Set PROD_TOKEN to the short-lived production self-hosted runner registration token."

REPO_URL="https://github.com/${REPO}" "$SCRIPT_DIR/install-no-ssh-key-github-runners.sh"

log "repair complete. Re-run the GitHub Actions deployment workflow; it should schedule on the VPS runner instead of asking for a private SSH key secret."
