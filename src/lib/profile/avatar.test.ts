import { describe, expect, it } from "vitest";
import { LETTERS } from "@/lib/content/letters";
import { MAX_INPUT_BYTES, checkImageFile, defaultLetterKey, resolveAvatar } from "./avatar";

const url = (path: string) => `https://cdn.test/avatars/${path}`;
const keys = new Set(LETTERS.map((l) => l.key));

describe("defaultLetterKey", () => {
  it("always gives the same valid letter for a username", () => {
    for (const name of ["tes123", "ahmad", "a_b_c", "zzzzzzzzzzzzzzzzzzzz"]) {
      expect(keys.has(defaultLetterKey(name))).toBe(true);
      expect(defaultLetterKey(name)).toBe(defaultLetterKey(name));
    }
  });

  it("spreads usernames over different letters", () => {
    const seen = new Set(["ahmad", "budi", "citra", "dina", "eko", "fajar"].map(defaultLetterKey));
    expect(seen.size).toBeGreaterThan(1);
  });
});

describe("resolveAvatar", () => {
  it("uses the default letter when nothing was chosen", () => {
    const a = resolveAvatar(null, "tes123", url);
    expect(a.kind).toBe("huruf");
    if (a.kind === "huruf") expect(a.letter.key).toBe(defaultLetterKey("tes123"));
  });

  it("uses the chosen letter", () => {
    const a = resolveAvatar("huruf:ba", "tes123", url);
    expect(a.kind === "huruf" && a.letter.char).toBe("ب");
  });

  it("gives a colour to every letter", () => {
    const a = resolveAvatar("huruf:ya", "tes123", url);
    expect(a.kind === "huruf" && a.color).toMatch(/^bg-/);
  });

  it("points a photo at its public url", () => {
    expect(resolveAvatar("foto:u1/1.webp", "tes123", url)).toEqual({ kind: "foto", url: "https://cdn.test/avatars/u1/1.webp" });
  });

  it("falls back to the default letter for an unknown value", () => {
    const a = resolveAvatar("huruf:xx", "tes123", url);
    expect(a.kind === "huruf" && a.letter.key).toBe(defaultLetterKey("tes123"));
  });
});

describe("checkImageFile", () => {
  it("accepts a normal photo", () => {
    expect(checkImageFile({ type: "image/png", size: 1024 * 1024 })).toBeUndefined();
  });

  it("rejects files that are not images", () => {
    expect(checkImageFile({ type: "text/plain", size: 10 })).toMatch(/gambar/);
  });

  it("rejects photos larger than 5 MB", () => {
    expect(MAX_INPUT_BYTES).toBe(5 * 1024 * 1024);
    expect(checkImageFile({ type: "image/jpeg", size: MAX_INPUT_BYTES + 1 })).toMatch(/5 MB/);
  });
});
