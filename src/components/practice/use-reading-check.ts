"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Candidate } from "@/lib/content/curriculum";
import { createSingleFlight } from "@/lib/practice/single-flight";
import type { RecognitionResult } from "@/lib/recognition/engine";
import { useRecognizer } from "@/lib/recognition/use-recognizer";
import { useRecorder } from "@/lib/recognition/use-recorder";

/** Longest recording; a single syllable or letter name takes well under this. */
const MAX_RECORD_MS = 3500;

export type MicPhase = "idle" | "starting" | "recording" | "checking";

/** Record → recognize, one reading at a time. */
export function useReadingCheck() {
  const recognizer = useRecognizer();
  const recorder = useRecorder();
  const [phase, setPhase] = useState<MicPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const flight = useRef(createSingleFlight());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopRequested = useRef<(() => void) | null>(null);
  const { load } = recognizer;
  const { cancel } = recorder;

  useEffect(() => {
    load();
  }, [load]);

  // Leaving the page mid-recording must release the microphone.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      stopRequested.current = null;
      cancel();
    },
    [cancel],
  );

  /** Ends the current recording early (the result still resolves from check()). */
  const stop = useCallback(() => stopRequested.current?.(), []);

  /** Records until stop() or the time limit, then resolves with the verdict (null when it failed or was busy). */
  const check = useCallback(
    (target: Candidate, others: Candidate[]) =>
      flight.current
        .run(async (): Promise<RecognitionResult | null> => {
          setError(null);
          setPhase("starting");
          try {
            await recorder.start();
          } catch {
            return null;
          }
          setPhase("recording");
          await new Promise<void>((resolve) => {
            stopRequested.current = resolve;
            timer.current = setTimeout(resolve, MAX_RECORD_MS);
          });
          if (timer.current) clearTimeout(timer.current);
          timer.current = null;
          stopRequested.current = null;
          setPhase("checking");
          try {
            const pcm = await recorder.stop();
            return await recognizer.recognize(pcm, target, others);
          } catch {
            setError("Bacaan gagal diperiksa. Coba lagi.");
            return null;
          }
        })
        .finally(() => setPhase("idle")),
    [recorder, recognizer],
  );

  return {
    model: { state: recognizer.state, progress: recognizer.progress, error: recognizer.error, retry: recognizer.load },
    phase,
    error: error ?? recorder.error,
    check,
    stop,
  };
}
