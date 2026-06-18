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

## Production Access Rule (NO PERMANENT GITHUB SSH KEY)

**Do not require or restore `CREATORVAULT_VPS_SSH_KEY` as a GitHub Actions secret.** The production deployment path is now a server-side workflow: GitHub checks out code on a self-hosted runner that lives on the production VPS, builds the release there, syncs it into `/root/creatorvault`, and reloads PM2 locally. This removes the old pattern where GitHub stored a private VPS key and pushed files over SSH/SCP.

### VPS Coordinates
```
Host:     134.199.202.69
User:     root
Provider: DigitalOcean ATL1
App dir:  /root/creatorvault
PM2 app:  creatorvault
Runner:   self-hosted labels linux, creatorvault-production
```

### Production Deploy Truth
- Deployments should run from GitHub Actions on the production server itself.
- The workflow file is `.github/workflows/deploy.yml`.
- The workflow must not use `appleboy/ssh-action`, `appleboy/scp-action`, or `CREATORVAULT_VPS_SSH_KEY`.
- If the workflow is queued or skipped, fix the self-hosted runner registration on the VPS instead of adding a permanent private key to GitHub.
- Keep `.env`, `uploads`, `logs`, `tmp`, and runtime secrets on the VPS only.

### Git Push Auth
Use the already configured GitHub CLI/session for repository operations in this environment. Do not introduce a new permanent VPS private key just to push repository changes.

---

## Production Workflow (MANDATORY)

### Production Branch Truth
- `main` is the ONLY production branch
- Production deploys ONLY from `main` branch pushes
- `work` branch is for preview/testing only
- Never deploy from feature branches to production

### Preview vs Production
- Preview: `work` branch → preview environment
- Production: `main` branch → live site
- Preview must never be mistaken for production

### One Task Per Session
- Each VS Code session handles exactly one task
- Task types: homepage, vaultx, navigation, etc.
- No mixing unrelated tasks in one session

### Route-Owner Verification (MANDATORY)
Before editing any UI:
1. Run: `npm run route-owner /`
2. Confirms which component renders the route
3. Only edit that component + directly required files

### Scope Guard Usage (MANDATORY)
After making changes:
1. Run: `npm run scope-guard <task>`
2. Checks changed files against task allowlist
3. Fails if unrelated files were touched

### Release Truth Verification
After deploy:
1. Visit: `https://creatorvault.live/__release`
2. Confirms exact commit, branch, timestamp live
3. No guessing - auditable proof

### Exact Build/Test/Browser Commands
- Build: `npm run build`
- Test: `npm run test`
- Route owner: `npm run route-owner <route>`
- Scope guard: `npm run scope-guard <task>`
- Visual proof: `npm run visual-proof <task> <before|after>`

### No Success Claims from Local Preview
- Localhost verification is meaningless
- Must verify on live URL with release stamp
- UI tasks require before/after screenshots at same viewport

### No Touching Unrelated Files
- Homepage task: only Home.tsx, index.css, index.html
- VaultX task: only VaultX.tsx + styles
- Navigation task: only App.tsx, AppHeader.tsx
- Scope guard enforces this

## Day-to-Day Flow in VS Code
1. **Start task**: Identify route owner with `npm run route-owner /`
2. **Make changes**: Edit only allowed files
3. **Check scope**: Run `npm run scope-guard homepage`
4. **Build & test**: `npm run build && npm run test`
5. **Visual proof**: `npm run visual-proof homepage before` (take screenshot)
6. **Deploy**: Push to `main` branch
7. **Verify live**: Check `https://creatorvault.live/__release` for commit match

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
- speculative "cleanup"
- changing unrelated subsystems during a fix
- reporting "done" before visual confirmation

## Current priorities
1. Stabilize the currently recovered frontend.
2. Restore and preserve reliable navigation.
3. Ensure source/build/deploy alignment.
4. Document the working deployment path.
5. Make future fixes reproducible and auditable.

## Business context
CreatorVault is founder-built under tight budget constraints. Wasted credits and false-success reports are costly. Optimize for reliability, clarity, and preserving momentum.
## Deployment Verification — 2026-04-28
- All 7 FFmpeg endpoints verified working with local file storage
- esbuild command confirmed: npx esbuild server/_core/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist
- PM2 running stable at 174MB memory

## Deployment Verification — 2026-04-28
- All 7 FFmpeg endpoints verified working with local file storage
- esbuild command confirmed: Need to install the following packages:
esbuild@0.28.0
Ok to proceed? (y) 
- PM2 running stable at 174MB memory
- All uploads saved to 
- HTTP 200 confirmed for all processed video files

- 2026-06-09: Added root SSH authorized key fingerprint SHA256:v79rQ+7rvF+v/rFnIgaNht0G08ts4UDrm1ZlPSjnWZE for Manus sandbox deployment access to install the pushed VaultX copy release.
