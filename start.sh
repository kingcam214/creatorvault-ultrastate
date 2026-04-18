#!/bin/bash
cd /root/creatorvault
set -a
source .env
set +a
exec node dist/index.cjs
