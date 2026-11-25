"use client";

import Link from "next/link";
import { useActionState } from "react";
import { btn, field } from "@/components/ui";
import { signUp, type AuthState } from "../actions";
import { AuthCard, FieldError } from "../auth-card";

export default function DaftarPage() {
  const [state, action, pending] = useActionState<AuthState, FormData>(signUp, {});
  return (
    <AuthCard title="Buat akun" subtitle="Gratis. Progres belajarmu tersimpan di akun ini.">
      {state.success ? (
        <p className="rounded-xl bg-brand-50 p-4 text-brand-700">{state.success}</p>
      ) : (
        <form action={action} className="space-y-4" noValidate>
          <div>
            <label htmlFor="username" className="mb-1 block font-semibold">Username</label>
            <input id="username" name="username" autoComplete="username" autoCapitalize="none" required defaultValue={state.values?.username} className={field} placeholder="contoh: ahmad_23" />
            <FieldError message={state.errors?.username} />
          </div>
          <div>
            <label htmlFor="email" className="mb-1 block font-semibold">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" required defaultValue={state.values?.email} className={field} />
            <FieldError message={state.errors?.email} />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block font-semibold">Password</label>
            <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} className={field} />
            <FieldError message={state.errors?.password} />
          </div>
          {state.message && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{state.message}</p>}
          <button type="submit" disabled={pending} className={`${btn.primary} w-full`}>
            {pending ? "Mendaftarkan…" : "Daftar"}
          </button>
        </form>
      )}
      <p className="mt-6 text-center text-slate-500">
        Sudah punya akun? <Link href="/masuk" className="font-bold text-brand-600">Masuk</Link>
      </p>
    </AuthCard>
  );
}
