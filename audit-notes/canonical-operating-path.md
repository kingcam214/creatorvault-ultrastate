# Canonical Operating Path Re-Grounding

## Non-negotiable corrections

The user explicitly rejected receiving manual infrastructure handoff instructions. From this point forward, I must not ask the user to log in to DigitalOcean or paste SSH-key repair commands. The canonical documents establish that access repair must be handled through the repository-side documented recovery path, GitHub synchronization, and automation-first deployment behavior.

## Active repository truth

The active working copy for the credibility sprint is `/home/ubuntu/creatorvault-live-work`. The credibility sprint changes have already been built, verified locally, committed, and pushed to `main`. Production deployment must now be verified through the documented GitHub Actions / deployment workflow path and the live release endpoint instead of asking the user for manual VPS console recovery.

## Deployment law

The deployment path must respect these rules:

| Rule | Operational meaning |
|---|---|
| Do not ask the user for manual deploy-key repair | Use repo-side automation and documented access repair paths first. |
| GitHub and VPS/live must be synchronized | A commit is not complete until GitHub, production files, PM2 state, and `/__release` agree. |
| Never use password SSH | If direct SSH fails, do not fall back to password prompts. |
| Verify substance, not just shell status | Public routes must render the intended signup, legal, age gate, profile, and media behavior, not just return the SPA shell. |
| Preserve scope | Keep credibility sprint work limited to signup, legal pages, age gate, public creator profiles, homepage media/footer, and verification scripts used to prove those routes. |

## Immediate next approach

I will inspect the GitHub Actions workflow/run state for the pushed credibility sprint commit, use the repository-side deployment mechanism if available, and verify the public site through `/__release`, required route HTTP checks, and browser rendering/screenshots. If automation has failed, I will diagnose it from the workflow logs and repository scripts rather than transferring infrastructure recovery work to the user.
