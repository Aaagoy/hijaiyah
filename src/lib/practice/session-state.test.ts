import { describe, expect, it } from "vitest";
import { initialExam, examReducer, type ExamState } from "./session-state";

const run = (state: ExamState, ...actions: Parameters<typeof examReducer>[1][]) => actions.reduce(examReducer, state);
const correct = { type: "verdict", status: "correct", heardKey: "t" } as const;
const wrong = { type: "verdict", status: "wrong", heardKey: "x" } as const;
const silent = { type: "verdict", status: "silent", heardKey: "__silence__" } as const;
const next = { type: "continue" } as const;

describe("examReducer", () => {
  it("gives 3 stars for a first-try correct reading", () => {
    const s = run(initialExam(["a", "b"]), correct);
    expect(s.itemStars).toEqual({ a: 3 });
    expect(s.phase).toBe("feedback");
  });

  it("gives 2 stars after two wrong readings", () => {
    const s = run(initialExam(["a"]), wrong, next, wrong, next, correct);
    expect(s.itemStars).toEqual({ a: 2 });
  });

  it("gives 1 star from the fifth attempt", () => {
    const s = run(initialExam(["a"]), wrong, next, wrong, next, wrong, next, wrong, next, correct);
    expect(s.itemStars).toEqual({ a: 1 });
  });

  it("does not count silence as an attempt", () => {
    const s = run(initialExam(["a"]), silent, next, silent, next, correct);
    expect(s.itemStars).toEqual({ a: 3 });
  });

  it("retries the same item after a wrong reading", () => {
    const s = run(initialExam(["a", "b"]), wrong, next);
    expect(s.index).toBe(0);
    expect(s.phase).toBe("answering");
    expect(s.attempts.a).toBe(1);
  });

  it("moves to the next item after a correct reading", () => {
    const s = run(initialExam(["a", "b"]), correct, next);
    expect(s.index).toBe(1);
    expect(s.phase).toBe("answering");
  });

  it("finishes after the last item is read correctly", () => {
    const s = run(initialExam(["a", "b"]), correct, next, wrong, next, correct, next);
    expect(s.finished).toBe(true);
    expect(s.itemStars).toEqual({ a: 3, b: 2 });
  });

  it("reports the attempt number for logging", () => {
    const s = run(initialExam(["a"]), wrong, next);
    expect(s.attempts.a + 1).toBe(2);
  });
});
