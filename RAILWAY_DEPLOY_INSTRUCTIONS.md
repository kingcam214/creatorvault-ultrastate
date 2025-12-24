# Railway Deployment Instructions

## Deployment Status
**Code is ready for Railway deployment via GitHub integration.**

## Required Environment Variables
Railway will auto-detect these from your existing Manus deployment, but verify these are set:

```
DATABASE_URL=(Railway MySQL service URL)
JWT_SECRET=(from Manus)
OAUTH_SERVER_URL=(from Manus)
VITE_APP_ID=(from Manus)
STRIPE_SECRET_KEY=(from Manus)
STRIPE_WEBHOOK_SECRET=(from Stripe dashboard after webhook setup)
VITE_STRIPE_PUBLISHABLE_KEY=(from Manus)
SCHEMA_BOOTSTRAP=1
```

## Deployment Steps (GitHub Integration)
1. Go to https://railway.app
2. Create new project
3. Select "Deploy from GitHub repo"
4. Choose `kingcam214/cv-ultrastate`
5. Railway will auto-build and deploy
6. Get your Railway URL from dashboard
7. Configure Stripe webhook: `https://YOUR-RAILWAY-URL/api/stripe/webhook`
8. Add `STRIPE_WEBHOOK_SECRET` to Railway environment variables

## What Happens on Deploy
- `pnpm install` - Installs dependencies
- `pnpm build` - Builds client + server
- `pnpm start` - Starts production server
- Bootstrap runs automatically on first startup (creates 10 database tables)

## Verification
- Health check: `https://YOUR-RAILWAY-URL/`
- API health: `https://YOUR-RAILWAY-URL/api/trpc/auth.me`
- Creator subscriptions: `https://YOUR-RAILWAY-URL/creator-subscriptions`

## Current Commit
Ready for deployment at commit: fbb23314
