import Link from "next/link";
import type { HomeSublevel } from "@/lib/progress/home-model";

export function Stars({ count, className = "" }: { count: number; className?: string }) {
  return (
    <span className={`whitespace-nowrap ${className}`} aria-label={`${count} dari 3 bintang`}>
      {[1, 2, 3].map((n) => (
        <span key={n} className={n <= count ? "" : "opacity-25 grayscale"}>⭐</span>
      ))}
    </span>
  );
}

export function SublevelCard({ sub, index, current }: { sub: HomeSublevel; index: number; current: boolean }) {
  const pct = sub.itemsTotal ? Math.round((sub.itemsDone / sub.itemsTotal) * 100) : 0;
  const body = (
    <div
      className={`flex h-full flex-col gap-3 rounded-2xl border-2 bg-white p-4 transition ${
        sub.locked
          ? "border-slate-200 opacity-60"
          : current
            ? "border-amber-400 shadow-[0_4px_0_#fbbf24] hover:-translate-y-0.5"
            : "border-slate-200 shadow-[0_4px_0_#e2e8f0] hover:-translate-y-0.5"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-bold text-slate-500">Bagian {index + 1}</span>
        {sub.locked ? <span aria-label="Terkunci">🔒</span> : sub.completed ? <Stars count={sub.stars} className="text-sm" /> : null}
      </div>
      <p dir="rtl" className="font-arabic text-3xl text-slate-800">{sub.title}</p>
      <div className="mt-auto">
        <div className="flex justify-between text-xs font-semibold text-slate-500">
          <span>{sub.completed ? "Selesai" : current ? "Lanjutkan" : sub.locked ? "Terkunci" : "Siap"}</span>
          <span>{sub.itemsDone}/{sub.itemsTotal}</span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
  if (sub.locked) return <div aria-disabled>{body}</div>;
  return (
    <Link href={`/belajar/${sub.key}`} className="block h-full">
      {body}
    </Link>
  );
}
