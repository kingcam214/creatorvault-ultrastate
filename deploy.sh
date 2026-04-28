#!/bin/bash
# CreatorVault Deploy Script — one command to deploy server changes to VPS
# Usage: ./deploy.sh [server|full]
#   server = rebuild server bundle only (fast, no OOM risk)
#   full   = SCP pre-built frontend + server bundles to VPS

set -e

VPS="root@134.199.202.69"
KEY="/home/ubuntu/.ssh/creatorvault_deploy"
SSH="ssh -i $KEY -o StrictHostKeyChecking=no"
SCP="scp -i $KEY -o StrictHostKeyChecking=no"
APP_DIR="/root/creatorvault"

echo "=== CreatorVault Deploy ==="

# Step 0: Test SSH
echo "[1/4] Testing SSH..."
$SSH $VPS "echo SSH_OK" || { echo "FATAL: SSH failed. Check /home/ubuntu/.ssh/creatorvault_deploy key."; exit 1; }

MODE=${1:-server}

if [ "$MODE" = "server" ]; then
  echo "[2/4] Building server bundle on VPS (esbuild only, no OOM)..."
  $SSH $VPS "cd $APP_DIR && npx esbuild server/_core/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist 2>&1 | tail -5"

elif [ "$MODE" = "full" ]; then
  echo "[2/4] SCP'ing frontend bundle to VPS..."
  # Find newest index bundle
  BUNDLE=$(ls -t dist/public/assets/index-*.js 2>/dev/null | head -1)
  if [ -z "$BUNDLE" ]; then
    echo "ERROR: No frontend bundle found in dist/public/assets/. Run vite build first."
    exit 1
  fi
  $SCP dist/public/index.html $VPS:$APP_DIR/dist/public/
  $SCP $BUNDLE $VPS:$APP_DIR/dist/public/assets/
  echo "  Deployed: $BUNDLE"
  
  echo "[3/4] Building server bundle on VPS..."
  $SSH $VPS "cd $APP_DIR && npx esbuild server/_core/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist 2>&1 | tail -5"
fi

echo "[4/4] Restarting PM2..."
$SSH $VPS "pm2 restart creatorvault && sleep 2 && pm2 list | grep creatorvault"

echo ""
echo "=== Deploy complete. Verifying live site... ==="
HTTP=$(curl -s -o /dev/null -w "%{http_code}" https://creatorvault.live/)
echo "HTTP status: $HTTP"
if [ "$HTTP" = "200" ]; then
  echo "LIVE: https://creatorvault.live — OK"
else
  echo "WARNING: Got HTTP $HTTP — check PM2 logs"
fi
