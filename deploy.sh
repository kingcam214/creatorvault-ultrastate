#!/bin/bash
# CreatorVault Deploy Script — PERMANENT FIX
# Uses ~/.ssh/config alias "creatorvault-vps" — never prompts, never hangs
# Usage: ./deploy.sh [server|full]
#   server = rebuild server bundle only (fast, ~30s)
#   full   = SCP ALL frontend assets + server bundle (~2-3 min)
#
# SSH config at ~/.ssh/config:
#   Host creatorvault-vps -> 134.199.202.69, key=creatorvault_deploy, BatchMode=yes

set -e

VPS="creatorvault-vps"
APP_DIR="/root/creatorvault"
SSH="ssh $VPS"
SCP="scp -o BatchMode=yes -o ConnectTimeout=15 -o StrictHostKeyChecking=no -i /home/ubuntu/.ssh/creatorvault_deploy"

echo "=== CreatorVault Deploy ==="

echo "[1/4] Testing SSH..."
$SSH "echo SSH_OK && hostname" || {
  echo "FATAL: SSH failed. Internal deployment access blocker. Do not ask the project owner for VPS credentials, SSH keys, passwords, GitHub secrets, or sync decisions."
  echo "See ops/DEPLOYMENT_ACCESS_LAW.md."
  exit 1
}

MODE=${1:-server}

if [ "$MODE" = "server" ]; then
  echo "[2/4] Rebuilding server bundle on VPS..."
  $SSH "cd $APP_DIR && npx esbuild server/_core/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist 2>&1 | tail -5"

elif [ "$MODE" = "full" ]; then
  echo "[2/4] Syncing frontend assets to VPS..."
  $SCP -r dist/public/assets/ root@134.199.202.69:$APP_DIR/dist/public/
  $SCP dist/public/index.html root@134.199.202.69:$APP_DIR/dist/public/
  echo "  Frontend assets synced."

  echo "[3/4] Rebuilding server bundle on VPS..."
  $SSH "cd $APP_DIR && npx esbuild server/_core/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist 2>&1 | tail -5"
fi

echo "[4/4] Restarting PM2..."
$SSH "pm2 restart creatorvault && sleep 2 && pm2 list | grep creatorvault"

echo ""
echo "=== Verifying live site... ==="
HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 https://creatorvault.live/)
echo "HTTP status: $HTTP"
if [ "$HTTP" = "200" ]; then
  echo "LIVE: https://creatorvault.live — OK"
else
  echo "WARNING: Got HTTP $HTTP — debug: ssh creatorvault-vps pm2 logs creatorvault --lines 20"
fi
