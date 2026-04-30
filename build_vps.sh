#!/bin/bash
set -e
cd /root/creatorvault

# Build server only first (lightweight)
echo "=== Building server ==="
NODE_OPTIONS='--max-old-space-size=512' npx esbuild server/_core/index.ts \
  --platform=node \
  --packages=external \
  --bundle \
  --format=esm \
  --outdir=dist \
  2>&1 | tail -5

echo "=== Server build done ==="

# Build client with chunk splitting to reduce peak memory
echo "=== Building client ==="
NODE_OPTIONS='--max-old-space-size=1200' npx vite build \
  --config vite.config.ts \
  2>&1 | tail -20

echo "=== Client build done ==="
echo "=== Restarting PM2 ==="
pm2 restart all 2>&1 | tail -5
pm2 status
