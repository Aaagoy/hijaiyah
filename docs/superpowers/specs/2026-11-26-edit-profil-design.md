# Edit profil: username dan foto — desain singkat

## Tujuan
Di halaman Profil, user bisa mengganti username dan memilih foto profil: salah satu dari 28 huruf
hijaiyah (avatar bawaan) atau foto upload sendiri. Fotonya tampil di header (menggantikan 👤) dan di
halaman Profil.

**Bukan tujuan (sekarang):** leaderboard (dibahas terpisah), ganti email/password, crop manual.
**Gagal kalau:** upload memakan memori besar, foto user bisa ditimpa user lain, atau XP bisa diubah user.

## Pendekatan (dipilih: 1)
1. **Foto dikecilkan di browser (canvas) → upload langsung ke Supabase Storage.** Dipilih: ringan untuk
   server/Vercel, file kecil, jalan di browser lama.
2. Kecilkan di server Next.js (`sharp`) — ditolak: dependensi berat, file mentah lewat server, batas request Vercel.
3. Simpan base64 di `profiles` — ditolak: data profil bengkak dan dimuat di setiap halaman.

## Keputusan
- **Kolom `profiles.avatar text`** berisi `huruf:<kunci>` (mis. `huruf:ba`) atau `foto:<path>`.
  User lama dan baru dapat huruf default yang ditentukan dari username (hash → salah satu 28 huruf).
- **Avatar huruf:** huruf Arab (font Amiri) di lingkaran berwarna; warna dari palet tetap per huruf. Tanpa file.
- **Foto upload:** pilih file gambar (maks 5 MB sebelum diproses) → potong tengah persegi → 256×256 WebP
  (fallback JPEG bila browser tak mendukung WebP) → upload ke bucket `avatars`, path
  `<user_id>/<timestamp>.webp`. Foto lama dihapus setelah yang baru tersimpan, jadi satu file per user.
- **Bucket `avatars`** dibaca publik (URL tidak bisa ditebak; siap kalau nanti leaderboard). Tulis/hapus
  hanya di folder `<auth.uid()>/` (policy storage.objects). Batas ukuran file 200 KB, tipe image/webp & image/jpeg.
- **Ganti username:** fungsi `update_username(p_username)` (security definer): aturan sama dengan daftar
  (`^[a-z0-9_]{3,20}$`), unik, pesan error Indonesia ("Username sudah dipakai"). Bisa diganti kapan saja.
- **Ganti avatar:** fungsi `set_avatar(p_avatar)` (security definer) — memvalidasi `huruf:<kunci valid>` atau
  `foto:<auth.uid()>/…`; user tidak diberi hak `update` langsung ke `profiles` (XP tetap aman).
- **Migration `0004_profile_edit.sql`**, dijalankan user di SQL Editor; diuji di PGlite seperti 0001–0003.
- **UI di /profil:** bagian "Edit profil": avatar besar + tombol "Ganti foto" → panel berisi grid 28 huruf
  dan tombol "Upload foto"; field username + tombol Simpan. Responsive (grid 7 kolom di HP).

## Diserahkan ke pembuat
Palet warna persis, tata letak detail panel, teks tombol/pesan kecil.
