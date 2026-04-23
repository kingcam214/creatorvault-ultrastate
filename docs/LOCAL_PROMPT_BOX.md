# King Console — Local Prompt Box

King Console is a thin local web app that wraps Gemini CLI so Cameron can run CreatorVault tasks without Manus. The workflow is: open app → paste prompt → click Run → see results.

## Setup (one time)

**Step 1 — Install Gemini CLI**

```bash
npm install -g @google/gemini-cli
```

**Step 2 — Get a free Gemini API key**

Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey) and create a free API key.

**Step 3 — Create your .env file**

```bash
cd tools/king-console
cp .env.example .env
# Edit .env and paste your GEMINI_API_KEY
```

**Step 4 — Start King Console**

```bash
node tools/king-console/server.js
# Then open http://localhost:4242 in your browser
```

Or from VS Code: open Command Palette → `Tasks: Run Task` → `King Console: Start`

## How to use

1. Open `http://localhost:4242`
2. Select a **Task Profile** from the dropdown (Homepage, Bug Fix, VaultX, etc.)
3. Paste your prompt in the text area
4. Check "Run build verification" if you want the build to run automatically after
5. Click **▶ RUN**
6. Watch the output log on the right
7. When done, see changed files and build result in the result bar

## Task Profiles

| Profile | Scope |
|---|---|
| **Homepage** | Edits to `client/src/pages/Home.tsx` only |
| **Bug Fix** | Fix a described bug in any file, minimal change |
| **VaultX** | VaultX pages and components only |
| **Deploy / Pipeline** | Fix deploy workflow or pipeline issues |
| **Verify Only** | Read-only inspection, no file edits |

Profiles are stored in `tools/king-console/profiles/` as Markdown files. You can edit them or add new ones.

## Architecture

```
tools/king-console/
├── server.js          ← Node.js HTTP server (no framework needed)
├── package.json
├── .env.example       ← Copy to .env and add GEMINI_API_KEY
├── public/
│   └── index.html     ← Full UI (single file, no build step)
├── profiles/
│   ├── homepage.md    ← Task profile loaded before each prompt
│   ├── bugfix.md
│   ├── vaultx.md
│   ├── deploy-fix.md
│   └── verify.md
└── output/
    └── run-*.json     ← Summary JSON saved after each run
```

The server runs on `http://localhost:4242`. It spawns `gemini --yolo --prompt "..."` in the repo root, streams output to the UI, then optionally runs the Vite build and saves a summary JSON.

## Deploy workflow (manual — until GitHub Actions is fixed)

After Gemini makes changes and the build passes:

```bash
# 1. Commit to main
git add -A && git commit -m "feat: ..." && git push origin main

# 2. SCP new dist/public to VPS
sshpass -p 'KingCam214CreatorVault' scp -r dist/public/assets/index-*.js dist/public/index.html \
  root@134.199.202.69:/root/creatorvault/dist/public/

# 3. Restart PM2
sshpass -p 'KingCam214CreatorVault' ssh root@134.199.202.69 "pm2 restart creatorvault"
```

## Known VPS constraints

The VPS (2GB RAM) cannot run `pnpm build` / Vite in-memory — it OOMs. Always build locally and SCP the output. This is documented in the Learning Log.
