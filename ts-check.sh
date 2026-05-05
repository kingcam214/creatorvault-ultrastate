#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# ts-check.sh — Quick TypeScript check with clear pass/fail output
# Usage: ./ts-check.sh
# ─────────────────────────────────────────────────────────────────────────────

cd "$(dirname "$0")"

echo "Running TypeScript check..."
ERRORS=$(npx tsc --noEmit 2>&1)
ERROR_COUNT=$(echo "$ERRORS" | grep "error TS" | wc -l)

if [ "$ERROR_COUNT" -gt "0" ]; then
  echo ""
  echo "❌ FAILED: $ERROR_COUNT TypeScript error(s)"
  echo ""
  echo "$ERRORS" | grep "error TS"
  echo ""
  exit 1
else
  echo "✅ PASSED: 0 TypeScript errors"
  exit 0
fi
