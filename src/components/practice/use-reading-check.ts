"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Candidate } from "@/lib/content/curriculum";
import type { RecognitionResult } from "@/lib/recognition/engine";
import { useRecognizer } from "@/lib/recognition/use-recognizer";
import { useRecorder } from "@/lib/recognition/use-recorder";

/** Longest recording; a single syllable or letter name takes well under this. */
const MAX_RECORD_MS = 3500;

export type MicPhase = "idle" | "recording" | "checking";

/** Record → recognize, for one target reading at a time. */
export function useReadingCheck() {
  const recognizer = useRecognizer();
  const recorder = useRecorder();
  const [phase, setPhase] = useState<MicPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<{ target: Candidate; others: Candidate[]; resolve: (r: RecognitionResult | null) => void } | null>(null);
  const { load } = recognizer;

  useEffect(() => {
    load();
  }, [load]);

  const finish = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const job = pending.current;
    pending.current = null;
    if (!job) return;
    setPhase("checking");
    try {
      const pcm = await recorder.stop();
      const result = await recognizer.recognize(pcm, job.target, job.others);
      job.resolve(result);
    } catch {
      setError("Bacaan gagal diperiksa. Coba lagi.");
      job.resolve(null);
    } finally {
      setPhase("idle");
    }
  }, [recorder, recognizer]);

  /** Starts recording; resolves with the verdict after the user stops (or the time limit). */
  const check = useCallback(
    (target: Candidate, others: Candidate[]) =>
      new Promise<RecognitionResult | null>((resolve) => {
        setError(null);
        recorder
          .start()
          .then(() => {
            pending.current = { target, others, resolve };
            setPhase("recording");
            timer.current = setTimeout(() => void finish(), MAX_RECORD_MS);
          })
          .catch(() => resolve(null));
      }),
    [recorder, finish],
  );

  return {
    model: { state: recognizer.state, progress: recognizer.progress, error: recognizer.error, retry: recognizer.load },
    phase,
    error: error ?? recorder.error,
    check,
    stop: finish,
  };
}
