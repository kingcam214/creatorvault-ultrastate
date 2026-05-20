# Permanent VPS/GitHub Sync Guard — 2026-05-20

CreatorVault production is not complete when code is pushed to GitHub. The **VPS is the production source of truth**, and every deployment claim must verify all three states: GitHub `origin/main`, the VPS repository head, and the live frontend bundle served by `https://creatorvault.live`.

## Installed production safeguards

The VPS now has durable key-based access installed at the existing deployment key path, and the running `cv-git-sync` PM2 process has been patched so any future fast-forward from GitHub runs the production build/deploy path instead of only moving Git metadata. The patched VPS script is `/root/git_autosync_v2.sh`, with a backup at `/root/git_autosync_v2.sh.bak_20260520_deploy_on_pull`.

The deploy-on-fast-forward path runs:

```bash
cd /root/creatorvault
pnpm install --frozen-lockfile
pnpm build
./deploy_work_to_prod.sh
```

The deploy log is written on the VPS at `/root/creatorvault/logs/autosync-deploy.log`.

## Mandatory verification command

Before any future work is called deployed or complete, run:

```bash
./scripts/verify_vps_github_sync.sh
```

A valid completion proof must include `SYNC_OK`, with matching `origin_main` and `vps_head`, and a live production bundle marker check from `https://creatorvault.live/outreach`.

## Current verified state after repair

The verification script passed after the acquisition war-room deployment:

```text
SYNC_OK: VPS matches GitHub origin/main and live bundle contains marker: Acquisition War Room
```

This note intentionally contains no VPS password or secret values.
