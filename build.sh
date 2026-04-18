#!/usr/bin/env bash
set -e

esbuild server/_core/index.ts --bundle --platform=node --format=esm --outfile=dist/index.js --packages=external --loader:.node=file
