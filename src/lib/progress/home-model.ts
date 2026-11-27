import { computeUnlocked } from "./unlock";

export interface LevelRecord {
  id: string;
  key: string;
  ord: number;
  title: string;
  description: string;
  coming_soon: boolean;
}
export interface SublevelRecord {
  id: string;
  level_id: string;
  key: string;
  ord: number;
  title: string;
}

export interface HomeInput {
  levels: LevelRecord[];
  sublevels: SublevelRecord[];
  items: { id: string; sublevel_id: string }[];
  itemProgress: { item_id: string; best_stars: number }[];
  sublevelProgress: { sublevel_id: string; best_stars: number }[];
  /** Test account: every available sub-level is open. */
  unlockAll?: boolean;
}

export interface HomeSublevel {
  id: string;
  key: string;
  title: string;
  stars: number;
  itemsDone: number;
  itemsTotal: number;
  locked: boolean;
  completed: boolean;
}

export interface HomeLevel {
  id: string;
  key: string;
  ord: number;
  title: string;
  description: string;
  comingSoon: boolean;
  completedCount: number;
  sublevels: HomeSublevel[];
}

/** Turn raw rows into the card list shown on /belajar. */
export function buildHomeModel(input: HomeInput): HomeLevel[] {
  const levels = [...input.levels].sort((a, b) => a.ord - b.ord);
  const levelOrd = new Map(levels.map((l) => [l.id, l.ord]));
  const comingSoon = new Map(levels.map((l) => [l.id, l.coming_soon]));
  const subs = [...input.sublevels].sort(
    (a, b) => (levelOrd.get(a.level_id) ?? 0) - (levelOrd.get(b.level_id) ?? 0) || a.ord - b.ord,
  );
  const done = new Set(input.itemProgress.map((p) => p.item_id));
  const subStars = new Map(input.sublevelProgress.map((p) => [p.sublevel_id, p.best_stars]));

  const totals = new Map<string, { total: number; done: number }>();
  for (const item of input.items) {
    const t = totals.get(item.sublevel_id) ?? { total: 0, done: 0 };
    t.total++;
    if (done.has(item.id)) t.done++;
    totals.set(item.sublevel_id, t);
  }

  const unlocked = computeUnlocked(
    subs.map((s) => ({ id: s.id, completed: subStars.has(s.id), levelComingSoon: Boolean(comingSoon.get(s.level_id)) })),
    input.unlockAll,
  );

  return levels.map((level) => {
    const sublevels = subs
      .filter((s) => s.level_id === level.id)
      .map((s) => ({
        id: s.id,
        key: s.key,
        title: s.title,
        stars: subStars.get(s.id) ?? 0,
        itemsDone: totals.get(s.id)?.done ?? 0,
        itemsTotal: totals.get(s.id)?.total ?? 0,
        locked: !unlocked.has(s.id),
        completed: subStars.has(s.id),
      }));
    return {
      id: level.id,
      key: level.key,
      ord: level.ord,
      title: level.title,
      description: level.description,
      comingSoon: level.coming_soon,
      completedCount: sublevels.filter((s) => s.completed).length,
      sublevels,
    };
  });
}
