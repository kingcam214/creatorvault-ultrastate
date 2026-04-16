# CreatorVault VPS Deployment Guide

This guide covers production deployment of `kingcam214/creatorvault-ultrastate` to the Ubuntu VPS behind Nginx + PM2.

Live URL: `https://creatorvault.live`

---

## Pre-deployment checklist

- [ ] You are on the VPS and inside the app directory (example: `/var/www/creatorvault`)
- [ ] Repo remote is correct: `origin -> kingcam214/creatorvault-ultrastate`
- [ ] Node.js and pnpm are installed (`node -v`, `pnpm -v`)
- [ ] PM2 is installed (`pm2 -v`)
- [ ] `.env` / production secrets are present and valid
- [ ] Nginx reverse proxy is running and points to the app process
- [ ] PM2 process exists and **watch mode is false**
- [ ] Working tree is clean (`git status`)
- [ ] You know the PM2 process name (example: `creatorvault-ultrastate`)

---

## One-time setup (on VPS)

```bash
# clone if needed
git clone git@github.com:kingcam214/creatorvault-ultrastate.git
cd creatorvault-ultrastate

# make deploy script executable
chmod +x deploy.sh
```

---

## Standard deployment (recommended)

### 1) Deploy with script

```bash
cd /path/to/creatorvault-ultrastate
PM2_APP_NAME=creatorvault-ultrastate ./deploy.sh
```

Optional environment flags:

- `BRANCH=main` (default `main`)
- `REMOTE=origin` (default `origin`)
- `HEALTHCHECK_URL=https://creatorvault.live` (default value)
- `RUN_TESTS=true` (default `true`; set `false` only for emergency hotfixes)

### 2) What the script does

1. Validates required tools (`git`, `pnpm`, `pm2`, `node`, `curl`)
2. Ensures clean git working tree
3. Stores current commit for rollback
4. Pulls latest code using `git pull --ff-only`
5. Runs `pnpm install`
6. Runs `pnpm build`
7. Runs `pnpm test` (if `RUN_TESTS=true`)
8. Runs **`pm2 reload`** (never restart)
9. Verifies PM2 watch mode is not enabled
10. Runs health check against `https://creatorvault.live`

If any step after pull fails, it automatically rolls back to the previous commit and reloads PM2.

---

## Manual rollback instructions

Use this if you need to rollback without re-running deployment:

```bash
cd /path/to/creatorvault-ultrastate

# find previous known-good commit
git log --oneline -n 20

# rollback code
git reset --hard <KNOWN_GOOD_COMMIT>

# reinstall/build
pnpm install
pnpm build
pnpm test

# reload process (NOT restart)
pm2 reload creatorvault-ultrastate --update-env
```

---

## Health check verification steps

After deployment, verify all of the following:

```bash
# App responds
curl -I https://creatorvault.live

# Optional: full response check
curl -sS https://creatorvault.live > /tmp/creatorvault-home.html

# PM2 process is online
pm2 status

# PM2 watch must be disabled
pm2 show creatorvault-ultrastate | grep -i watch

# Check recent runtime logs
pm2 logs creatorvault-ultrastate --lines 100
```

Also verify from browser:

- Homepage loads with no white screen
- Auth-required routes redirect correctly
- Key pages render (`CloneEmpire`, `VaultLive`, dashboard)

---

## Notes

- Use **`pm2 reload`** in production to avoid hard restarts.
- Keep PM2 `watch` mode **disabled** in production to prevent reload loops.
- Prefer deploying from `main` only after GitHub push is confirmed.
