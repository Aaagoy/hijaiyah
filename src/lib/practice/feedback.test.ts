import { describe, expect, it } from "vitest";
import { feedbackFor } from "./feedback";

const item = {
  latin: "ba",
  explanation: "Fathah dibaca a.",
  candidates: [{ key: "ba-i", phonemes: "بِ", latin: "bi" }],
};

describe("feedbackFor", () => {
  it("praises a correct reading", () => {
    expect(feedbackFor(item, { status: "correct", heardKey: "fathah-ba" }).tone).toBe("correct");
  });
  it("names the wrong reading that was heard and the right one", () => {
    const f = feedbackFor(item, { status: "wrong", heardKey: "ba-i" });
    expect(f.tone).toBe("wrong");
    expect(f.body).toContain("bi");
    expect(f.body).toContain("ba");
    expect(f.body).toContain("Fathah dibaca a.");
  });
  it("falls back to a general hint when the reading is unknown", () => {
    const f = feedbackFor(item, { status: "wrong", heardKey: null });
    expect(f.body).toContain("ba");
    expect(f.body).not.toContain("undefined");
  });
  it("asks to speak louder on silence", () => {
    expect(feedbackFor(item, { status: "silent", heardKey: "__silence__" }).tone).toBe("silent");
  });
});
