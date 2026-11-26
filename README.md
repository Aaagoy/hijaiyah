# Hijaiyah

Website gratis untuk belajar membaca huruf hijaiyah, harakat, dan tanwin secara bertahap.
User mendengar contoh, membaca lewat mikrofon, dan bacaannya diperiksa **langsung di browser**
(suara tidak pernah dikirim atau disimpan). Proyek Tugas Akhir.

- Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · ESLint · Vitest
- Supabase: Auth (email + password), Postgres (konten, progres, XP, riwayat percobaan), Storage (audio contoh)
- Pengenal suara: [`@tilawa/core`](https://github.com/yazinsai/tilawa) + `onnxruntime-web` di Web Worker

Desain: [`docs/superpowers/specs/2026-11-25-hijaiyah-mvp-design.md`](docs/superpowers/specs/2026-11-25-hijaiyah-mvp-design.md)

## Menjalankan

1. **Install:** `npm install`
2. **Model suara** (±66 MB, tidak di-commit): `npm run model:download`
3. **Supabase**
   - Buat project di supabase.com.
   - Buka *SQL Editor*, jalankan isi `supabase/migrations/0001_init.sql`, `0002_grants.sql`, lalu `0003_record_item.sql` (berurutan).
   - *Authentication → URL Configuration*: isi *Site URL* (mis. `http://localhost:3000`) dan tambahkan
     `http://localhost:3000/auth/confirm` (serta URL produksi) ke *Redirect URLs*.
   - Salin `.env.example` menjadi `.env.local`, lalu isi URL, anon key, dan service role key.
4. **Isi konten:** `npm run seed` (cek dulu dengan `npm run seed -- --dry-run`)
5. **Jalankan:** `npm run dev`, lalu buka http://localhost:3000

## Deploy ke Vercel

Mikrofon di browser hanya jalan lewat HTTPS, jadi untuk mencoba di HP web-nya perlu di-deploy.

1. Di vercel.com, *Add New → Project*, impor repo GitHub ini (framework terdeteksi otomatis: Next.js).
2. Isi *Environment Variables*: `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   (service role key **tidak** perlu di Vercel).
3. Deploy. Saat build, `prebuild` menyalin runtime WASM dan mengunduh model ke `public/models/`.
4. Tambahkan URL Vercel (mis. `https://hijaiyah.vercel.app`) dan `https://hijaiyah.vercel.app/auth/confirm`
   ke *Supabase → Authentication → URL Configuration* (Site URL dan Redirect URLs).

Jika hosting menolak file model yang besar, unggah model ke host lain yang mengizinkan CORS dan isi
`NEXT_PUBLIC_MODEL_URL`.

## Audio contoh

Rekam satu file per item ke `content/audio/<kunci-item>.<ext>` (mp3/m4a/wav/webm/ogg), lalu jalankan
`npm run seed` lagi. Daftar lengkap (252 item) ada di [`content/audio/README.md`](content/audio/README.md);
buat ulang dengan `npm run audio:checklist`. Item tanpa audio tetap bisa dilatih.

## Cara pengecekan bacaan

Rekaman mikrofon → mono 16 kHz → fitur fbank → model Zipformer (`@tilawa/core`) → log-probabilitas fonem per frame.
Tiap item punya fonem target dan daftar kandidat bacaan salah (harakat lain, versi tanwin/tanpa tanwin, huruf yang
bentuknya mirip). Skor tiap kandidat = (log-likelihood paksa − log-likelihood bebas) / jumlah token
(`src/lib/recognition/scoring.ts`). Bacaan benar jika target menang dan skornya ≥ `ACCEPT_SCORE` (awal: −3).
Transkrip tebakan bebas ikut disimpan di tabel `attempts` untuk analisis.

**Belum disetel dengan suara asli.** Rekam beberapa pembaca, lihat kolom `score` di `attempts`, lalu sesuaikan
`ACCEPT_SCORE`.

## Skrip

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js (otomatis menyalin file WASM onnxruntime ke `public/ort/`) |
| `npm test` | Unit test (termasuk tes model asli bila `public/models/` ada, dan tes SQL via PGlite) |
| `npm run lint` | ESLint |
| `npm run model:download` | Unduh model Zipformer |
| `npm run seed` | Upsert level/sub-level/item + upload audio ke Supabase |
| `npm run audio:checklist` | Tulis ulang daftar rekaman |

## Lisensi model

Kode: bebas digunakan. Model dan corpus Tilawa berlisensi **NPL-1.2 (non-komersial, share-alike)**,
jadi aman untuk web gratis ini; jangan dipakai untuk produk berbayar tanpa izin pemiliknya.
