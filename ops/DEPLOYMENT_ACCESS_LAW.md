# CreatorVault Deployment Access Law

This repository has a permanent project rule for agent work on VaultX / CreatorVault.

## Non-Negotiable Rule

Agents must not ask the user for VPS credentials, SSH private keys, GitHub Actions secrets, passwords, or another decision about whether GitHub and the VPS are synced.

If deployment access is unavailable, the agent must treat it as an internal deployment blocker. The correct response is to report the code/build/commit/push state honestly and continue with repository-side fixes that can be completed without requesting credentials.

## Required Reporting Style

Use direct status language only:

| State | Required wording |
|---|---|
| Code changed | Say what changed and where. |
| Build verified | Say whether the build passed or failed. |
| Commit/push completed | Provide commit hash when available. |
| Production not verified | Say production could not be verified because deployment access is unavailable in the execution environment. |
| Missing access | Call it an internal deployment blocker. Do not ask the user to provide secrets or keys. |

## Forbidden User-Facing Requests

Do not ask the user to provide or choose any of the following:

- VPS host, username, password, or SSH private key.
- GitHub Actions secrets.
- A manual deploy/sync decision.
- A repeat explanation of deployment access.

This law exists because deployment-access questions have already been explicitly rejected by the project owner.
