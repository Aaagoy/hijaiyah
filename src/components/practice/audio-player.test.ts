import { describe, expect, it } from "vitest";
import { audioFor } from "./audio-player";

class FakeAudio {
  constructor(public src: string) {}
}

describe("audioFor", () => {
  it("reuses the player for the same url", () => {
    const a = audioFor(null, "/a.mp3", (u) => new FakeAudio(u));
    expect(audioFor(a, "/a.mp3", (u) => new FakeAudio(u))).toBe(a);
  });
  it("creates a new player when the item (url) changes", () => {
    const a = audioFor(null, "/a.mp3", (u) => new FakeAudio(u));
    const b = audioFor(a, "/b.mp3", (u) => new FakeAudio(u));
    expect(b).not.toBe(a);
    expect(b.src).toBe("/b.mp3");
  });
});
