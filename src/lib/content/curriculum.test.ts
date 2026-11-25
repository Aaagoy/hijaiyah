import { describe, expect, it } from "vitest";
import { encodePhonemes } from "@tilawa/core";
import { LETTERS } from "./letters";
import { syllable } from "./phonemes";
import { buildCurriculum } from "./curriculum";

const letter = (char: string) => LETTERS.find((l) => l.char === char)!;

describe("syllable", () => {
  it("builds a fathah syllable", () => {
    expect(syllable(letter("ب"), "a", false)).toEqual({ arabic: "بَ", phonemes: "بَ", latin: "ba" });
  });
  it("builds a dhammatain syllable read as CV + nun", () => {
    expect(syllable(letter("ب"), "u", true)).toEqual({ arabic: "بٌ", phonemes: "بُن", latin: "bun" });
  });
  it("reads alif with a vowel as hamzah", () => {
    expect(syllable(letter("ا"), "a", false)).toEqual({ arabic: "أَ", phonemes: "ءَ", latin: "a" });
  });
});

describe("buildCurriculum", () => {
  const levels = buildCurriculum();
  const items = levels.flatMap((l) => l.sublevels.flatMap((s) => s.items));

  it("has 28 letters", () => expect(LETTERS).toHaveLength(28));

  it("has 11 levels, the last two coming soon and empty", () => {
    expect(levels).toHaveLength(11);
    expect(levels.slice(9).every((l) => l.comingSoon && l.sublevels.length === 0)).toBe(true);
    expect(levels.slice(0, 9).every((l) => !l.comingSoon)).toBe(true);
  });

  it("splits the letter level into 6 sublevels covering all 28 letters", () => {
    expect(levels[0].sublevels.map((s) => s.items.length)).toEqual([5, 5, 5, 5, 4, 4]);
  });

  it("gives mixed levels 4 sublevels of 7 items", () => {
    for (const mixed of [levels[4], levels[8]]) {
      expect(mixed.sublevels.map((s) => s.items.length)).toEqual([7, 7, 7, 7]);
    }
  });

  it("uses unique item keys", () => {
    expect(new Set(items.map((i) => i.key)).size).toBe(items.length);
  });

  it("only uses phonemes the model can tokenize", () => {
    for (const item of items) {
      expect(encodePhonemes(item.phonemes), item.key).not.toBeNull();
      for (const c of item.candidates) expect(encodePhonemes(c.phonemes), `${item.key}/${c.key}`).not.toBeNull();
    }
  });

  it("never lists the target as its own candidate", () => {
    for (const item of items) {
      expect(item.candidates.some((c) => c.phonemes === item.phonemes), item.key).toBe(false);
    }
  });

  it("gives fathah-ba the other vowels and its tanwin form as candidates", () => {
    const ba = items.find((i) => i.key === "fathah-ba")!;
    expect(ba.arabic).toBe("بَ");
    expect(ba.candidates.map((c) => c.latin)).toEqual(expect.arrayContaining(["bi", "bu", "ban"]));
    expect(ba.explanation.length).toBeGreaterThan(10);
  });
});
