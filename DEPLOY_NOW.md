# Deploy CreatorVault to Railway (From Your Phone)

## Step 1: Open Railway
Go to https://railway.app on your phone browser

## Step 2: Login
- Login with GitHub
- Authorize Railway

## Step 3: Create New Project
- Tap "New Project"
- Select "Deploy from GitHub repo"
- Choose `kingcam214/cv-ultrastate`
- Railway will auto-detect Node.js

## Step 4: Add Environment Variables
Railway needs these variables. Tap "Variables" tab:

```
DATABASE_URL=(already set by Railway MySQL service)
JWT_SECRET=(already set)
OAUTH_SERVER_URL=(already set)
VITE_APP_ID=(already set)
STRIPE_SECRET_KEY=(already set)
STRIPE_WEBHOOK_SECRET=(already set)
VITE_STRIPE_PUBLISHABLE_KEY=(already set)
```

**Add this new one:**
```
SCHEMA_BOOTSTRAP=1
```

## Step 5: Deploy
- Railway will build and deploy automatically
- Wait 3-5 minutes
- You'll get a URL like: `https://creatorvault-production.up.railway.app`

## Step 6: Configure Stripe Webhook
- Open Stripe Dashboard on phone: https://dashboard.stripe.com
- Go to Developers → Webhooks
- Add endpoint: `https://YOUR-RAILWAY-URL.up.railway.app/api/stripe/webhook`
- Select event: `checkout.session.completed`
- Copy webhook signing secret
- Add to Railway variables as `STRIPE_WEBHOOK_SECRET`

## Step 7: Test
- Open your Railway URL
- Register as creator
- Create subscription tier
- Subscribe as fan
- Verify money moves

## Done
Your platform is live. Real users can register, real money can flow.
