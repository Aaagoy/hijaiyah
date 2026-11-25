"use client";

import Link from "next/link";
import { btn } from "@/components/ui";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-5xl">😕</p>
      <h1 className="text-2xl font-extrabold">Ada yang tidak beres</h1>
      <p className="max-w-md text-slate-600">
        Halaman ini gagal dimuat. Periksa koneksi internet lalu coba lagi.
        {process.env.NODE_ENV === "development" && <span className="mt-2 block text-sm text-red-600">{error.message}</span>}
      </p>
      <div className="flex gap-3">
        <button type="button" onClick={reset} className={btn.primary}>Coba lagi</button>
        <Link href="/" className={btn.secondary}>Ke beranda</Link>
      </div>
    </main>
  );
}
