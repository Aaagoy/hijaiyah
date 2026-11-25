import { describe, expect, it } from "vitest";
import { buildHomeModel, type HomeInput } from "./home-model";

const input: HomeInput = {
  levels: [
    { id: "L1", key: "huruf", ord: 1, title: "Huruf", description: "d", coming_soon: false },
    { id: "L2", key: "fathah", ord: 2, title: "Fathah", description: "d", coming_soon: false },
    { id: "L9", key: "tajwid", ord: 10, title: "Tajwid", description: "d", coming_soon: true },
  ],
  sublevels: [
    { id: "S2", level_id: "L1", key: "huruf-2", ord: 2, title: "ج ح" },
    { id: "S1", level_id: "L1", key: "huruf-1", ord: 1, title: "ا ب" },
    { id: "S3", level_id: "L2", key: "fathah-1", ord: 1, title: "ا ب" },
  ],
  items: [
    { id: "i1", sublevel_id: "S1" },
    { id: "i2", sublevel_id: "S1" },
    { id: "i3", sublevel_id: "S2" },
    { id: "i4", sublevel_id: "S3" },
  ],
  itemProgress: [
    { item_id: "i1", best_stars: 3 },
    { item_id: "i2", best_stars: 2 },
  ],
  sublevelProgress: [{ sublevel_id: "S1", best_stars: 2 }],
};

describe("buildHomeModel", () => {
  const model = buildHomeModel(input);

  it("orders levels and sublevels", () => {
    expect(model.map((l) => l.key)).toEqual(["huruf", "fathah", "tajwid"]);
    expect(model[0].sublevels.map((s) => s.key)).toEqual(["huruf-1", "huruf-2"]);
  });

  it("marks completed sublevels with their best stars", () => {
    expect(model[0].sublevels[0]).toMatchObject({ completed: true, stars: 2, locked: false, itemsDone: 2, itemsTotal: 2 });
  });

  it("opens the next sublevel and locks the rest", () => {
    expect(model[0].sublevels[1]).toMatchObject({ completed: false, locked: false, itemsDone: 0, itemsTotal: 1 });
    expect(model[1].sublevels[0].locked).toBe(true);
  });

  it("flags coming-soon levels", () => {
    expect(model[2]).toMatchObject({ comingSoon: true, sublevels: [] });
  });

  it("reports totals for the header", () => {
    expect(model[0].completedCount).toBe(1);
  });
});
