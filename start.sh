#!/bin/bash
cd /root/creatorvault
# Ensure /dist symlink exists for static file serving
if [ ! -L /dist ]; then
  ln -sf /root/creatorvault/dist /dist
fi
set -a
source .env
set +a
exec node dist/index.js
