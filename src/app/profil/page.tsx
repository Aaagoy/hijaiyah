import type { Metadata } from "next";
import Link from "next/link";
import { signOut } from "@/app/(auth)/actions";
import { AppHeader } from "@/components/app-header";
import { btn } from "@/components/ui";
import { levelForXp } from "@/lib/game/progression";
import { loadHome, requireProfile } from "@/lib/progress/queries";

export const metadata: Metadata = { title: "Profil — Hijaiyah" };

export default async function ProfilPage() {
  const [profile, levels] = await Promise.all([requireProfile(), loadHome()]);
  const { level, next } = levelForXp(profile.xp);
  const subs = levels.flatMap((l) => l.sublevels);
  const done = subs.filter((s) => s.completed);
  const stars = done.reduce((n, s) => n + s.stars, 0);

  const stats = [
    { label: "Level", value: level },
    { label: "Total XP", value: profile.xp },
    { label: "Bagian selesai", value: `${done.length}/${subs.length}` },
    { label: "Bintang", value: `${stars}/${subs.length * 3}` },
  ];

  return (
    <>
      <AppHeader profile={profile} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-3xl">👤</span>
          <div>
            <h1 className="text-2xl font-extrabold">{profile.username}</h1>
            <p className="text-slate-500">{next - profile.xp} XP lagi menuju level {level + 1}</p>
          </div>
        </div>
        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border-2 border-slate-200 bg-white p-4">
              <dt className="text-sm font-bold text-slate-500">{s.label}</dt>
              <dd className="text-2xl font-extrabold">{s.value}</dd>
            </div>
          ))}
        </dl>
        <h2 className="mt-8 text-lg font-extrabold">Progres per level</h2>
        <ul className="mt-3 space-y-2">
          {levels.filter((l) => !l.comingSoon).map((l) => (
            <li key={l.id} className="flex items-center justify-between rounded-xl border-2 border-slate-200 bg-white px-4 py-3">
              <span className="font-semibold">{l.title}</span>
              <span className="text-sm font-bold text-slate-500">{l.completedCount}/{l.sublevels.length}</span>
            </li>
          ))}
        </ul>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/belajar" className={btn.primary}>Lanjut belajar</Link>
          <form action={signOut}>
            <button type="submit" className={btn.secondary}>Keluar</button>
          </form>
        </div>
      </main>
    </>
  );
}
