import Link from "next/link";
import { btn } from "@/components/ui";
import { buildCurriculum } from "@/lib/content/curriculum";

const STEPS = [
  { icon: "🔊", title: "Dengar", text: "Dengarkan contoh bacaan setiap huruf dan harakat." },
  { icon: "🎤", title: "Baca", text: "Baca dengan suaramu sendiri lewat mikrofon." },
  { icon: "✅", title: "Cek langsung", text: "Langsung tahu benar atau salah, lengkap dengan cara baca yang benar." },
];

export default function Home() {
  const levels = buildCurriculum();
  return (
    <main className="flex-1">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <span className="flex items-center gap-1.5 text-brand-600">
          <span className="font-arabic text-3xl leading-none">ب</span>
          <span className="text-xl font-extrabold">Hijaiyah</span>
        </span>
        <Link href="/masuk" className="font-bold text-brand-600">Masuk</Link>
      </nav>

      <section className="mx-auto grid max-w-5xl items-center gap-8 px-4 py-10 md:grid-cols-2 md:py-16">
        <div>
          <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">Belajar membaca huruf hijaiyah, selangkah demi selangkah.</h1>
          <p className="mt-4 text-lg text-slate-600">
            Mulai dari mengenal huruf, harakat, sampai tanwin. Dengarkan contohnya, baca dengan suaramu, dan bacaanmu langsung
            diperiksa. Gratis.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/daftar" className={btn.primary}>Mulai belajar gratis</Link>
            <Link href="/masuk" className={btn.secondary}>Saya sudah punya akun</Link>
          </div>
          <p className="mt-4 text-sm text-slate-500">🔒 Suaramu diperiksa di perangkatmu sendiri dan tidak pernah dikirim atau disimpan.</p>
        </div>
        <div className="rounded-3xl border-2 border-slate-200 bg-white p-6 text-center shadow-[0_6px_0_#e2e8f0]">
          <p dir="rtl" className="font-arabic text-7xl leading-[1.5] text-slate-800">بَ بِ بُ</p>
          <p className="mt-2 font-bold text-slate-500">ba · bi · bu</p>
          <div className="mt-4 rounded-2xl border-2 border-brand-500 bg-brand-50 p-3 text-left text-brand-700">
            <p className="font-extrabold">✅ Benar! ⭐⭐⭐</p>
            <p className="text-sm">Kamu membaca &quot;ba&quot; dengan tepat. +30 XP</p>
          </div>
        </div>
      </section>

      <section className="bg-white py-12">
        <div className="mx-auto grid max-w-5xl gap-4 px-4 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.title} className="rounded-2xl border-2 border-slate-200 p-5">
              <p className="text-3xl">{s.icon}</p>
              <h2 className="mt-2 text-lg font-extrabold">{s.title}</h2>
              <p className="text-slate-600">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12">
        <h2 className="text-2xl font-extrabold">Materi</h2>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {levels.map((l) => (
            <li key={l.key} className={`rounded-2xl border-2 p-4 ${l.comingSoon ? "border-dashed border-slate-300 text-slate-400" : "border-slate-200 bg-white"}`}>
              <p className="text-sm font-bold text-slate-500">Level {l.order}{l.comingSoon && " · Segera hadir"}</p>
              <p className="font-extrabold">{l.title}</p>
              <p className="text-sm">{l.description}</p>
            </li>
          ))}
        </ol>
      </section>

      <footer className="border-t-2 border-slate-200 py-6 text-center text-sm text-slate-500">
        Hijaiyah · Proyek Tugas Akhir · Pengenal suara: model Tilawa (lisensi NPL-1.2, non-komersial)
      </footer>
    </main>
  );
}
