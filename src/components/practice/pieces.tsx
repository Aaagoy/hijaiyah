"use client";

import { useRef } from "react";
import { btn } from "@/components/ui";
import type { Feedback } from "@/lib/practice/feedback";
import { audioFor } from "./audio-player";
import type { MicPhase } from "./use-reading-check";

export function ListenButton({ url, label = "Dengar contoh" }: { url: string | null; label?: string }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  if (!url) return <p className="text-center text-sm text-slate-400">Audio contoh belum tersedia.</p>;
  return (
    <button
      type="button"
      className={`${btn.secondary} w-full`}
      onClick={() => {
        audio.current = audioFor(audio.current, url, (u) => new Audio(u));
        audio.current.currentTime = 0;
        void audio.current.play();
      }}
    >
      <span aria-hidden>🔊</span> {label}
    </button>
  );
}

export function MicButton({ phase, disabled, onStart, onStop }: { phase: MicPhase; disabled?: boolean; onStart: () => void; onStop: () => void }) {
  const recording = phase === "recording";
  const checking = phase === "checking" || phase === "starting";
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        disabled={disabled || checking}
        onClick={recording ? onStop : onStart}
        aria-label={recording ? "Selesai merekam" : "Mulai merekam bacaan"}
        className={`flex h-20 w-20 items-center justify-center rounded-full text-3xl text-white transition disabled:opacity-40 ${
          recording ? "animate-pulse bg-red-500 shadow-[0_0_0_8px_rgba(239,68,68,0.25)]" : "bg-brand-500 shadow-[0_5px_0_#15803d] active:translate-y-1 active:shadow-none"
        }`}
      >
        {checking ? <span className="h-7 w-7 animate-spin rounded-full border-4 border-white/40 border-t-white" /> : recording ? "■" : "🎤"}
      </button>
      <span className="text-sm font-semibold text-slate-500">
        {phase === "starting" ? "Menyiapkan mikrofon…" : checking ? "Memeriksa bacaan…" : recording ? "Membaca… tekan untuk selesai" : "Tekan lalu baca"}
      </span>
    </div>
  );
}

const TONE = {
  correct: "border-brand-500 bg-brand-50 text-brand-700",
  wrong: "border-red-400 bg-red-50 text-red-800",
  silent: "border-amber-400 bg-amber-50 text-amber-800",
};

export function FeedbackPanel({ feedback, extra }: { feedback: Feedback; extra?: React.ReactNode }) {
  const icon = feedback.tone === "correct" ? "✅" : feedback.tone === "wrong" ? "❌" : "🔇";
  return (
    <div role="status" className={`rounded-2xl border-2 p-4 ${TONE[feedback.tone]}`}>
      <p className="text-lg font-extrabold">
        {icon} {feedback.title} {extra}
      </p>
      <p className="mt-1">{feedback.body}</p>
    </div>
  );
}

export function ModelGate({
  state,
  progress,
  error,
  retry,
  children,
}: {
  state: string;
  progress: number;
  error: string | null;
  retry: () => void;
  children: React.ReactNode;
}) {
  if (state === "ready") return <>{children}</>;
  if (state === "error") {
    return (
      <div className="rounded-2xl border-2 border-red-300 bg-red-50 p-5 text-center text-red-800">
        <p className="font-bold">Pengenal suara gagal dimuat.</p>
        <p className="mt-1 text-sm">{error}</p>
        <button type="button" onClick={retry} className={`${btn.primary} mt-4`}>Coba lagi</button>
      </div>
    );
  }
  const pct = Math.round(progress * 100);
  return (
    <div className="rounded-2xl border-2 border-slate-200 bg-white p-5 text-center">
      <p className="font-bold">Menyiapkan pengenal suara…</p>
      <p className="mt-1 text-sm text-slate-500">
        Hanya sekali di awal (±66 MB). Setelah itu tersimpan di perangkatmu dan bisa dipakai lebih cepat.
      </p>
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-500">{pct}%</p>
    </div>
  );
}
