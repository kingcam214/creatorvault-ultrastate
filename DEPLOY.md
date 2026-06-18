# CreatorVault Production Deployment

This guide covers production deployment of `kingcam214/creatorvault-ultrastate` to the Ubuntu VPS behind Nginx + PM2.

Live URL: `https://creatorvault.live`

---

## Deployment principle

CreatorVault no longer requires a permanent private VPS key stored in GitHub Actions. The production deployment path is **server-side**: a GitHub self-hosted runner lives on the VPS, checks out the repository from GitHub, builds the release locally on the server, syncs the built release into `/root/creatorvault`, and reloads PM2 locally.

This design removes the old `CREATORVAULT_VPS_SSH_KEY` blocker entirely. If deployment does not start, fix the VPS runner registration or runner service; do **not** add a private SSH key back into GitHub secrets.

| Environment | Branch | Workflow | Runner label | App directory | PM2 app |
|---|---|---|---|---|---|
| Production | `main` | `.github/workflows/deploy.yml` | `creatorvault-production` | `/root/creatorvault` | `creatorvault` |
| Preview | `work` | `.github/workflows/preview-deploy.yml` | `creatorvault-preview` | `/root/creatorvault-preview` | `preview` |

---

## Pre-deployment checklist

- [ ] The GitHub self-hosted runner is online on the VPS.
- [ ] The production runner has labels `self-hosted`, `linux`, and `creatorvault-production`.
- [ ] Node.js and pnpm are installed for the runner user.
- [ ] PM2 is installed for the runner user.
- [ ] `/root/creatorvault/.env` exists and contains production secrets.
- [ ] Nginx reverse proxy is running and points to the app process.
- [ ] PM2 process name is `creatorvault`.
- [ ] PM2 watch mode is disabled.

---

## Standard deployment

### 1) Push to `main`

```bash
git push origin main
```

GitHub Actions will schedule the `Deploy to CreatorVault VPS` workflow on the production VPS runner. The workflow builds the release, syncs it into `/root/creatorvault`, installs runtime dependencies, and runs:

```bash
./deploy_work_to_prod.sh
```

### 2) Manual dispatch

If a commit is already pushed and needs re-running, dispatch `.github/workflows/deploy.yml` from GitHub Actions. This still does not require a GitHub-stored private VPS key.

---

## What the workflow does

1. Checks out the repository on the production VPS runner.
2. Generates `client/public/release.json` for the pushed commit.
3. Runs `pnpm install --frozen-lockfile`.
4. Runs `pnpm build`.
5. Verifies `dist/index.js`, `dist/public/index.html`, and `dist/public/release.json` exist.
6. Syncs the release into `/root/creatorvault` with `rsync`, excluding `.git`, `node_modules`, `.env`, `logs`, `uploads`, and `tmp`.
7. Installs production runtime dependencies in `/root/creatorvault`.
8. Runs `deploy_work_to_prod.sh` to reload PM2 and run the local health probe.
9. Verifies the release stamp matches the GitHub commit SHA.

---

## Manual rollback instructions

Use this only from the VPS if a release has to be rolled back without GitHub Actions.

```bash
cd /root/creatorvault

git log --oneline -n 20

git reset --hard <KNOWN_GOOD_COMMIT>
pnpm install --frozen-lockfile
pnpm build
CREATORVAULT_PM2_APP=creatorvault ./deploy_work_to_prod.sh
```

---

## Health check verification steps

After deployment, verify all of the following:

```bash
curl -I https://creatorvault.live
curl -fsS https://creatorvault.live/api/release
pm2 status
pm2 show creatorvault | grep -i watch
pm2 logs creatorvault --lines 100
```

Also verify from browser:

- Homepage loads with no white screen.
- Auth-required routes redirect correctly.
- Clone Command shows the no-credit final prompt preview gate before any paid generation.
- Key pages render: CloneEmpire, VaultLive, and dashboard.

---

## Notes

- Do not restore `CREATORVAULT_VPS_SSH_KEY` as a required GitHub secret.
- Do not use SSH/SCP-based GitHub Actions to deploy production.
- Keep `.env` and runtime files on the VPS only.
- Use **`pm2 reload`** in production to avoid hard restarts.
- Keep PM2 watch mode **disabled** in production to prevent reload loops.
- Prefer deploying from `main` only after GitHub push is confirmed.
