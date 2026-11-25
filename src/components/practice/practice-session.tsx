"use client";

import Link from "next/link";
import { useReducer, useRef, useState } from "react";
import { finishSublevel, recordAttempt, type FinishResult } from "@/app/belajar/actions";
import { Stars } from "@/components/sublevel-card";
import { btn } from "@/components/ui";
import type { Candidate } from "@/lib/content/curriculum";
import { starsForAttempts } from "@/lib/game/progression";
import { feedbackFor, type Feedback } from "@/lib/practice/feedback";
import { examReducer, initialExam } from "@/lib/practice/session-state";
import type { RecognitionResult } from "@/lib/recognition/engine";
import { FeedbackPanel, ListenButton, MicButton, ModelGate } from "./pieces";
import { useReadingCheck } from "./use-reading-check";

export interface PracticeItem {
  id: string;
  key: string;
  arabic: string;
  latin: string;
  phonemes: string;
  explanation: string;
  candidates: Candidate[];
  audioUrl: string | null;
}

interface Props {
  sublevel: { id: string; title: string; levelTitle: string; completed: boolean };
  items: PracticeItem[];
  nextHref: string | null;
}

type Mode = "menu" | "belajar" | "ujian";

const SAVE_ERROR = "Hasil belum tersimpan. Periksa koneksi internet lalu coba lagi.";

const targetOf = (item: PracticeItem): Candidate => ({ key: item.key, phonemes: item.phonemes, latin: item.latin });

function log(item: PracticeItem, mode: "belajar" | "ujian", attemptNo: number, r: RecognitionResult) {
  void recordAttempt({
    itemId: item.id,
    mode,
    attemptNo,
    status: r.status,
    heardKey: r.heardKey,
    score: r.targetScore,
    transcript: r.transcript,
  }).catch(() => {});
}

function shuffle<T>(list: T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function TopBar({ title, sub, progress, onClose }: { title: string; sub: string; progress?: number; onClose: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={onClose} aria-label="Tutup" className="rounded-full p-2 text-xl text-slate-500 hover:bg-slate-100">✕</button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-slate-500">{title}</p>
        {progress === undefined ? (
          <p dir="rtl" className="font-arabic truncate text-lg">{sub}</p>
        ) : (
          <div className="mt-1 h-3 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}

function BigLetter({ arabic, latin }: { arabic: string; latin?: string }) {
  return (
    <div className="py-4 text-center">
      <p dir="rtl" className="font-arabic text-[7rem] leading-[1.3] text-slate-900 sm:text-[9rem]">{arabic}</p>
      {latin && <p className="text-lg font-bold text-slate-500">{latin}</p>}
    </div>
  );
}

export function PracticeSession({ sublevel, items, nextHref }: Props) {
  const [mode, setMode] = useState<Mode>("menu");
  const reading = useReadingCheck();
  const shell = "mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 px-4 py-4 sm:py-8";

  if (items.length === 0) {
    return (
      <main className={shell}>
        <p className="rounded-2xl bg-amber-50 p-4 text-amber-800">Bagian ini belum punya soal.</p>
        <Link href="/belajar" className={btn.secondary}>Kembali</Link>
      </main>
    );
  }

  if (mode === "menu") {
    return (
      <main className={shell}>
        <TopBar title={sublevel.levelTitle} sub={sublevel.title} onClose={() => history.back()} />
        <div className="rounded-3xl border-2 border-slate-200 bg-white p-6 text-center">
          <p dir="rtl" className="font-arabic text-5xl leading-[1.6]">{sublevel.title}</p>
          <p className="mt-2 text-slate-500">{items.length} item · {sublevel.levelTitle}</p>
        </div>
        <button type="button" className={`${btn.secondary} flex-col gap-0`} onClick={() => setMode("belajar")}>
          <span>📖 Belajar dulu</span>
          <span className="text-sm font-normal text-slate-500">Dengar contoh dan coba baca, tanpa nilai</span>
        </button>
        <button type="button" className={btn.primary} onClick={() => setMode("ujian")}>
          🎯 {sublevel.completed ? "Ulangi ujian" : "Mulai ujian"}
        </button>
        <Link href="/belajar" className="text-center font-semibold text-slate-500 hover:text-slate-700">Kembali ke daftar</Link>
      </main>
    );
  }

  return (
    <main className={shell}>
      {mode === "belajar" ? (
        <LearnMode items={items} sublevel={sublevel} reading={reading} onExit={() => setMode("menu")} onExam={() => setMode("ujian")} />
      ) : (
        <ExamMode items={items} sublevel={sublevel} reading={reading} nextHref={nextHref} onExit={() => setMode("menu")} />
      )}
    </main>
  );
}

type Reading = ReturnType<typeof useReadingCheck>;

function LearnMode({ items, sublevel, reading, onExit, onExam }: { items: PracticeItem[]; sublevel: Props["sublevel"]; reading: Reading; onExit: () => void; onExam: () => void }) {
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const tries = useRef<Record<string, number>>({});
  const item = items[index];
  const busy = reading.phase !== "idle";
  const go = (to: number) => {
    setIndex(to);
    setFeedback(null);
  };

  const tryReading = async () => {
    setFeedback(null);
    const result = await reading.check(targetOf(item), item.candidates);
    if (!result) return;
    tries.current[item.id] = (tries.current[item.id] ?? 0) + 1;
    log(item, "belajar", tries.current[item.id], result);
    setFeedback(feedbackFor(item, result));
  };

  return (
    <>
      <TopBar title={`Belajar · ${index + 1}/${items.length}`} sub={sublevel.title} onClose={onExit} />
      <div className="rounded-3xl border-2 border-slate-200 bg-white p-5">
        <BigLetter arabic={item.arabic} latin={item.latin} />
        <p className="text-center text-slate-600">{item.explanation}</p>
        <div className="mt-4">
          <ListenButton url={item.audioUrl} />
        </div>
      </div>
      <ModelGate {...reading.model}>
        <MicButton phase={reading.phase} onStart={tryReading} onStop={reading.stop} />
      </ModelGate>
      {reading.error && <p className="text-center text-sm text-red-600">{reading.error}</p>}
      {feedback && <FeedbackPanel feedback={feedback} />}
      <div className="mt-auto grid grid-cols-2 gap-3">
        <button type="button" className={btn.secondary} disabled={index === 0 || busy} onClick={() => go(index - 1)}>← Sebelumnya</button>
        {index < items.length - 1 ? (
          <button type="button" className={btn.secondary} disabled={busy} onClick={() => go(index + 1)}>Berikutnya →</button>
        ) : (
          <button type="button" className={btn.primary} disabled={busy} onClick={onExam}>Mulai ujian</button>
        )}
      </div>
    </>
  );
}

function ExamMode({ items, sublevel, reading, nextHref, onExit }: { items: PracticeItem[]; sublevel: Props["sublevel"]; reading: Reading; nextHref: string | null; onExit: () => void }) {
  const byId = new Map(items.map((i) => [i.id, i]));
  const [state, dispatch] = useReducer(examReducer, items, (list) => initialExam(shuffle(list.map((i) => i.id))));
  const [result, setResult] = useState<Extract<FinishResult, { ok: true }> | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const saving = useRef(false);

  const save = async (itemStars: Record<string, number>) => {
    if (saving.current) return;
    saving.current = true;
    setSaveError(null);
    try {
      const saved = await finishSublevel(sublevel.id, itemStars);
      if (saved.ok) setResult(saved);
      else setSaveError(SAVE_ERROR);
    } catch {
      setSaveError(SAVE_ERROR);
    } finally {
      saving.current = false;
    }
  };

  const onContinue = () => {
    const next = examReducer(state, { type: "continue" });
    dispatch({ type: "continue" });
    if (next.finished) void save(next.itemStars);
  };

  if (state.finished) {
    const total = Object.values(state.itemStars);
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
        <p className="text-6xl">🎉</p>
        <h1 className="text-3xl font-extrabold">Bagian selesai!</h1>
        {result ? (
          <>
            <Stars count={result.sublevelStars} className="text-4xl" />
            <p className="text-lg font-bold text-brand-600">+{result.xpGained} XP</p>
            {result.xpGained === 0 && <p className="text-sm text-slate-500">XP hanya bertambah kalau bintangmu lebih baik dari sebelumnya.</p>}
          </>
        ) : saveError ? (
          <div className="rounded-2xl bg-red-50 p-4 text-red-700">
            <p>{saveError}</p>
            <button type="button" className={`${btn.primary} mt-3`} onClick={() => void save(state.itemStars)}>Simpan lagi</button>
          </div>
        ) : (
          <p className="text-slate-500">Menyimpan hasil… ({total.length} item)</p>
        )}
        <div className="grid w-full gap-3">
          {nextHref && result && <Link href={nextHref} className={btn.primary}>Lanjut ke bagian berikutnya</Link>}
          <Link href="/belajar" className={btn.secondary}>Kembali ke daftar</Link>
          <button type="button" className="font-semibold text-slate-500" onClick={onExit}>Ulangi bagian ini</button>
        </div>
      </div>
    );
  }

  const item = byId.get(state.order[state.index])!;
  const attemptsSoFar = state.attempts[item.id] ?? 0;
  const feedback = state.phase === "feedback" && state.last ? feedbackFor(item, state.last) : null;
  const doneCount = Object.keys(state.itemStars).length;

  const answer = async () => {
    const r = await reading.check(targetOf(item), item.candidates);
    if (!r) return;
    log(item, "ujian", attemptsSoFar + (r.status === "silent" ? 0 : 1), r);
    dispatch({ type: "verdict", status: r.status, heardKey: r.heardKey });
  };

  return (
    <>
      <TopBar title={`Ujian · ${sublevel.title}`} sub="" progress={(doneCount / items.length) * 100} onClose={onExit} />
      <div className="rounded-3xl border-2 border-slate-200 bg-white p-5">
        <p className="text-center text-sm font-bold text-slate-500">Baca huruf ini</p>
        <BigLetter arabic={item.arabic} />
        {attemptsSoFar > 0 && <p className="text-center text-sm text-slate-500">Percobaan ke-{attemptsSoFar + (feedback ? 0 : 1)}</p>}
      </div>

      {feedback ? (
        <>
          <FeedbackPanel
            feedback={feedback}
            extra={state.last?.status === "correct" ? <Stars count={starsForAttempts(attemptsSoFar)} className="ml-1 text-base" /> : null}
          />
          {state.last?.status === "wrong" && <ListenButton url={item.audioUrl} label="Dengar bacaan yang benar" />}
          <button type="button" className={state.last?.status === "correct" ? btn.primary : btn.danger} onClick={onContinue}>
            {state.last?.status === "correct" ? "Lanjut" : "🎤 Coba lagi"}
          </button>
        </>
      ) : (
        <ModelGate {...reading.model}>
          <MicButton phase={reading.phase} onStart={answer} onStop={reading.stop} />
        </ModelGate>
      )}
      {reading.error && <p className="text-center text-sm text-red-600">{reading.error}</p>}
    </>
  );
}
