# PROFILE: Deploy / Pipeline Fix

## Scope
Fix the described deploy or pipeline issue.
Do NOT touch product files (homepage, components, pages).

## Context
- GitHub Actions deploy workflow: `.github/workflows/deploy.yml`
- VPS: 134.199.202.69, user: root, app root: /root/creatorvault
- PM2 process name: creatorvault
- Known issue: `public/` directory missing causes release stamp step to fail
- Known issue: `deploy_work_to_prod.sh` referenced but missing from repo
- Frontend build must be done locally (VPS OOM on 2GB RAM during Vite build)
- Workaround: build locally, SCP dist/public to VPS, pm2 restart creatorvault

## Rules
- Fix only what is described
- Do not touch product code
- Report exactly what changed and why
