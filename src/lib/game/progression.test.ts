import { describe, expect, it } from "vitest";
import { levelForXp, starsForAttempts, sublevelStars, xpDelta, xpThreshold } from "./progression";

describe("starsForAttempts", () => {
  it("gives 3 stars on the first attempt", () => expect(starsForAttempts(1)).toBe(3));
  it("gives 2 stars on attempts 2 to 4", () => {
    expect(starsForAttempts(2)).toBe(2);
    expect(starsForAttempts(4)).toBe(2);
  });
  it("gives 1 star from attempt 5 on", () => {
    expect(starsForAttempts(5)).toBe(1);
    expect(starsForAttempts(9)).toBe(1);
  });
});

describe("sublevelStars", () => {
  it("floors the mean of item stars", () => expect(sublevelStars([3, 2, 2])).toBe(2));
  it("keeps 3 when every item has 3", () => expect(sublevelStars([3, 3, 3])).toBe(3));
  it("is 0 for no items", () => expect(sublevelStars([])).toBe(0));
});

describe("xpDelta", () => {
  it("awards 10 XP per star on a first result", () => expect(xpDelta(0, 3)).toBe(30));
  it("awards only the improvement", () => expect(xpDelta(2, 3)).toBe(10));
  it("never goes negative when the new result is worse", () => expect(xpDelta(3, 1)).toBe(0));
});

describe("xpThreshold / levelForXp", () => {
  it("uses 25*(n-1)*(n+2)", () => {
    expect(xpThreshold(1)).toBe(0);
    expect(xpThreshold(2)).toBe(100);
    expect(xpThreshold(3)).toBe(250);
    expect(xpThreshold(4)).toBe(450);
  });
  it("starts at level 1", () => {
    expect(levelForXp(0).level).toBe(1);
    expect(levelForXp(99).level).toBe(1);
  });
  it("reaches level 2 at 100 XP with the next threshold", () => {
    expect(levelForXp(100)).toEqual({ level: 2, current: 100, next: 250 });
  });
});
