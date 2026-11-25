import { describe, expect, it } from "vitest";
import { BLANK_ID, FramePosteriors, VOCAB_SIZE, encodePhonemes } from "@tilawa/core";
import { ACCEPT_SCORE, SILENCE_KEY, scoreCandidates } from "./scoring";
import type { Candidate } from "@/lib/content/curriculum";

/** Posteriors where the given phoneme string clearly dominates, padded with blanks. */
function posteriorsFor(phonemes: string): { post: FramePosteriors; frames: number } {
  const ids = phonemes ? encodePhonemes(phonemes)! : [];
  const path = [BLANK_ID, BLANK_ID, BLANK_ID];
  for (const id of ids) path.push(id, id, id, BLANK_ID, BLANK_ID);
  path.push(BLANK_ID, BLANK_ID, BLANK_ID);
  const rows = new Float32Array(path.length * VOCAB_SIZE);
  const low = Math.log(0.1 / (VOCAB_SIZE - 1));
  path.forEach((id, t) => {
    for (let c = 0; c < VOCAB_SIZE; c++) rows[t * VOCAB_SIZE + c] = c === id ? Math.log(0.9) : low;
  });
  const post = new FramePosteriors(VOCAB_SIZE, 1000);
  post.push(rows, path.length, 0);
  return { post, frames: path.length };
}

const ba: Candidate = { key: "ba-a", phonemes: "بَ", latin: "ba" };
const others: Candidate[] = [
  { key: "ba-i", phonemes: "بِ", latin: "bi" },
  { key: "ba-u", phonemes: "بُ", latin: "bu" },
  { key: "ba-an", phonemes: "بَن", latin: "ban" },
];

describe("scoreCandidates", () => {
  it("accepts a reading that matches the target", () => {
    const { post, frames } = posteriorsFor("بَ");
    const v = scoreCandidates(post, frames, ba, others);
    expect(v.status).toBe("correct");
    expect(v.heardKey).toBe("ba-a");
    expect(v.targetScore).toBeGreaterThanOrEqual(ACCEPT_SCORE);
  });

  it("reports the wrong vowel that was heard", () => {
    const { post, frames } = posteriorsFor("بِ");
    const v = scoreCandidates(post, frames, ba, others);
    expect(v.status).toBe("wrong");
    expect(v.heardKey).toBe("ba-i");
  });

  it("detects a forgotten tanwin as the tanwin candidate when tanwin is the target", () => {
    const { post, frames } = posteriorsFor("بَ");
    const target: Candidate = { key: "ba-an", phonemes: "بَن", latin: "ban" };
    const v = scoreCandidates(post, frames, target, [ba]);
    expect(v.status).toBe("wrong");
    expect(v.heardKey).toBe("ba-a");
  });

  it("treats blank-only audio as silent", () => {
    const { post, frames } = posteriorsFor("");
    const v = scoreCandidates(post, frames, ba, others);
    expect(v.status).toBe("silent");
    expect(v.heardKey).toBe(SILENCE_KEY);
  });

  it("does not accept a reading that fits none of the candidates", () => {
    const { post, frames } = posteriorsFor("مُ");
    const v = scoreCandidates(post, frames, ba, others);
    expect(v.status).not.toBe("correct");
  });
});
