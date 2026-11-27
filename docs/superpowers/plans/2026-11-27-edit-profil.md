# Edit Profil Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** User bisa mengganti username dan memilih avatar (28 huruf hijaiyah atau foto upload) dari halaman Profil.

**Architecture:** Migration `0004` menambah kolom `profiles.avatar`, dua fungsi security-definer (`update_username`, `set_avatar`) dan bucket `avatars` dengan policy per folder user. Foto diproses di browser (canvas → 256×256 WebP/JPEG) lalu di-upload langsung lewat Supabase browser client; server action hanya memanggil RPC.

**Tech Stack:** Next.js 16 (server actions, `useActionState`), Supabase (RPC, Storage), Vitest + PGlite.

**Spec:** `docs/superpowers/specs/2026-11-26-edit-profil-design.md`

## Global Constraints

- Username: `^[a-z0-9_]{3,20}$`, unik; pesan error berbahasa Indonesia.
- Avatar disimpan sebagai `huruf:<kunci>` atau `foto:<user_id>/<nama-file>`; `null` = huruf default dari username.
- Foto: input maks 5 MB; output 256×256, WebP (fallback JPEG); bucket menolak > 200 KB; tipe `image/webp`, `image/jpeg`.
- User tidak pernah mendapat hak `update` langsung ke `profiles`.
- Commit tanpa atribusi Claude.

## Review Focus

- Username yang sama dengan miliknya sendiri disimpan ulang → sukses, bukan "sudah dipakai" (Task 1 test).
- Username dengan huruf besar → disimpan lowercase seperti saat daftar (Task 1 test).
- `set_avatar('foto:<user lain>/x.webp')` → ditolak (Task 1 test).
- File bukan gambar / > 5 MB → pesan error, tidak ada upload (Task 2 test `checkImageFile`).
- Upload gagal di tengah → avatar lama tetap; file lama hanya dihapus setelah `set_avatar` sukses (Task 4, urutan di `uploadAvatar`).

---

### Task 1: Migration 0004 + tes PGlite

**Files:**
- Create: `supabase/migrations/0004_profile_edit.sql`
- Modify: `src/lib/db/migration.test.ts` (stub `storage.objects`, `storage.foldername`, kolom bucket `file_size_limit`, `allowed_mime_types`)

**Interfaces — Produces:**
- `profiles.avatar text null`
- `public.update_username(p_username text) returns text` — mengembalikan username tersimpan; raise `'username_invalid'` / `'username_taken'`.
- `public.set_avatar(p_avatar text) returns void` — raise `'avatar_invalid'`. Huruf valid = 28 kunci di `LETTERS`.
- Bucket `avatars` (public, 204800 byte, webp/jpeg); policy insert/update/delete `to authenticated` bila `(storage.foldername(name))[1] = auth.uid()::text`.

- [ ] Tes: `update_username('Ahmad_Baru')` → `'ahmad_baru'`; nama sendiri → sukses; nama user lain → error `username_taken`; `'ab'` → `username_invalid`.
- [ ] Tes: `set_avatar('huruf:ba')` lalu select avatar = `'huruf:ba'`; `'huruf:xx'`, `'foto:<uuid lain>/a.webp'` → `avatar_invalid`; `'foto:<USER>/a.webp'` sukses.
- [ ] Tes: authenticated tidak punya privilege `update` pada `public.profiles`.
- [ ] Jalankan `npx vitest run src/lib/db` → FAIL; tulis migration; jalankan → PASS; commit.

### Task 2: Lib avatar (huruf default, parsing, cek & kecilkan foto)

**Files:**
- Create: `src/lib/profile/avatar.ts`, `src/lib/profile/avatar.test.ts`, `src/lib/profile/resize-image.ts` (browser only, tanpa tes unit — diverifikasi di Task 5)

**Interfaces — Produces:**
- `type Avatar = { kind: "huruf"; letter: Letter; color: string } | { kind: "foto"; url: string }`
- `defaultLetterKey(username: string): string` — hash stabil (jumlah kode char mod 28).
- `resolveAvatar(avatar: string | null, username: string, publicUrl: (path: string) => string): Avatar`
- `LETTER_COLORS: string[]` (palet Tailwind bg, dipakai bergiliran per indeks huruf).
- `checkImageFile(file: { type: string; size: number }): string | undefined` — pesan error Indonesia.
- `resizeToSquare(file: File, size = 256): Promise<Blob>` — center crop di canvas, `toBlob("image/webp", 0.85)`, fallback `image/jpeg` bila hasil bukan webp.

- [ ] Tes: `defaultLetterKey` deterministik dan selalu kunci valid; `resolveAvatar(null, "tes123")` = huruf default; `resolveAvatar("huruf:ba")` = Ba; `resolveAvatar("foto:u/a.webp")` = url dari `publicUrl`; nilai rusak → huruf default.
- [ ] Tes: `checkImageFile` menolak `text/plain` dan > 5 MB, menerima `image/png` 1 MB.
- [ ] FAIL → implementasi → PASS → commit.

### Task 3: Server actions + profil membaca avatar

**Files:**
- Create: `src/app/profil/actions.ts`
- Modify: `src/lib/progress/queries.ts` (`Profile.avatar: string | null`, select `avatar`), `src/lib/auth/signup-result.ts` bila perlu pesan

**Interfaces — Produces:**
- `updateUsername(prev: UsernameState, form: FormData): Promise<UsernameState>`; `UsernameState = { message?: string; ok?: boolean; value: string }`. Validasi pakai `validateUsername`; map error RPC → "Username sudah dipakai." / pesan validasi; `revalidatePath("/", "layout")` saat sukses.
- `chooseAvatar(avatar: string): Promise<{ ok: boolean; message?: string }>` — panggil `set_avatar`, revalidate.

- [ ] Typecheck + lint bersih; commit.

### Task 4: UI edit profil + avatar di header

**Files:**
- Create: `src/components/avatar-badge.tsx` (server-safe, render `Avatar`), `src/app/profil/profile-editor.tsx` (client)
- Modify: `src/app/profil/page.tsx`, `src/components/app-header.tsx`

**Behavior:**
- Header & profil memakai `AvatarBadge` (ganti 👤).
- `ProfileEditor`: form username (`useActionState(updateUsername)`), tombol "Ganti foto" membuka panel grid 28 huruf (7 kolom di HP) + tombol "Upload foto".
- `uploadAvatar(file)`: `checkImageFile` → `resizeToSquare` → `storage.from("avatars").upload("<uid>/<Date.now()>.<ext>")` → `chooseAvatar("foto:…")` → setelah sukses hapus file lama milik user (path dari avatar lama). Gagal di langkah mana pun → pesan error, avatar lama tetap.
- Tombol nonaktif selama proses; teks status "Mengunggah…".

- [ ] Lint, typecheck, `npm test`, `npm run build` bersih; commit.

### Task 5: Verifikasi & serah

- [ ] User menjalankan `0004_profile_edit.sql` di SQL Editor.
- [ ] Cek di browser (user login sendiri): ganti username, pilih huruf, upload foto, ganti foto lagi (file lama hilang di Storage), header ikut berubah.
