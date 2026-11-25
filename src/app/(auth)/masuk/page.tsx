"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useActionState } from "react";
import { btn, field } from "@/components/ui";
import { signIn, type AuthState } from "../actions";
import { AuthCard } from "../auth-card";

function ConfirmNotice() {
  const failed = useSearchParams().get("konfirmasi") === "gagal";
  return failed ? (
    <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
      Tautan konfirmasi tidak valid atau sudah kedaluwarsa.
    </p>
  ) : null;
}

export default function MasukPage() {
  const [state, action, pending] = useActionState<AuthState, FormData>(signIn, {});
  return (
    <AuthCard title="Masuk" subtitle="Lanjutkan belajar dari terakhir kali.">
      <Suspense>
        <ConfirmNotice />
      </Suspense>
      <form action={action} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1 block font-semibold">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required defaultValue={state.values?.email} className={field} />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block font-semibold">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required className={field} />
        </div>
        {state.message && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{state.message}</p>}
        <button type="submit" disabled={pending} className={`${btn.primary} w-full`}>
          {pending ? "Masuk…" : "Masuk"}
        </button>
      </form>
      <p className="mt-6 text-center text-slate-500">
        Belum punya akun? <Link href="/daftar" className="font-bold text-brand-600">Daftar gratis</Link>
      </p>
    </AuthCard>
  );
}
