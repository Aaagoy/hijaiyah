# Hijaiyah MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A responsive Next.js website where logged-in users learn hijaiyah letters, harakat and tanwin level by level, hear examples, and get their reading checked on-device.

**Architecture:** Next.js 16 App Router + Supabase (Auth, Postgres with RLS, Storage). Curriculum is generated from TS data and seeded into Supabase by a script. Recognition runs in a Web Worker: mic PCM → 16 kHz → `@tilawa/core` KaldiFbank + ZipformerRunner (onnxruntime-web) → frame log-probs → candidate scoring via forced CTC alignment, plus a greedy transcript for logging.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, ESLint, Vitest, @supabase/supabase-js + @supabase/ssr, @tilawa/core 0.4.0, onnxruntime-web (browser), onnxruntime-node (tests only), tsx (scripts).

**Spec:** `docs/superpowers/specs/2026-11-25-hijaiyah-mvp-design.md`

## Global Constraints

- UI copy in Bahasa Indonesia; code identifiers in English.
- Stars: attempt 1 → 3; attempts 2–4 → 2; attempt ≥5 → 1. Sub-level stars = floor(mean item stars). XP = 10 per star, only the improvement over the stored best is awarded. User level n threshold = 25·(n−1)·(n+2) XP (L1 = 0, L2 = 100, L3 = 250).
- Next sub-level unlocks when every item of the previous sub-level (global order) has been read correctly in Ujian. Coming-soon levels are always locked.
- User audio is never uploaded or stored. Attempts store: item, correct, heard candidate key, score, transcript, attempt number, timestamp.
- Signup fields: username (3–20 chars, `[a-z0-9_]`, unique), email, password (≥ 8 chars). Login: email + password. No Google, no roles.
- Model file `public/models/zipformer_a0w_ep1_a05.int8.onnx` is git-ignored, fetched by `npm run model:download`, cached in browser Cache Storage (`hijaiyah-model-v1`) with download progress.
- Phoneme strings use tilawa's alphabet: short CV token = letter + vowel mark (`بَ`), long a = `اا`, long i = `ۦۦ`, long u = `ۥۥ`, hamza = `ء`, tanwin = CV + `ن`. Every target and candidate must tokenize with `encodePhonemes` (non-null).
- Decoding must append ≥ 1.0 s of silence before `inputFinished()` (the streaming runner keeps up to T=61 frames pending).

## Review Focus

- Silence or noise only → verdict "tidak terdengar" (not counted as a wrong reading with a bogus "kamu membaca …").
- Mic permission denied / no mic / insecure context → clear Indonesian message, no crash.
- Model download interrupted or offline → error with retry; partial download never cached.
- Replaying a completed sub-level with fewer stars → stored best stars and XP never decrease.
- Username already taken / email needs confirmation → clear message on the signup page.

---

### Task 1: Project scaffold and progression rules

**Files:**
- Create: Next.js app at repo root (via create-next-app in a temp dir, then moved), `vitest.config.ts`, `.env.example`, `src/lib/game/progression.ts`
- Test: `src/lib/game/progression.test.ts`

**Interfaces:**
- Produces: `starsForAttempts(attempts: number): 1|2|3`; `sublevelStars(itemStars: number[]): 0|1|2|3` (0 for empty); `xpDelta(oldBest: number, newStars: number): number`; `levelForXp(xp: number): { level: number; current: number; next: number }` (current/next = thresholds of this and next level); `xpThreshold(level: number): number`.

- [ ] **Step 1: Scaffold** — `npx create-next-app@latest <tmp>/app --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes`, move contents to repo root (merge `.gitignore`, add `.superpowers/`, `public/models/`, `public/ort/`, `.env*.local`). Add vitest (`npm i -D vitest`), script `"test": "vitest run"`.
- [ ] **Step 2: Write failing tests** — `starsForAttempts(1)=3, (2)=2, (4)=2, (5)=1, (9)=1`; `sublevelStars([3,2,2])=2`, `([3,3,3])=3`, `([])=0`; `xpDelta(0,3)=30`, `(2,3)=10`, `(3,1)=0`; `xpThreshold(1)=0,(2)=100,(3)=250,(4)=450`; `levelForXp(0).level=1`, `levelForXp(99).level=1`, `levelForXp(100)` → `{level:2,current:100,next:250}`.
- [ ] **Step 3: Run** `npx vitest run src/lib/game` — Expected: FAIL (module not found).
- [ ] **Step 4: Implement** `src/lib/game/progression.ts`.
- [ ] **Step 5: Run** `npx vitest run src/lib/game` — Expected: PASS. Also `npm run lint` and `npm run build` — Expected: success.
- [ ] **Step 6: Commit** `feat: scaffold Next.js app and progression rules`.

### Task 2: Curriculum content generator

**Files:**
- Create: `src/lib/content/letters.ts`, `src/lib/content/phonemes.ts`, `src/lib/content/curriculum.ts`
- Test: `src/lib/content/curriculum.test.ts`

**Interfaces:**
- Produces:
  - `type Vowel = "a"|"i"|"u"`; `interface Letter { key: string; char: string; latin: string; name: string; namePhonemes: string; neighbors: string[] }` — 28 letters in order ا…ي; alif uses `ء` as its voweled form.
  - `syllable(letter: Letter, vowel: Vowel, tanwin: boolean): { arabic: string; phonemes: string; latin: string }` — e.g. ب,a,false → `{arabic:"بَ", phonemes:"بَ", latin:"ba"}`; ب,u,true → `{arabic:"بٌ", phonemes:"بُن", latin:"bun"}`; alif,a → `{arabic:"أَ", phonemes:"ءَ", latin:"a"}`.
  - `interface Candidate { key: string; phonemes: string; latin: string }`; `interface CurriculumItem { key: string; arabic: string; latin: string; phonemes: string; explanation: string; candidates: Candidate[] }` (candidates exclude target; key unique across curriculum, e.g. `fathah-ba`); `interface CurriculumSublevel { key: string; order: number; title: string; items: CurriculumItem[] }`; `interface CurriculumLevel { key: string; order: number; title: string; description: string; comingSoon: boolean; sublevels: CurriculumSublevel[] }`.
  - `buildCurriculum(): CurriculumLevel[]` — 11 levels in spec order; letter levels split into groups of 5,5,5,5,4,4; mixed levels: 4 sublevels of 7 letters, 7 items each (letter i gets vowel `["a","i","u"][i%3]`); coming-soon levels have no sublevels.
  - Candidate rules: other two vowels (same tanwin flag), same vowel with flipped tanwin (harakat/tanwin levels only), up to 3 neighbor letters with the same vowel/tanwin; for letter-name items: names of neighbors and of the other letters in the sublevel.

- [ ] **Step 1: Failing tests** — 11 levels, last two `comingSoon` with 0 sublevels; level 1 has 6 sublevels, 28 items total; `syllable` examples above; every item key unique; every target and candidate `encodePhonemes(...) !== null`; no candidate equals its target's phonemes; `fathah-ba` candidates include `bi`, `bu`, `ban`.
- [ ] **Step 2: Run** `npx vitest run src/lib/content` — Expected: FAIL.
- [ ] **Step 3: Implement** the three files (explanations: short Indonesian sentence per item, e.g. "Fathah (garis di atas huruf) dibaca a: بَ = ba.").
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `feat: generate hijaiyah curriculum with phoneme candidates`.

### Task 3: Candidate scoring

**Files:**
- Create: `src/lib/recognition/scoring.ts`
- Test: `src/lib/recognition/scoring.test.ts`

**Interfaces:**
- Consumes: `Candidate` (Task 2); `FramePosteriors`, `encodePhonemes`, `forcedLogLik`, `freeLogLik` from `@tilawa/core`.
- Produces: `SILENCE_KEY = "__silence__"`; `ACCEPT_SCORE = -3` (tunable); `interface Verdict { status: "correct"|"wrong"|"silent"; heardKey: string|null; targetScore: number; scores: Record<string, number> }`; `scoreCandidates(post: FramePosteriors, frames: number, target: Candidate, others: Candidate[]): Verdict` — score = (forced − free)/max(1, tokens); silence candidate = empty sequence; `silent` when silence has the best score; `correct` when target is best and `targetScore >= ACCEPT_SCORE`; otherwise `wrong` with `heardKey` = best non-silence key (or null if target best but below threshold).

- [ ] **Step 1: Failing tests** with synthetic posteriors built in the test (helper filling frames so a chosen token sequence dominates): target sequence dominant → `correct`; `بِ` dominant for target `بَ` → `wrong`, heardKey `bi`; all-blank → `silent`.
- [ ] **Step 2: Run** `npx vitest run src/lib/recognition/scoring` — Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `feat: score readings against candidate phonemes`.

### Task 4: Audio utilities and recognition engine

**Files:**
- Create: `src/lib/recognition/audio.ts`, `src/lib/recognition/engine.ts`
- Test: `src/lib/recognition/audio.test.ts`, `src/lib/recognition/engine.test.ts`

**Interfaces:**
- Consumes: `scoreCandidates`, `Verdict` (Task 3).
- Produces: `downmix(channels: Float32Array[]): Float32Array`; `resampleLinear(input: Float32Array, fromRate: number, toRate: number): Float32Array`; `TAIL_SILENCE_SECONDS = 1`; `class RecognitionEngine { static create(ort: unknown, model: ArrayBuffer|Uint8Array): Promise<RecognitionEngine>; recognize(pcm16k: Float32Array, target: Candidate, others: Candidate[]): Promise<Verdict & { transcript: string }> }` — resets runner/fbank per call, appends tail silence, pushes log-probs into `FramePosteriors(251, 4000)`, greedy-decodes transcript.

- [ ] **Step 1: Failing tests** — `downmix` averages channels; `resampleLinear` 48000→16000 of 4800 samples gives 1600; constant signal stays constant. Engine test (skipped when `public/models/zipformer_a0w_ep1_a05.int8.onnx` is missing) with onnxruntime-node: 1.5 s of near-silence → `status: "silent"`.
- [ ] **Step 2: Run** `npx vitest run src/lib/recognition` — Expected: FAIL.
- [ ] **Step 3: Implement** (add `npm run model:download` script `scripts/download-model.mjs` fetching the release URL into `public/models/`).
- [ ] **Step 4: Run** — Expected: PASS (engine test runs, not skipped, after `npm run model:download`).
- [ ] **Step 5: Commit** `feat: on-device recognition engine`.

### Task 5: Browser recognizer (worker, model cache, recorder)

**Files:**
- Create: `src/lib/recognition/model-cache.ts`, `src/lib/recognition/recognizer.worker.ts`, `src/lib/recognition/use-recognizer.ts`, `src/lib/recognition/use-recorder.ts`, `scripts/copy-ort.mjs`
- Test: `src/lib/recognition/model-cache.test.ts`

**Interfaces:**
- Consumes: `RecognitionEngine` (Task 4).
- Produces: `fetchWithCache(url: string, cache: CacheLike, fetcher: typeof fetch, onProgress: (loaded: number, total: number) => void): Promise<ArrayBuffer>` (stores only complete responses); worker messages `{type:"load"}` → `{type:"progress",loaded,total}` / `{type:"ready"}` / `{type:"error",message}`; `{type:"recognize",id,pcm,target,others}` → `{type:"result",id,verdict}`. Hook `useRecognizer(): { state: "idle"|"loading"|"ready"|"error"; progress: number; error: string|null; load(): void; recognize(pcm16k, target, others): Promise<Verdict & {transcript:string}> }`. Hook `useRecorder(): { recording: boolean; error: string|null; start(): Promise<void>; stop(): Promise<Float32Array> }` returning 16 kHz mono PCM; Indonesian errors for denied permission / no mic / insecure context.

- [ ] **Step 1: Failing tests** for `fetchWithCache`: cache hit skips fetch; miss streams with progress then stores; a stream that errors stores nothing and rejects.
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement**; `copy-ort.mjs` copies `onnxruntime-web/dist/*.wasm` + `*.mjs` to `public/ort/` (run in `predev`/`prebuild`); worker sets `ort.env.wasm.wasmPaths = "/ort/"` and `numThreads = 1`.
- [ ] **Step 4: Run** tests — Expected: PASS. `npm run build` — Expected: success.
- [ ] **Step 5: Commit** `feat: browser recognizer worker with cached model`.

### Task 6: Supabase schema, clients, auth guard, unlock rules

**Files:**
- Create: `supabase/migrations/0001_init.sql`, `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/proxy.ts`, `src/proxy.ts`, `src/lib/progress/unlock.ts`
- Test: `src/lib/progress/unlock.test.ts`

**Interfaces:**
- Produces: tables `profiles(id uuid pk → auth.users, username text unique, xp int default 0)`, `levels(id, key unique, ord, title, description, coming_soon)`, `sublevels(id, level_id, key unique, ord, title)`, `items(id, sublevel_id, key unique, ord, arabic, latin, phonemes, explanation, candidates jsonb, audio_path)`, `item_progress(user_id, item_id, best_stars, pk(user_id,item_id))`, `sublevel_progress(user_id, sublevel_id, best_stars, completed_at)`, `attempts(id, user_id, item_id, mode, attempt_no, correct, heard_key, score, transcript, created_at)`; RLS (content readable by authenticated users; progress/attempts own rows only; profiles readable by owner); trigger creating `profiles` from `raw_user_meta_data.username` on signup; RPC `username_available(p_username text) returns boolean` (callable by anon); RPC `complete_sublevel(p_sublevel_id uuid, p_item_stars jsonb) returns table(xp_gained int, total_xp int, sublevel_stars int)` (security definer, best-only, XP from improvements); public storage bucket `audio`.
  `src/lib/progress/unlock.ts`: `interface SublevelState { id: string; levelComingSoon: boolean; completed: boolean }`; `computeUnlocked(ordered: SublevelState[]): Set<string>`.
  Proxy redirects unauthenticated requests under `/belajar` and `/profil` to `/masuk`, and logged-in users away from `/masuk`/`/daftar` to `/belajar`.
- [ ] **Step 1: Failing tests** — first sublevel unlocked; second locked until first completed; coming-soon never unlocked; completing out of order does not unlock beyond the first incomplete +1.
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement** (check `node_modules/next/dist/docs` for the Next 16 `proxy.ts` convention before writing it).
- [ ] **Step 4: Run** tests — PASS; `npm run build` — success.
- [ ] **Step 5: Commit** `feat: supabase schema, auth guard, unlock rules`.

### Task 7: Content seed script

**Files:**
- Create: `scripts/seed.ts`, `src/lib/content/to-rows.ts`, `content/audio/README.md`
- Test: `src/lib/content/to-rows.test.ts`

**Interfaces:**
- Consumes: `buildCurriculum` (Task 2), schema (Task 6).
- Produces: `toRows(levels: CurriculumLevel[], audioFiles: Set<string>): { levels: LevelRow[]; sublevels: SublevelRow[]; items: ItemRow[] }` where rows reference parents by `key` and `audio_path` = `items/<itemKey>.<ext>` when `content/audio/<itemKey>.(mp3|m4a|wav|webm|ogg)` exists, else null. `npm run seed` (tsx) upserts by key using `SUPABASE_SERVICE_ROLE_KEY` and uploads audio; `--dry-run` prints counts only.
- [ ] **Step 1: Failing tests** — row counts match curriculum; audio path set only for present files; parent keys resolve.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** — PASS; `npm run seed -- --dry-run` prints `levels=11 sublevels=… items=…`.
- [ ] **Step 5: Commit** `feat: seed curriculum and audio into supabase`.

### Task 8: Auth pages

**Files:**
- Create: `src/lib/auth/validation.ts`, `src/app/(auth)/daftar/page.tsx`, `src/app/(auth)/masuk/page.tsx`, `src/app/(auth)/actions.ts`, `src/app/auth/confirm/route.ts`
- Test: `src/lib/auth/validation.test.ts`

**Interfaces:**
- Produces: `validateSignup(input: { username: string; email: string; password: string }): Record<"username"|"email"|"password", string|undefined>` with Indonesian messages; server actions `signUp`, `signIn`, `signOut`.
- [ ] **Step 1: Failing tests** — username too short / bad chars / uppercase normalized? (reject uppercase → message), invalid email, short password, valid input → all undefined.
- [ ] **Step 2–4:** FAIL → implement (signup checks `username_available` first; shows "cek email untuk konfirmasi" when no session returned) → PASS; build succeeds.
- [ ] **Step 5: Commit** `feat: signup and login pages`.

### Task 9: Learning home (card list) and app shell

**Files:**
- Create: `src/lib/progress/queries.ts`, `src/components/app-header.tsx`, `src/app/belajar/page.tsx`, `src/components/sublevel-card.tsx`
- Test: `src/lib/progress/queries.test.ts`

**Interfaces:**
- Consumes: `computeUnlocked` (Task 6), `levelForXp` (Task 1).
- Produces: `buildHomeModel(levels, sublevels, items, progress): HomeLevel[]` (pure; each sublevel: id, title, letters preview, stars, itemsDone/itemsTotal, locked, completed); page renders cards (spec option B), header with username, level, XP bar.
- [ ] **Step 1–4:** failing test for `buildHomeModel` (locked flags, stars, progress counts, coming-soon labels) → implement → PASS; build succeeds.
- [ ] **Step 5: Commit** `feat: learning home with sublevel cards`.

### Task 10: Sub-level practice (Belajar + Ujian)

**Files:**
- Create: `src/app/belajar/[sublevel]/page.tsx`, `src/components/practice/practice-session.tsx`, `src/components/practice/item-card.tsx`, `src/components/practice/feedback.tsx`, `src/lib/practice/session-state.ts`, `src/app/belajar/actions.ts`
- Test: `src/lib/practice/session-state.test.ts`

**Interfaces:**
- Consumes: `useRecognizer`, `useRecorder` (Task 5), `starsForAttempts` (Task 1), `complete_sublevel` RPC (Task 6).
- Produces: pure reducer `practiceReducer(state, action)` for Ujian: actions `verdict` (correct → record stars, advance; wrong/silent → attempts+1 unless silent), `next`; `state.finished` when all items correct; `itemStars: Record<itemId, 1|2|3>`. Silent verdict does not count as an attempt. Server action `recordAttempt(...)` inserts into `attempts`; `finishSublevel(sublevelId, itemStars)` calls RPC and returns xp gained.
- [ ] **Step 1–4:** failing reducer tests (first-try correct → 3 stars; two wrong then correct → 2; silent not counted; finished after last item) → implement UI (model loading progress, Belajar cards with dengar/coba, Ujian flow, feedback benar/salah/tidak terdengar, result screen with stars + XP) → PASS; build succeeds.
- [ ] **Step 5: Commit** `feat: practice and exam flow with on-device checking`.

### Task 11: Landing, profile, polish

**Files:**
- Create/Modify: `src/app/page.tsx`, `src/app/profil/page.tsx`, `src/app/layout.tsx`, `README.md`
- [ ] **Step 1:** Landing (what it is, Mulai belajar → /daftar or /belajar), profile (username, level, XP, sub-levels done, logout), fonts (Arabic font via `next/font`), README (setup: Supabase project, run SQL, env, `model:download`, record audio into `content/audio`, `seed`).
- [ ] **Step 2: Verify** `npm run lint`, `npm test`, `npm run build` — all succeed; open in browser pane at mobile/tablet/desktop sizes.
- [ ] **Step 3: Commit** `feat: landing and profile pages`.
