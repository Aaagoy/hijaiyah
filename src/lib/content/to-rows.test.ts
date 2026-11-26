import { describe, expect, it } from "vitest";
import { buildCurriculum } from "./curriculum";
import { AUDIO_EXTENSIONS, recordingKeys, toRows } from "./to-rows";

describe("toRows", () => {
  const levels = buildCurriculum();

  it("produces one row per level, sublevel and item", () => {
    const rows = toRows(levels, new Map());
    expect(rows.levels).toHaveLength(11);
    expect(rows.sublevels).toHaveLength(levels.reduce((n, l) => n + l.sublevels.length, 0));
    expect(rows.items).toHaveLength(levels.reduce((n, l) => n + l.sublevels.reduce((m, s) => m + s.items.length, 0), 0));
  });

  it("links children to parents by key", () => {
    const rows = toRows(levels, new Map());
    const levelKeys = new Set(rows.levels.map((l) => l.key));
    const subKeys = new Set(rows.sublevels.map((s) => s.key));
    expect(rows.sublevels.every((s) => levelKeys.has(s.level_key))).toBe(true);
    expect(rows.items.every((i) => subKeys.has(i.sublevel_key))).toBe(true);
  });

  it("sets an audio path only for items with a recording", () => {
    const rows = toRows(levels, new Map([["fathah-ba", "m4a"]]));
    expect(rows.items.find((i) => i.key === "fathah-ba")!.audio_path).toBe("items/fathah-ba.m4a");
    expect(rows.items.find((i) => i.key === "fathah-ta")!.audio_path).toBeNull();
  });

  it("lets an item without its own file reuse the recording of the same reading", () => {
    const rows = toRows(levels, new Map([["fathah-alif", "mp3"]]));
    expect(rows.items.find((i) => i.key === "campuran-harakat-alif")!.audio_path).toBe("items/fathah-alif.mp3");
  });

  it("prefers an item's own recording over a shared one", () => {
    const rows = toRows(levels, new Map([["fathah-alif", "mp3"], ["campuran-harakat-alif", "m4a"]]));
    expect(rows.items.find((i) => i.key === "campuran-harakat-alif")!.audio_path).toBe("items/campuran-harakat-alif.m4a");
  });

  it("asks for one recording per distinct reading", () => {
    const keys = recordingKeys(levels);
    expect(keys.size).toBe(196);
    expect(keys.has("fathah-alif")).toBe(true);
    expect(keys.has("campuran-harakat-alif")).toBe(false);
  });

  it("accepts common recording formats", () => {
    expect(AUDIO_EXTENSIONS).toEqual(expect.arrayContaining(["mp3", "m4a", "wav", "webm", "ogg"]));
  });
});
