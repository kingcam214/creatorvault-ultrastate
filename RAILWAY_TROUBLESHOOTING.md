# Railway Deployment Troubleshooting Guide

**CreatorVault ULTRASTATE**
**Last Updated**: January 25, 2026

---

## 🚨 CURRENT SITUATION

### The Problem
Railway has been crashing for a week with `ERR_INVALID_ARG_TYPE` error. Multiple deployment attempts have failed. The fix EXISTS in the code (commit 635c660 on main branch) but Railway won't deploy it.

### What We Know
- ✅ **Code is fixed**: commit 07cbcc0 fixes the vite.ts issue
- ✅ **Merged to main**: commit 635c660 has all fixes
- ✅ **Local build works**: `pnpm build` succeeds
- ❌ **Railway won't deploy**: Keeps deploying old broken code (cd849d3d)

---

## 🔍 DIAGNOSIS

### The Error
```
TypeError [ERR_INVALID_ARG_TYPE]: The "paths[0]" argument must be of type string. Received undefined
  at new NodeError (node:internal/errors:496:5)
  at validateString (node:internal/validators:162:11)
  at Object.resolve (node:path:1097:7)
  at file:///app/dist/index.js:16490:18
```

### Root Cause
The error was caused by using `import.meta.dirname` in `server/_core/vite.ts`, which is undefined in Railway's build environment.

### The Fix (Already Applied)
**File**: `server/_core/vite.ts`

```typescript
// BEFORE (broken):
const distPath = import.meta.dirname
  ? path.resolve(import.meta.dirname, "public")
  : path.resolve(process.cwd(), "dist", "public");

// AFTER (fixed):
import { fileURLToPath } from "url";

// Get __dirname equivalent for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const clientTemplate = path.resolve(__dirname, "../..", "client", "index.html");

const distPath = process.env.NODE_ENV === "development"
  ? path.resolve(__dirname, "../..", "dist", "public")
  : path.resolve(__dirname, "public");
```

**Commit**: 07cbcc0 "Fix Railway deployment crash - ERR_INVALID_ARG_TYPE"

---

## ❌ WHAT DIDN'T WORK

### Attempt #1: Manual Deploy Button
- **Action**: Clicked "Deploy" button in Railway UI
- **Expected**: Deploy latest from main (635c660)
- **Result**: ❌ Deployed old broken code (cd849d3d)
- **Conclusion**: Deploy button doesn't respect current main branch

### Attempt #2: Merge Fixes to Main
- **Action**: Created PR #2, merged fixes to main
- **Expected**: Railway auto-deploys on main branch update
- **Result**: ❌ No auto-deployment triggered
- **Conclusion**: Railway not watching main branch properly

### Attempt #3: Fresh Railway Service
- **Action**: Created new Railway service "daring-learning"
- **Expected**: Clean slate, deploy from main
- **Result**: ❌ Also crashed with same error
- **Conclusion**: Railway configuration issue, not service-specific

### Attempt #4: Check Railway Settings
- **Action**: Tried to find "Deploy Branch" or "Source" settings
- **Expected**: Find settings to configure which branch to deploy
- **Result**: ❌ Settings interface different than expected
- **Conclusion**: Instructions were inaccurate

---

## 🤔 WHY RAILWAY WON'T DEPLOY

### Possible Causes

1. **Railway Cache Issue**
   - Railway might be caching the old build
   - Even with new commits, it uses cached broken version

2. **Branch Misconfiguration**
   - Railway might be pointed at wrong branch
   - Could be deploying from a branch that doesn't have fixes

3. **Webhook Not Firing**
   - GitHub webhook to Railway might be broken
   - Railway not getting notified of new commits

4. **Build Environment Issue**
   - Railway's Node.js version incompatible
   - ESM module handling different than expected

5. **Railway Platform Bug**
   - Railway itself might have a bug
   - Multiple services crashing suggests platform issue

---

## ✅ VERIFICATION STEPS

### Verify Local Build Works

```bash
# 1. Clean build
rm -rf dist node_modules
pnpm install --ignore-scripts
pnpm build

# 2. Test production build
export NODE_ENV=production
export JWT_SECRET=DBiOVRMg022zrB7fukzloxqOAiHQmbo4JShIkiBEE/A=
export PORT=5000
node dist/index.js

# Expected: Server starts without ERR_INVALID_ARG_TYPE
```

### Verify Fix is in Main Branch

```bash
# Check current main branch
git fetch origin main
git log origin/main --oneline -3

# Should show:
# 635c660 Merge pull request #2 from kingcam214/claude/...
# b7e3336 Merge branch 'claude/omega-merge-integration-3HXUC'
# 07cbcc0 Fix Railway deployment crash - ERR_INVALID_ARG_TYPE

# Check the actual fix
git show 07cbcc0:server/_core/vite.ts | grep -A5 "fileURLToPath"

# Should show the __dirname fix
```

### Verify Railway Configuration

**railway.json**:
```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "pnpm run build"
  },
  "deploy": {
    "startCommand": "node dist/index.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**nixpacks.toml**:
```toml
[phases.setup]
nixPkgs = ['nodejs-18_x', 'pnpm']

[phases.install]
cmds = ['pnpm install --frozen-lockfile']

[phases.build]
cmds = ['pnpm run build']

[start]
cmd = 'node dist/index.js'
```

---

## 🆕 ALTERNATIVE DEPLOYMENT STRATEGIES

### Option 1: Contact Railway Support

**Action**: Open Railway support ticket
**Explain**:
- Deployment has been crashing for a week
- Fix is in code (commit 635c660) but Railway won't deploy it
- Tried manual deploy, new service, settings changes - all failed
- Need Railway engineer to investigate why deployment stuck on old commit

**Expected Resolution Time**: 1-3 days

### Option 2: Delete Everything and Start Fresh

**Steps**:
1. Delete ALL Railway services in project
2. Delete Railway project entirely
3. Create completely new Railway project
4. Connect to GitHub repo (main branch)
5. Add environment variables
6. Deploy from scratch

**Risk**: Might have same issue
**Benefit**: Clean slate, no cached data

### Option 3: Try Different Platform

**Alternatives to Railway**:

1. **Vercel** (Recommended for Next.js, works with Express)
   - Similar to Railway
   - Good TypeScript support
   - May need adapter for Express

2. **Render** (Good Railway alternative)
   - Similar feature set to Railway
   - Good for full-stack apps
   - Native Express support

3. **Fly.io** (More control)
   - Uses Docker
   - More configuration required
   - Better debugging tools

4. **AWS Elastic Beanstalk** (Enterprise)
   - More complex setup
   - More reliable
   - Higher cost

5. **DigitalOcean App Platform**
   - Similar to Railway
   - Good Express support
   - Competitive pricing

### Option 4: Manual Docker Deployment

**Steps**:
1. Create Dockerfile
2. Build Docker image locally
3. Test Docker image works
4. Push to container registry
5. Deploy to any container platform

**Dockerfile** (create this):
```dockerfile
FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install pnpm and dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy source code
COPY . .

# Build
RUN pnpm build

# Expose port
EXPOSE 5000

# Start
CMD ["node", "dist/index.js"]
```

**Test locally**:
```bash
docker build -t creatorvault .
docker run -p 5000:5000 \
  -e NODE_ENV=production \
  -e JWT_SECRET=DBiOVRMg022zrB7fukzloxqOAiHQmbo4JShIkiBEE/A= \
  -e PORT=5000 \
  creatorvault
```

---

## 🎯 RECOMMENDED NEXT STEPS

### Immediate Action (Pick ONE)

**Option A: Try Render** (Fastest, similar to Railway)
1. Sign up at render.com
2. Create new Web Service
3. Connect GitHub repo (main branch)
4. Build command: `pnpm install --ignore-scripts && pnpm build`
5. Start command: `node dist/index.js`
6. Add environment variables
7. Deploy

**Option B: Contact Railway Support** (Give Railway one more chance)
1. Open support ticket
2. Provide commit hashes and error details
3. Wait for Railway engineer response
4. If not resolved in 24 hours, switch to Option A

**Option C: Delete Railway Project and Start Fresh** (Nuclear option)
1. Download all environment variables
2. Delete all Railway services
3. Delete Railway project
4. Create brand new project
5. Redeploy from main branch

---

## 📝 DEPLOYMENT CHECKLIST

When deploying to ANY platform:

### Pre-Deployment
- [ ] Code is merged to main branch
- [ ] Local build succeeds (`pnpm build`)
- [ ] Local production test works (`node dist/index.js`)
- [ ] All environment variables documented
- [ ] Database connection string ready (if using DB)

### Deployment
- [ ] Platform connected to GitHub repo
- [ ] Correct branch selected (main)
- [ ] Build command configured: `pnpm install --ignore-scripts && pnpm build`
- [ ] Start command configured: `node dist/index.js`
- [ ] Environment variables added:
  - [ ] NODE_ENV=production
  - [ ] JWT_SECRET=(generated secret)
  - [ ] DATABASE_URL=(if using database)
  - [ ] PORT=(platform-provided variable)

### Post-Deployment
- [ ] Deployment succeeds without errors
- [ ] Logs show "Server running on port..."
- [ ] App accessible via provided URL
- [ ] Health check endpoint responds
- [ ] Database connection works (if configured)

---

## 🔧 DEBUGGING RAILWAY DEPLOYMENTS

### Check Deployment Logs

**What to look for**:
1. Build phase errors
2. Node.js version
3. Dependency installation issues
4. Build command output
5. Start command execution

**Red flags**:
- `ERR_INVALID_ARG_TYPE` - vite.ts issue (should be fixed)
- `Cannot find module` - Missing dependency
- `ECONNREFUSED` - Database connection issue
- `Port already in use` - Port configuration issue

### Check Environment Variables

**Required**:
- `NODE_ENV` = "production"
- `JWT_SECRET` = (random string, 32+ characters)
- `PORT` = ${{RAILWAY_PUBLIC_PORT}} or similar

**Optional but recommended**:
- `DATABASE_URL` = MySQL connection string

### Check Build Output

**Expected files**:
```
dist/
├── index.js (server bundle, ~648 KB)
└── public/
    ├── index.html
    └── assets/
        ├── index-*.css
        └── index-*.js (client bundle, ~2.4 MB)
```

**Verify**:
```bash
# After build, check files exist
ls -lh dist/
ls -lh dist/public/
ls -lh dist/public/assets/
```

---

## 📞 SUPPORT CONTACTS

### Railway
- **Dashboard**: https://railway.app
- **Docs**: https://docs.railway.app
- **Discord**: https://discord.gg/railway
- **Support**: help@railway.app

### Alternative Platforms
- **Render**: https://render.com/docs
- **Vercel**: https://vercel.com/docs
- **Fly.io**: https://fly.io/docs
- **DigitalOcean**: https://docs.digitalocean.com/products/app-platform

---

## 🎓 LESSONS LEARNED

### What Went Wrong
1. **Assumed Railway auto-deploys** - Not always true
2. **Didn't verify Railway's branch configuration** - Should have checked
3. **Trusted "Deploy" button** - Doesn't always work as expected
4. **No deployment verification** - Should test before assuming fixed

### What to Do Differently
1. **Test production build locally first** - Always verify
2. **Use deployment logs** - Check what's actually being deployed
3. **Have backup platform ready** - Don't rely on single platform
4. **Document working deployments** - Create runbook
5. **Use CI/CD** - Automate deployments with GitHub Actions

### Best Practices Going Forward
1. **Automated Testing** - Run tests before merge
2. **Deployment Pipeline** - GitHub Actions → Build → Test → Deploy
3. **Monitoring** - Add Sentry or similar for error tracking
4. **Health Checks** - Add `/health` endpoint
5. **Gradual Rollout** - Test deployments before full release

---

**END OF TROUBLESHOOTING GUIDE**

*Current Status: Railway deployment broken, need alternative deployment strategy.*

**BLOCKER**: Railway won't deploy fixed code from main branch.

**RECOMMENDATION**: Try Render.com or contact Railway support immediately.
