# Deploying SAMDB

SAMDB is a Next.js 14 engineering workbench. The entire database engine runs **client-side in TypeScript**, with state persisted to `localStorage` via the Write-Ahead Log. There is no server-side database required and zero external secrets or API keys needed.

---

## Deploy to Render (render.com)

Render supports deploying SAMDB as a **Node Web Service** with zero configuration using the included `render.yaml`.

### Option 1 — Blueprint / Git Deploy (Recommended, 2 Minutes)

1. Ensure your repository is pushed to your GitHub account (e.g. `https://github.com/SAIYAMgade/SAMdb`).
2. Log into [dashboard.render.com](https://dashboard.render.com/).
3. Click **New +** → **Blueprint**.
4. Connect your GitHub repository.
5. Render detects `render.yaml` automatically:
   - **Service Name:** `samdb`
   - **Environment:** `Node`
   - **Plan:** `Free`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
6. Click **Apply**.
7. In ~2 minutes, your SAMDB workbench is live at `https://samdb-xxxx.onrender.com`!

---

### Option 2 — Manual Web Service on Render Dashboard

If you prefer setting it up without blueprints:

1. In Render Dashboard, click **New +** → **Web Service**.
2. Select **Build and deploy from a Git repository**.
3. Choose your GitHub repository (`SAMdb`).
4. Configure the settings:
   - **Name:** `samdb`
   - **Region:** Choose the region nearest to you (e.g., Oregon, Frankfurt, Singapore)
   - **Branch:** `main`
   - **Root Directory:** (leave blank)
   - **Runtime:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Instance Type:** `Free`
5. Under **Environment Variables**, add:
   - `NODE_VERSION` = `20`
6. Click **Create Web Service**.

---

## Deploy to Vercel (Alternative)

1. Go to [vercel.com/new](https://vercel.com/new) and import the repository.
2. Framework Preset: **Next.js**
3. Build Command: `npm run build`
4. Output Directory: `.next`
5. Click **Deploy**.

---

## Local Production Smoke Test

Before deploying, you can test the production build locally:

```bash
# 1. Build optimized production bundle
npm run build

# 2. Start production server
npm start
# Server listens on http://localhost:3000
```
