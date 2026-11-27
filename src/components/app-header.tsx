import Link from "next/link";
import { signOut } from "@/app/(auth)/actions";
import { AvatarBadge } from "@/components/avatar-badge";
import { levelForXp } from "@/lib/game/progression";
import { avatarUrl, resolveAvatar } from "@/lib/profile/avatar";
import type { Profile } from "@/lib/progress/queries";

export function AppHeader({ profile }: { profile: Profile }) {
  const { level, current, next } = levelForXp(profile.xp);
  const pct = Math.round(((profile.xp - current) / (next - current)) * 100);
  return (
    <header className="sticky top-0 z-10 border-b-2 border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
        <Link href="/belajar" className="flex items-center gap-1.5 text-brand-600">
          <span className="font-arabic text-3xl leading-none">ب</span>
          <span className="hidden text-xl font-extrabold sm:inline">Hijaiyah</span>
        </Link>
        <div className="ml-auto flex min-w-0 items-center gap-3">
          <div className="w-32 sm:w-48">
            <div className="flex justify-between text-xs font-bold text-slate-500">
              <span>Lv {level}</span>
              <span>{profile.xp} XP</span>
            </div>
            <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-slate-200" aria-label={`${pct}% menuju level ${level + 1}`}>
              <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <Link
            href="/profil"
            className="flex items-center gap-2 rounded-full border-2 border-slate-200 py-1 pl-1 pr-3 font-bold text-slate-700 hover:bg-slate-50"
          >
            <AvatarBadge avatar={resolveAvatar(profile.avatar, profile.username, avatarUrl)} size="sm" label="" />
            <span className="max-w-24 truncate sm:max-w-40">{profile.username}</span>
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-full border-2 border-slate-200 px-3 py-1.5 text-sm font-bold text-slate-600 hover:bg-red-50 hover:text-red-700"
              aria-label="Keluar dari akun"
            >
              <span aria-hidden className="sm:hidden">⎋</span>
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
