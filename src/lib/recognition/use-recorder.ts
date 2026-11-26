"use client";

import { useCallback, useRef, useState } from "react";
import { TARGET_RATE, downmix, resampleLinear } from "./audio";

function micErrorMessage(err: unknown): string {
  const name = err instanceof DOMException ? err.name : "";
  if (name === "NotAllowedError" || name === "SecurityError")
    return "Izin mikrofon ditolak. Izinkan akses mikrofon di pengaturan browser, lalu coba lagi.";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "Mikrofon tidak ditemukan di perangkat ini.";
  if (name === "NotReadableError") return "Mikrofon sedang dipakai aplikasi lain.";
  return "Mikrofon tidak bisa digunakan.";
}

/** Records from the microphone and returns 16 kHz mono PCM. Audio never leaves the device. */
export function useRecorder() {
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  /** Stops any recording and releases the microphone without decoding. */
  const cancel = useCallback(() => {
    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    recorder?.stream.getTracks().forEach((t) => t.stop());
    setRecording(false);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    cancel();
    if (typeof window === "undefined" || !window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError("Mikrofon hanya bisa dipakai lewat koneksi aman (HTTPS).");
      throw new Error("insecure");
    }
    if (typeof MediaRecorder === "undefined") {
      setError("Browser ini belum mendukung perekaman suara. Coba perbarui browser.");
      throw new Error("unsupported");
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch (err) {
      setError(micErrorMessage(err));
      throw err;
    }
    const recorder = new MediaRecorder(stream);
    chunksRef.current = [];
    recorder.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
    recorder.start();
    recorderRef.current = recorder;
    setRecording(true);
  }, [cancel]);

  const stop = useCallback(async (): Promise<Float32Array> => {
    const recorder = recorderRef.current;
    if (!recorder) return new Float32Array(0);
    recorderRef.current = null;
    const stopped = new Promise<void>((resolve) => (recorder.onstop = () => resolve()));
    recorder.stop();
    await stopped;
    recorder.stream.getTracks().forEach((t) => t.stop());
    setRecording(false);
    const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
    // Stopped before any audio arrived: treat as silence.
    if (blob.size === 0) return new Float32Array(0);
    const ctx = new AudioContext();
    try {
      const audio = await ctx.decodeAudioData(await blob.arrayBuffer());
      const channels = Array.from({ length: audio.numberOfChannels }, (_, i) => audio.getChannelData(i));
      return resampleLinear(downmix(channels), audio.sampleRate, TARGET_RATE);
    } finally {
      void ctx.close();
    }
  }, []);

  return { recording, error, start, stop, cancel };
}
