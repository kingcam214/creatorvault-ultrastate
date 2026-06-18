# CreatorVault Deploy Access Repair

CreatorVault deployment has been moved away from GitHub-stored private VPS keys. The current deployment model is a **GitHub self-hosted runner on the production VPS**. GitHub schedules the job; the VPS runner checks out the repository, builds locally, syncs into `/root/creatorvault`, and reloads PM2 locally.

This means deployment repair is runner repair, not SSH-key repair.

---

## Agent Boundary: Do Not Ask the User for Access

Agents working on VaultX / CreatorVault must not ask the project owner for VPS credentials, SSH keys, GitHub secrets, passwords, or sync decisions. If the current execution environment lacks access, report it only as an internal deployment blocker and continue with code-side work. See `ops/DEPLOYMENT_ACCESS_LAW.md`.

---

## What Changed

| Old behavior | Current behavior |
|---|---|
| GitHub Actions needed `CREATORVAULT_VPS_SSH_KEY`. | GitHub Actions targets a self-hosted runner on the VPS. |
| Workflow pushed files to the VPS over SSH/SCP. | Workflow runs directly on the VPS and deploys locally. |
| Missing private key blocked deployment before build. | Offline/missing runner is the scheduling blocker. |
| Repair generated a deploy key and stored it as a GitHub secret. | Repair registers or restarts local GitHub runner services on the VPS. |

---

## Required Runner Labels

| Environment | Workflow | Required labels |
|---|---|---|
| Production | `.github/workflows/deploy.yml` | `self-hosted`, `linux`, `creatorvault-production` |
| Preview | `.github/workflows/preview-deploy.yml` | `self-hosted`, `linux`, `creatorvault-preview` |

---

## Repair Procedure

Create a short-lived runner registration token from GitHub:

```text
GitHub repo -> Settings -> Actions -> Runners -> New self-hosted runner
```

Then run this on the VPS as root:

```bash
cd /root/creatorvault
PROD_TOKEN=<production_runner_registration_token> ./ops/repair-github-vps-deploy-access.sh
```

If preview deployment is needed too, include the preview token:

```bash
cd /root/creatorvault
PROD_TOKEN=<production_runner_registration_token> \
PREVIEW_TOKEN=<preview_runner_registration_token> \
./ops/repair-github-vps-deploy-access.sh
```

---

## Verification

After repair, verify the runner is online in GitHub Actions and then re-run the deploy workflow. On the VPS, also verify services:

```bash
systemctl list-units '*actions.runner*' --no-pager
pm2 status
curl -fsS https://creatorvault.live/api/release
```

---

## Rules

Do not restore `CREATORVAULT_VPS_SSH_KEY` as a required repository secret. Do not reintroduce `appleboy/ssh-action` or `appleboy/scp-action` into deployment workflows. Deployment should remain local to the VPS through the self-hosted runner.
