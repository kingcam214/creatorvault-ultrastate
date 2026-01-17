#!/bin/bash
# Push better-sqlite3 fix to GitHub

set -e

echo "=========================================="
echo "Push better-sqlite3 Fix to GitHub"
echo "=========================================="
echo ""
echo "Repository: kingcam214/creatorvault-ultrastate"
echo "Branch: main"
echo "Commit: Remove better-sqlite3 dependency for Railway deployment"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Are you in the project root?"
    exit 1
fi

echo "✓ Found package.json"
echo ""

# Push to GitHub
echo "Pushing to GitHub..."
echo "You will be prompted for your GitHub credentials"
echo ""

git push origin main

echo ""
echo "=========================================="
echo "✅ Push complete!"
echo "=========================================="
echo ""
echo "Railway will now be able to deploy successfully."
echo "Check deployment status at: https://railway.app/dashboard"
echo ""
