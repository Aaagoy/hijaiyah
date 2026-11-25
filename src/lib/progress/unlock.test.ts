import { describe, expect, it } from "vitest";
import { computeUnlocked, type SublevelState } from "./unlock";

const s = (id: string, completed = false, levelComingSoon = false): SublevelState => ({ id, completed, levelComingSoon });

describe("computeUnlocked", () => {
  it("unlocks only the first sublevel for a new user", () => {
    expect([...computeUnlocked([s("a"), s("b"), s("c")])]).toEqual(["a"]);
  });

  it("unlocks the next sublevel once the previous one is completed", () => {
    expect([...computeUnlocked([s("a", true), s("b"), s("c")])]).toEqual(["a", "b"]);
  });

  it("keeps completed sublevels open for replay", () => {
    expect([...computeUnlocked([s("a", true), s("b", true), s("c")])]).toEqual(["a", "b", "c"]);
  });

  it("does not unlock past the first incomplete sublevel even if a later one is completed", () => {
    expect([...computeUnlocked([s("a"), s("b", true), s("c")])]).toEqual(["a"]);
  });

  it("never unlocks coming-soon sublevels", () => {
    expect([...computeUnlocked([s("a", true), s("x", false, true)])]).toEqual(["a"]);
  });
});
