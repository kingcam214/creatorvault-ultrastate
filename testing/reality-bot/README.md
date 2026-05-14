# CreatorVault Reality Bot

This directory contains a deterministic **read-only** infrastructure verification system for CreatorVault production. It is designed to be run before and after major changes so the platform has current proof of its real state.

## Run

From `/root/creatorvault`:

```bash
node testing/reality-bot/index.mjs
```

## Outputs

The bot writes these proof artifacts:

| Artifact | Path |
|---|---|
| Full report | `testing/reality-bot/reports/reality-report.json` |
| Markdown summary | `testing/reality-bot/reports/reality-report.md` |
| Router audit | `testing/reality-bot/reports/router-resolution-report.json` |
| Browser proof | `testing/reality-bot/reports/browser-proof.json` |
| System health | `testing/reality-bot/reports/system-health.json` |
| Screenshots | `testing/reality-bot/screenshots/` |

## Safety Contract

This tool may inspect system state, query metadata, curl endpoints, and capture screenshots. It must not restart PM2, run builds, mutate the database, touch Stripe, touch payment code, alter environment variables, or edit production routers.
