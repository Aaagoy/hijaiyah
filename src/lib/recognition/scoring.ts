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

function score(post: FramePosteriors, frames: number, phonemes: string, free: number): number {
  const ids = phonemes ? encodePhonemes(phonemes) : [];
  if (!ids) return -Infinity;
  return (forcedLogLik(post, ids, 0, frames) - free) / Math.max(1, ids.length);
}

/** Decide which candidate reading the audio matches best (forced CTC alignment). */
export function scoreCandidates(post: FramePosteriors, frames: number, target: Candidate, others: Candidate[]): Verdict {
  const free = freeLogLik(post, 0, frames);
  const scores: Record<string, number> = { [SILENCE_KEY]: score(post, frames, "", free) };
  for (const c of [target, ...others]) scores[c.key] = score(post, frames, c.phonemes, free);

  const targetScore = scores[target.key];
  let bestKey = SILENCE_KEY;
  for (const [key, value] of Object.entries(scores)) {
    if (value > scores[bestKey]) bestKey = key;
  }

  if (bestKey === SILENCE_KEY) return { status: "silent", heardKey: SILENCE_KEY, targetScore, scores };
  if (bestKey === target.key) {
    return targetScore >= ACCEPT_SCORE
      ? { status: "correct", heardKey: target.key, targetScore, scores }
      : { status: "wrong", heardKey: null, targetScore, scores };
  }
  return { status: "wrong", heardKey: bestKey, targetScore, scores };
}
