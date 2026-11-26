---
title: "Pages that read the login session need a loading boundary, and stale dev styles mean clearing the dev cache"
author: Yoga
date: 2026-11-25
branch: feat/mvp
cost: { minutes: 41, tokens: 371128 }
id: l-c077e0eb
scope: repo
status: active
src: agent
touches:
  - README.md
  - src/app/error.tsx
  - src/app/page.tsx
  - src/app/profil/loading.tsx
  - src/app/profil/page.tsx
  - src/app/(auth)/actions.ts
  - src/app/belajar/actions.ts
  - src/components/practice/audio-player.test.ts
  - src/components/practice/audio-player.ts
  - src/components/practice/pieces.tsx
---

## Decided
- Every route whose page reads the Supabase session (cookies) has a `loading.tsx`. The scaffold turns on `cacheComponents`, so `next build` fails with "uncached or runtime data during prerendering" without one.
- Exam results are saved from the "Lanjut" click handler, not from a `useEffect` watching `finished`: the React lint rule `react-hooks/set-state-in-effect` rejects calling setState from an effect.
- Candidates (including "silence" = empty sequence) are ranked by forced − free log-likelihood over the whole clip, not by the per-token average. Silence has zero tokens, so dividing by token count made multi-token candidates (e.g. tanwin "بَن") beat silence on background noise and the app said "kamu membaca ban".
- The per-token score is only used as the acceptance floor (ACCEPT_SCORE = -3). If even the winner is below it, the verdict is "wrong" with no heard reading (generic "belum tepat"), never a specific "kamu membaca X".

## Tried and ruled out
- Restarting `npm run dev` to fix stale CSS: the dev server kept serving the scaffold's dark stylesheet even after a restart.
- Ranking on per-token scores: unfair between silence and longer candidates (see above).
- Reporting weak winners as "silent": a genuinely wrong letter outside the candidate list would then show "suara tidak terdengar".

## Watch out
- If dev pages look unstyled or show old colours after editing `globals.css`, delete `.next/dev` and restart dev; the production build was fine.

In the code:
- `next.config.ts` (`cacheComponents: true`), `src/app/belajar/loading.tsx`, `src/app/belajar/[sublevel]/loading.tsx`, `src/app/profil/loading.tsx`
- `src/components/practice/practice-session.tsx` (`onContinue` saves via `finishSublevel`)
- ACCEPT_SCORE is an untuned starting value; tune it from the score column of the attempts table with real recordings.
- Noise still counts as an attempt (can cost a star).

- `src/lib/recognition/scoring.ts` (`fit`, `scoreCandidates`, `ACCEPT_SCORE`)
- `src/lib/recognition/scoring.test.ts` ("never claims a specific wrong reading for unrelated noise")
