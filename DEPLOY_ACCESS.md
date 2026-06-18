# CreatorVault Production Access and Deploy Path

This server is the real CreatorVault production VPS for `creatorvault.live`.

## Permanent SSH Access

Passwordless SSH is installed for Manus-operated deployment access. Future sessions should use SSH keys, not the root password.

| Access path | Alias / key | Status |
|---|---|---|
| Sandbox session | `creatorvault-vps` using `~/.ssh/creatorvault_vps_root_ed25519` | Verified passwordless on 2026-06-18 UTC |
| Persistent cloud computer | `creatorvault-vps` using `~/.ssh/creatorvault_vps_root_ed25519` | Verified passwordless on 2026-06-18 UTC |

## Canonical Manual Deploy Command

Run this from any environment that has the `creatorvault-vps` SSH alias:

```bash
ssh creatorvault-vps /root/deploy_creatorvault.sh
```

The script performs the production-safe path only: fetch `origin/main`, reset the VPS checkout to `origin/main`, run `npm run build`, restart PM2 with `ecosystem.config.cjs --update-env` when present, save PM2 state, and print the release endpoint.

## Production Truth

The production repo is `/root/creatorvault`. The production branch is `main`. Runtime secrets, `.env`, uploads, logs, and temporary runtime files stay on the VPS only.
