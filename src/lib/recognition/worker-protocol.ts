import type { Candidate } from "@/lib/content/curriculum";
import type { RecognitionResult } from "./engine";

export type WorkerRequest =
  | { type: "load" }
  | { type: "recognize"; id: number; pcm: Float32Array; target: Candidate; others: Candidate[] };

export type WorkerResponse =
  | { type: "progress"; loaded: number; total: number }
  | { type: "ready" }
  | { type: "error"; message: string; id?: number }
  | { type: "result"; id: number; result: RecognitionResult };
