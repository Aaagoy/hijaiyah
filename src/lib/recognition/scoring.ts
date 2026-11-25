import { encodePhonemes, forcedLogLik, freeLogLik, type FramePosteriors } from "@tilawa/core";
import type { Candidate } from "@/lib/content/curriculum";

export const SILENCE_KEY = "__silence__";

/**
 * Minimum per-token score (forced − free log-likelihood) for the target to be accepted.
 * 0 means the target fits as well as anything the model could decode; lower is worse.
 * Starting value — tune with real recordings.
 */
export const ACCEPT_SCORE = -3;

export type VerdictStatus = "correct" | "wrong" | "silent";

export interface Verdict {
  status: VerdictStatus;
  /** Candidate key that fit best (target key when correct, SILENCE_KEY when silent, null if unknown). */
  heardKey: string | null;
  targetScore: number;
  scores: Record<string, number>;
}

interface Fit {
  /** forced − free over the whole clip: comparable across candidates of any length (including silence). */
  total: number;
  /** total per token: how well each token fits, used for the acceptance threshold. */
  perToken: number;
}

function fit(post: FramePosteriors, frames: number, phonemes: string, free: number): Fit {
  const ids = phonemes ? encodePhonemes(phonemes) : [];
  if (!ids) return { total: -Infinity, perToken: -Infinity };
  const total = forcedLogLik(post, ids, 0, frames) - free;
  return { total, perToken: total / Math.max(1, ids.length) };
}

/**
 * Decide which candidate reading the audio matches best (forced CTC alignment).
 * Candidates are ranked on the whole-clip score so silence and longer readings compete fairly;
 * a winner whose tokens fit poorly (below ACCEPT_SCORE) is never named as what the user said.
 */
export function scoreCandidates(post: FramePosteriors, frames: number, target: Candidate, others: Candidate[]): Verdict {
  const free = freeLogLik(post, 0, frames);
  const fits = new Map<string, Fit>([[SILENCE_KEY, fit(post, frames, "", free)]]);
  for (const c of [target, ...others]) fits.set(c.key, fit(post, frames, c.phonemes, free));
  const scores = Object.fromEntries([...fits].map(([k, v]) => [k, v.perToken]));
  const targetScore = fits.get(target.key)!.perToken;

  let bestKey = SILENCE_KEY;
  for (const [key, value] of fits) {
    if (value.total > fits.get(bestKey)!.total) bestKey = key;
  }

  if (bestKey === SILENCE_KEY) return { status: "silent", heardKey: SILENCE_KEY, targetScore, scores };
  if (fits.get(bestKey)!.perToken < ACCEPT_SCORE) return { status: "wrong", heardKey: null, targetScore, scores };
  if (bestKey === target.key) return { status: "correct", heardKey: target.key, targetScore, scores };
  return { status: "wrong", heardKey: bestKey, targetScore, scores };
}
