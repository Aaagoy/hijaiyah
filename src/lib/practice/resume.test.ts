import { describe, expect, it } from "vitest";
import { examItemIds, summarizeSaves } from "./resume";

describe("examItemIds", () => {
  const items = ["a", "b", "c", "d", "e"];
  it("continues an unfinished exam with the items not read correctly yet", () => {
    expect(examItemIds(items, new Set(["a", "c"]), false)).toEqual(["b", "d", "e"]);
  });
  it("starts with every item when nothing is done", () => {
    expect(examItemIds(items, new Set(), false)).toEqual(items);
  });
  it("replays every item of a completed sublevel", () => {
    expect(examItemIds(items, new Set(items), true)).toEqual(items);
  });
  it("replays every item when all are done but the sublevel is not marked complete", () => {
    expect(examItemIds(items, new Set(items), false)).toEqual(items);
  });
});

describe("summarizeSaves", () => {
  it("adds up XP and takes the sublevel result from the save that completed it", () => {
    expect(
      summarizeSaves([
        { ok: true, xpGained: 30, totalXp: 30, sublevelCompleted: false, sublevelStars: null },
        { ok: true, xpGained: 20, totalXp: 50, sublevelCompleted: true, sublevelStars: 2 },
      ]),
    ).toEqual({ ok: true, xpGained: 50, totalXp: 50, sublevelCompleted: true, sublevelStars: 2 });
  });
  it("fails when any save failed", () => {
    expect(summarizeSaves([{ ok: true, xpGained: 30, totalXp: 30, sublevelCompleted: false, sublevelStars: null }, { ok: false }]).ok).toBe(false);
  });
});
