import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
import { SublevelCard } from "@/components/sublevel-card";
import { loadHome, requireProfile } from "@/lib/progress/queries";

export const metadata: Metadata = { title: "Belajar — Hijaiyah" };

export default async function BelajarPage() {
  const [profile, levels] = await Promise.all([requireProfile(), loadHome()]);
  const current = levels.flatMap((l) => l.sublevels).find((s) => !s.locked && !s.completed);

  return (
    <>
      <AppHeader profile={profile} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:py-8">
        <h1 className="text-2xl font-extrabold sm:text-3xl">Assalamu&apos;alaikum, {profile.username}!</h1>
        <p className="mt-1 text-slate-500">
          {current ? "Lanjutkan dari bagian yang ditandai kuning." : "Semua bagian yang tersedia sudah selesai. Hebat!"}
        </p>

        {levels.length === 0 && (
          <p className="mt-8 rounded-2xl bg-amber-50 p-4 text-amber-800">
            Materi belum tersedia. Jalankan <code>npm run seed</code> untuk mengisi konten.
          </p>
        )}

        <div className="mt-6 space-y-8">
          {levels.map((level) => (
            <section key={level.id} aria-labelledby={`level-${level.key}`}>
              <div
                className={`flex flex-wrap items-baseline justify-between gap-2 rounded-2xl px-4 py-3 text-white ${
                  level.comingSoon ? "bg-slate-400" : "bg-brand-500"
                }`}
              >
                <h2 id={`level-${level.key}`} className="text-lg font-extrabold">
                  Level {level.ord} · {level.title}
                </h2>
                <span className="text-sm font-semibold opacity-90">
                  {level.comingSoon ? "Segera hadir" : `${level.completedCount}/${level.sublevels.length} bagian`}
                </span>
              </div>
              <p className="mt-2 px-1 text-sm text-slate-500">{level.description}</p>
              {level.sublevels.length > 0 && (
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {level.sublevels.map((sub, i) => (
                    <SublevelCard key={sub.id} sub={sub} index={i} current={sub.id === current?.id} />
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      </main>
    </>
  );
}
