"use client";

import { useSyncExternalStore } from "react";
import type { Candidate } from "@/lib/content/curriculum";
import type { RecognitionResult } from "./engine";
import type { WorkerRequest, WorkerResponse } from "./worker-protocol";

export type RecognizerState = "idle" | "loading" | "ready" | "error";

interface Snapshot {
  state: RecognizerState;
  progress: number;
  error: string | null;
}

/** One worker per tab, shared by every page, so the model is loaded once. */
class RecognizerClient {
  private worker: Worker | null = null;
  private snapshot: Snapshot = { state: "idle", progress: 0, error: null };
  private listeners = new Set<() => void>();
  private pending = new Map<number, { resolve: (r: RecognitionResult) => void; reject: (e: Error) => void }>();
  private nextId = 1;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.snapshot;

  private set(patch: Partial<Snapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach((l) => l());
  }

  load = () => {
    if (this.snapshot.state === "loading" || this.snapshot.state === "ready") return;
    if (!this.worker) {
      this.worker = new Worker(new URL("./recognizer.worker.ts", import.meta.url), { type: "module" });
      this.worker.onmessage = (e: MessageEvent<WorkerResponse>) => this.onMessage(e.data);
      this.worker.onerror = () => {
        // A crashed worker cannot be reused: drop it so "Coba lagi" starts a fresh one.
        this.worker?.terminate();
        this.worker = null;
        this.pending.forEach((p) => p.reject(new Error("worker crashed")));
        this.pending.clear();
        this.set({ state: "error", error: "Pengenal suara berhenti bekerja di browser ini." });
      };
    }
    this.set({ state: "loading", progress: 0, error: null });
    this.send({ type: "load" });
  };

  recognize = (pcm: Float32Array, target: Candidate, others: Candidate[]): Promise<RecognitionResult> => {
    if (this.snapshot.state !== "ready") return Promise.reject(new Error("Model belum siap."));
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.send({ type: "recognize", id, pcm, target, others });
    });
  };

  private send(msg: WorkerRequest) {
    this.worker?.postMessage(msg);
  }

  private onMessage(msg: WorkerResponse) {
    if (msg.type === "progress") this.set({ progress: msg.total ? msg.loaded / msg.total : 0 });
    else if (msg.type === "ready") this.set({ state: "ready", progress: 1 });
    else if (msg.type === "result") {
      this.pending.get(msg.id)?.resolve(msg.result);
      this.pending.delete(msg.id);
    } else if (msg.id !== undefined) {
      this.pending.get(msg.id)?.reject(new Error(msg.message));
      this.pending.delete(msg.id);
    } else {
      console.error("model load failed:", msg.message);
      this.set({ state: "error", error: "Periksa koneksi internet lalu coba lagi." });
    }
  }
}

let client: RecognizerClient | null = null;
const getClient = () => (client ??= new RecognizerClient());
const SERVER_SNAPSHOT: Snapshot = { state: "idle", progress: 0, error: null };

export function useRecognizer() {
  const c = getClient();
  const snap = useSyncExternalStore(c.subscribe, c.getSnapshot, () => SERVER_SNAPSHOT);
  return { ...snap, load: c.load, recognize: c.recognize };
}
