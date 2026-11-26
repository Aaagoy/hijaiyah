---
title: "The speech model is served from the app itself and downloaded at build time, not stored in Supabase"
author: Yoga
date: 2026-11-26
branch: main
cost: { minutes: 17, tokens: 348479 }
id: l-2cd28f33
scope: repo
status: active
src: agent
touches:
  - ".env.example"
  - README.md
  - next.config.ts
  - package.json
  - src/lib/recognition/model-cache.ts
  - ".superpowers/brainstorm/981-1795592876/content/layout-beranda-latihan.html"
  - src/lib/content/letters.ts
  - src/lib/content/phonemes.ts
  - scripts/download-model.mjs
  - src/lib/db/migration.test.ts
---

## Decided
- The ~66 MB Zipformer model is not committed; `prebuild` downloads it from the tilawa GitHub release into `public/models/` and the app serves it with a one-year immutable Cache-Control header. Deploys (Vercel) get it the same way.
- `NEXT_PUBLIC_MODEL_URL` can point the browser at another host if the app host rejects a file that large.
- Table privileges for anon, authenticated and service_role are granted explicitly in a migration. A freshly created Supabase project no longer grants public-schema tables to the API roles, so even the service-role seed got "permission denied for table levels" (HTTP 403, code 42501) while RPCs and Storage worked.
- Grants are minimal: anon reads levels only; authenticated reads content and own progress and inserts attempts; progress/XP stay writable only via the security-definer complete_sublevel(); service_role gets all (seed).

## Tried and ruled out
- Supabase Storage: the free plan caps a single file at 50 MB, below the model size.
- Fetching straight from the GitHub release URL in the browser: release downloads redirect to a host that does not reliably allow CORS.

## Watch out
- An override host for the model must send CORS headers, otherwise the worker's fetch fails.

In the code:
- `package.json` (`prebuild`: copy-ort + `scripts/download-model.mjs`), `next.config.ts` (`headers()` for `/models` and `/ort`), `src/lib/recognition/model-cache.ts` (`MODEL_URL`)
- A count query with `head: true` hides this error (empty message); use a normal select to see code 42501.
- Every new table needs its own grant line, or it will be invisible to the app even with RLS policies in place.

- `supabase/migrations/0002_grants.sql`; tests in `src/lib/db/migration.test.ts` ("table privileges ...") run all migrations in order on PGlite.
