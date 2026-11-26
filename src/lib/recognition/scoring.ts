import { BLANK_ID, encodePhonemes, forcedLogLik, freeLogLik, type FramePosteriors } from "@tilawa/core";
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
  /** Whole-clip score used to rank candidates (comparable across lengths, including silence). */
  total: number;
  /** How well each token of the reading fits, ignoring extra sounds around it: the acceptance test. */
  perToken: number;
}

/**
 * Cost of one extra sound frame (outside the reading) when ranking candidates. Without it a
 * candidate that is part of a longer one (بَ inside بَن) would tie and an added tanwin would be missed.
 */
const EXTRA_SOUND_PENALTY = 1;

/**
 * Best CTC path that emits exactly `ids` somewhere in [from, to), with any frames before and
 * after it explained freely by their best token ("extra sounds": breath, room noise, a hesitation).
 * Every extra frame whose best token is not blank costs `penalty`.
 */
export function spottedLogLik(post: FramePosteriors, ids: readonly number[], from: number, to: number, penalty: number): number {
  const L = ids.length;
  const S = 2 * L + 1;
  if (L === 0 || to - from < L) return L === 0 ? forcedLogLik(post, ids, from, to) : -Infinity;
  const ext = new Int32Array(S);
  for (let s = 0; s < S; s++) ext[s] = s % 2 === 1 ? ids[(s - 1) >> 1] : BLANK_ID;
  const extra = (t: number) => post.bestLogp(t) - (post.argmax(t) === BLANK_ID ? 0 : penalty);

  let before = extra(from);
  let after = -Infinity;
  let prev = new Float64Array(S).fill(-Infinity);
  let next = new Float64Array(S);
  prev[0] = post.logp(from, ext[0]);
  prev[1] = post.logp(from, ext[1]);
  for (let t = from + 1; t < to; t++) {
    const done = Math.max(prev[S - 1], prev[S - 2]);
    for (let s = 0; s < S; s++) {
      let m = prev[s];
      if (s >= 1 && prev[s - 1] > m) m = prev[s - 1];
      if (s >= 2 && ext[s] !== BLANK_ID && ext[s] !== ext[s - 2] && prev[s - 2] > m) m = prev[s - 2];
      if (s <= 1 && before > m) m = before;
      next[s] = m === -Infinity ? -Infinity : m + post.logp(t, ext[s]);
    }
    after = Math.max(after, done) + extra(t);
    before += extra(t);
    [prev, next] = [next, prev];
  }
  return Math.max(after, prev[S - 1], prev[S - 2]);
}

function fit(post: FramePosteriors, frames: number, phonemes: string, free: number): Fit {
  if (!phonemes) {
    const total = forcedLogLik(post, [], 0, frames) - free;
    return { total, perToken: total };
  }
  const ids = encodePhonemes(phonemes);
  if (!ids) return { total: -Infinity, perToken: -Infinity };
  const total = spottedLogLik(post, ids, 0, frames, EXTRA_SOUND_PENALTY) - free;
  const perToken = (spottedLogLik(post, ids, 0, frames, 0) - free) / ids.length;
  return { total, perToken };
}

/**
 * Decide which candidate reading the audio matches best (forced CTC alignment).
 * Candidates are ranked on the whole-clip score so silence and longer readings compete fairly;
 * a winner whose tokens fit poorly (below ACCEPT_SCORE) is never named as what the user said.
 */
export interface ScoreOptions {
  /**
   * The audio itself contains speech (energy-based detection). CTC output is mostly blank even
   * for real speech, so the model-side "silence" reading is too cheap to trust then: it is excluded.
   */
  speechDetected?: boolean;
}

export function scoreCandidates(
  post: FramePosteriors,
  frames: number,
  target: Candidate,
  others: Candidate[],
  options: ScoreOptions = {},
): Verdict {
  const free = freeLogLik(post, 0, frames);
  const fits = new Map<string, Fit>([[SILENCE_KEY, fit(post, frames, "", free)]]);
  for (const c of [target, ...others]) fits.set(c.key, fit(post, frames, c.phonemes, free));
  const scores = Object.fromEntries([...fits].map(([k, v]) => [k, v.perToken]));
  const targetScore = fits.get(target.key)!.perToken;

  let bestKey = options.speechDetected ? target.key : SILENCE_KEY;
  for (const [key, value] of fits) {
    if (options.speechDetected && key === SILENCE_KEY) continue;
    if (value.total > fits.get(bestKey)!.total) bestKey = key;
  }

  if (bestKey === SILENCE_KEY) return { status: "silent", heardKey: SILENCE_KEY, targetScore, scores };
  if (fits.get(bestKey)!.perToken < ACCEPT_SCORE) return { status: "wrong", heardKey: null, targetScore, scores };
  if (bestKey === target.key) return { status: "correct", heardKey: target.key, targetScore, scores };
  return { status: "wrong", heardKey: bestKey, targetScore, scores };
}
