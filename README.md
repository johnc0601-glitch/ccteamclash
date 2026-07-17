# CC Team Clash

A simple, low-cost league news site built with Next.js.

## Project structure

The application now lives at the repository root so standard project commands run from this directory.

- `src/app` contains the Next.js routes.
- `src/components` contains React UI components.
- `src/shared` contains shared constants, hooks, types, and utilities.
- `docs` contains project planning and architecture notes.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Publishing without subscriptions

1. Open `/admin`.
2. Add the headline, photo, story and links.
3. Export the JSON file.
4. Add the exported story to `src/lib-data.ts` and copy the image into `public/uploads`.
5. Commit to GitHub. Vercel deploys automatically on its free tier.

This deliberately avoids a database at first. Supabase can be added later when multi-device login and direct publishing become necessary.

## Deploy

Import the GitHub repository into Vercel, accept the defaults, then connect `ccteamclash.com` under Project Settings → Domains.

---

Test: verify GitHub + Vercel pipeline — committed by GitHub Copilot Chat Assistant on 2026-07-17.
