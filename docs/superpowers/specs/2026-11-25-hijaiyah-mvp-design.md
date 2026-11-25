# Hijaiyah — Desain MVP

Tanggal: 2026-11-25 · Status: disetujui lewat diskusi brainstorming (user minta langsung implementasi)

## Tujuan dan alasan

Website gratis untuk umum yang mengajarkan cara membaca huruf hijaiyah, harakat, dan tanwin secara bertahap
(konsep leveling seperti aplikasi belajar bergaya Duolingo). User mendengar contoh, lalu praktik membaca
lewat mikrofon, dan langsung tahu benar/salah beserta cara baca yang benar. Proyek ini juga Tugas Akhir (TA),
jadi fitur cek bacaan adalah bagian yang paling diuji, dan data hasil percobaan dipakai untuk analisis.

## Sasaran (versi pertama)

- Materi: huruf hijaiyah (nama huruf), fathah, kasrah, dhammah, campuran harakat, fathatain, kasratain,
  dhammatain, campuran tanwin.
- Tajwid dan potongan kata Al-Qur'an tampil di daftar level sebagai **"Segera hadir"** (terkunci).
- Cek bacaan target **A**: deteksi salah harakat, tanwin tidak dibaca/terbaca, dan huruf yang bunyinya jauh beda.
- Akun wajib: daftar dengan **username, email, password**; login dengan **email + password**.
- Responsif: HP, tablet, desktop. Peduli perangkat lama.

## Bukan sasaran (sekarang)

- Login Google, peran admin/ustadz, halaman admin (konten diisi lewat script).
- Streak, nyawa, papan peringkat.
- Penilaian makhraj huruf mirip (target B) dan tajwid (target C) — B boleh diuji sebagai penelitian TA.
- Menyimpan rekaman suara user (tidak pernah dikirim/disimpan; hanya hasilnya).

## Anti-sasaran

- Pemula frustrasi karena penilaian terlalu ketat atau acak untuk suara pendek.
- Suara user keluar dari perangkat.
- Web tidak bisa dipakai di HP kelas bawah.

## Batasan

- Stack: Next.js terbaru (16.x, App Router), TypeScript, Tailwind CSS, ESLint, Supabase (Auth, Postgres, Storage),
  `@tilawa/core` + `onnxruntime-web` di browser.
- Lisensi model tilawa NPL-1.2: non-komersial → aman untuk web gratis; model dipakai apa adanya.
- Model ~66 MB: diunduh sekali, disimpan di Cache Storage, ada progress bar. Tidak di-commit ke git.
- Mikrofon butuh HTTPS (localhost dikecualikan).

## Pendekatan cek bacaan (dipilih: Cara 3)

1. *Tebak bebas lalu bandingkan teks* — sederhana, tapi rawan kosong/ngawur untuk suara pendek.
2. *Bandingkan dengan daftar kandidat* — skor rekaman terhadap tiap kandidat bacaan (forced CTC alignment,
   `forcedLogLik`/`freeLogLik` dari `@tilawa/core`), kandidat skor tertinggi = yang diucapkan.
3. **Dipilih:** Cara 2 untuk memutuskan, ditambah transkrip tebak bebas (greedy CTC) disimpan di riwayat
   percobaan untuk analisis TA.
4. (Dicoret) Inferensi di server — bertentangan dengan pilihan `onnxruntime-web`, berbayar, suara keluar perangkat.

Detail: model berjalan di Web Worker. Audio mic → mono 16 kHz → Kaldi fbank → Zipformer → log-prob per frame.
Tiap item punya fonem target + kandidat salah (harakat lain, versi tanwin/tanpa tanwin, huruf tetangga) + kandidat
"diam". Skor = (forced − free) / jumlah token. Benar jika target menang dan skornya ≥ ambang (disetel saat uji).
Feedback salah menyebut kandidat pemenang ("kamu membaca *bi*, harusnya *ba*") + penjelasan + tombol dengar contoh.

## Struktur belajar

- Level materi (urut): 1 Huruf hijaiyah · 2 Fathah · 3 Kasrah · 4 Dhammah · 5 Campuran harakat · 6 Fathatain ·
  7 Kasratain · 8 Dhammatain · 9 Campuran tanwin · 10 Tajwid (segera hadir) · 11 Potongan kata (segera hadir).
- Tiap level dipecah jadi sub-level berisi 4–5 huruf.
- Sub-level punya dua mode: **Belajar** (kartu: lihat, dengar, coba rekam, tanpa nilai) dan **Ujian**
  (semua item sub-level diacak; tiap item diulang sampai benar).
- Sub-level berikutnya terbuka setelah semua item ujian sub-level ini dibaca benar.

## Penilaian dan XP

- Bintang per item: benar di percobaan ke-1 → 3; ke-2 s.d. ke-4 → 2; ke-5 atau lebih → 1.
- Bintang sub-level = rata-rata bintang item, dibulatkan ke bawah. Ulang boleh; simpan yang terbaik.
- XP = 10 per bintang; XP hanya bertambah dari selisih saat bintang item membaik (anti-farming).
- Level user naik per ambang XP: level 2 = 100 XP, level 3 = 250 XP, level n = 25·(n−1)·(n+2).

## Data (Supabase)

- Konten: level, sub-level, item (teks Arab, latin, fonem target, kandidat, penjelasan, path audio) — diisi script.
- Audio contoh: Supabase Storage, direkam sendiri (~200 klip). Item tanpa audio menampilkan "audio belum tersedia".
- User: profil (username unik, XP), progres item (bintang terbaik), progres sub-level, riwayat percobaan
  (item, benar/salah, kandidat terdengar, skor, transkrip, nomor percobaan, waktu). Tanpa rekaman suara.

## Tampilan

- Beranda setelah login: **daftar kartu** per sub-level (huruf, bintang, progres, gembok), header username + level + XP.
- Layar latihan: huruf besar, tombol dengar, tombol mic; notifikasi benar (bintang, +XP) / salah (yang terdengar,
  penjelasan, dengar yang benar, coba lagi).
- Mockup: `.superpowers/brainstorm/` (layout-beranda-latihan.html).

## Diserahkan ke builder

Pembagian huruf per sub-level, transliterasi latin, teks penjelasan, ambang skor awal, warna/gaya visual,
struktur tabel persis, dan cara penyajian file wasm/model.
