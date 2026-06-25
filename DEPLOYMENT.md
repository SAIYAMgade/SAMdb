# Deploying QueryForge

QueryForge is a standard Next.js app. The engine runs **entirely client-side**, so there's no database to provision, no server state, and **no environment variables**. Deployment is about as easy as it gets.

---

## Deploy to Vercel (recommended)

### Option A — Dashboard (2 minutes)

1. Push this repo to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new) and **Import** the `queryforge` repository.
3. Vercel auto-detects Next.js. Leave the defaults:
   - **Framework Preset:** Next.js
   - **Build Command:** `next build` (default)
   - **Output Directory:** `.next` (default)
   - **Install Command:** `npm install` (default)
4. **Environment Variables:** none required. Skip it.
5. Click **Deploy**. You'll get a `*.vercel.app` URL in ~1 minute.

### Option B — CLI

```bash
npm i -g vercel
vercel          # preview deploy
vercel --prod   # production deploy
```

---

## Custom domain

The metadata assumes `https://queryforge.charanreddy.dev`. To use it:

1. In the Vercel project: **Settings → Domains → Add** `queryforge.charanreddy.dev`.
2. At your DNS provider, add the record Vercel shows you (a `CNAME` to `cname.vercel-dns.com` for a subdomain).
3. Wait for DNS to propagate; Vercel issues the SSL cert automatically.
4. If you use a different URL, update `site.url` in [`src/lib/site.ts`](src/lib/site.ts) so the canonical URL and Open Graph tags match.

---

## Notes specific to this project

- **No backend / no env vars.** The whole engine is client-side TypeScript. Nothing to configure.
- **State lives in the browser.** The demo seeds itself on first load and persists its write-ahead log to `localStorage`, so a visitor's database survives a refresh (and `Recover` rebuilds from it). There's nothing to persist server-side.
- **The Open Graph image** (`/opengraph-image`) is generated on demand by `@vercel/og`. It renders on Vercel and any Linux host. (A known `@vercel/og` quirk breaks it only under Windows self-hosted `next start`; it does **not** affect the deployed card.)
- **ESLint** is skipped during the production build (`eslint.ignoreDuringBuilds` in `next.config.mjs`) — run it separately if you add an ESLint config.
- The `webpack.resolve.symlinks = false` line in `next.config.mjs` is only relevant if your `node_modules` is a symlink/junction; it's harmless on a normal install and on Vercel.

---

## Verify before you ship

```bash
npm install
npm test          # 23 tests should pass
npm run build     # should compile with no type errors
npm run start     # smoke-test the production build locally
```

Then open the live URL and confirm:

- [ ] The playground loads with the seeded `users` table and runs the starter query.
- [ ] Running an `id = …` query lights up the B+tree search path.
- [ ] "Force full scan" changes the row-visit counter.
- [ ] "Pull the plug" then "Recover" rebuilds the data.
- [ ] `/about` and `/about-project` render and their links work.
- [ ] The social card looks right: paste the URL into the [OpenGraph debugger](https://www.opengraph.xyz/) (or post it in Slack/LinkedIn).

---

## Manual steps only you can do

A short checklist of the human-in-the-loop bits:

1. **Create the GitHub repo** and push (`https://github.com/charanreddy-27/queryforge`). If you use a different name, update `site.author.githubRepo` in `src/lib/site.ts` and the links in the docs.
2. **Deploy to Vercel** (Option A above).
3. **Point the domain** `queryforge.charanreddy.dev` (or update `site.url`).
4. **Add a screenshot + GIF** to `docs/` and update the image paths in `README.md`. A 10–15s GIF of the B+tree splitting and the WAL replay is the money shot.
5. **Record the launch GIF** straight from the playground (it's deterministic — the seeded demo looks the same every time).
6. **Post on LinkedIn** (copy below), then paste the post URL into `site.linkedinPost` in `src/lib/site.ts` so the "LinkedIn post" link on the project page goes live.

### Suggested LinkedIn copy

> I built a SQL database from scratch — storage engine, write-ahead log, query planner — and made a playground that animates the B+tree and the crash recovery as you type queries. No ORM, no Postgres underneath.
>
> The fun part: the visualization isn't a mock. It replays the engine's own event log, so if the engine didn't touch a page, you literally can't see it light up. Type `SELECT … WHERE id = 12` and watch the tree descend; flip "force full scan" and watch the row-visit counter jump.
>
> Property-tested with fast-check — 10,000 random inserts, every lookup correct, the tree stays balanced. Here's what I learned writing a database 👇
>
> [link] [GIF]
