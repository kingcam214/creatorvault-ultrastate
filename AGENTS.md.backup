# AGENTS.md

## Project
CreatorVault is a production platform with:
- React + Vite frontend
- Node + TypeScript backend
- PM2 process management
- VPS-hosted production environment
- Public domain: https://creatorvault.live

## Mission
Make careful, surgical improvements to the real CreatorVault codebase without breaking production, losing working UI, or claiming false success.

## Canonical environments
- Production VPS app root: `/root/creatorvault`
- Production domain: `https://creatorvault.live`
- PM2 manages the production process
- The live app has previously suffered from:
  - white screens
  - reverted frontends being served instead of intended builds
  - false-success reports based on curl/PM2 only
  - backend fixes that did not actually restore the correct frontend

## Non-negotiable rules
1. Never claim success from:
   - `pm2 status`
   - `curl -I`
   - HTTP 200 responses
   - localhost-only verification
2. Success requires confirming that the intended live UI is visibly rendered at the public URL.
3. Always trace the full chain:
   - source file
   - build output
   - deployed artifact
   - public URL result
4. Do not do blind rewrites or replace whole directories unless explicitly authorized.
5. Preserve working UI. Take backups or use Git branches before risky edits.
6. Explain what you inspected before changing code.
7. If verification is incomplete, say so clearly.

## Frontend rules
- Identify the exact frontend entry point before editing.
- Identify where navigation is defined before changing routes.
- Confirm whether the built frontend being served live actually contains the intended changes.
- If the live site shows old/reverted UI, determine which artifact/path is actually being served.
- Prefer minimal, targeted edits over framework-wide rewiring.

## Backend rules
- Do not treat backend health as proof of frontend correctness.
- If fixing build/server issues, document exactly how static assets are resolved in production.
- Be careful with ESM/CJS boundaries, path resolution, and Vite production serving.

## Change workflow
For every task:
1. Summarize the issue in plain English.
2. List the files you inspected.
3. Identify likely root cause.
4. Propose a minimal fix plan.
5. Make the edits.
6. Run relevant build/test/lint commands.
7. Verify the live result in visible UI terms.
8. Report remaining uncertainty honestly.

## Required output format
Always respond with:
- Problem understanding
- Files inspected
- Root cause
- Files changed
- Commands run
- Build/deploy artifact path
- Visible verification result
- Risks / remaining questions

## Safe-change preference
Default to:
- creating a branch
- making a scoped fix
- showing diff summary
- recommending PR/merge workflow

Avoid:
- massive refactors
- speculative “cleanup”
- changing unrelated subsystems during a fix
- reporting “done” before visual confirmation

## Current priorities
1. Stabilize the currently recovered frontend.
2. Restore and preserve reliable navigation.
3. Ensure source/build/deploy alignment.
4. Document the working deployment path.
5. Make future fixes reproducible and auditable.

## Business context
CreatorVault is founder-built under tight budget constraints. Wasted credits and false-success reports are costly. Optimize for reliability, clarity, and preserving momentum.
