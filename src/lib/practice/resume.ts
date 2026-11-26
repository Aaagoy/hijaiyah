export type ItemSave =
  | { ok: true; xpGained: number; totalXp: number; sublevelCompleted: boolean; sublevelStars: number | null }
  | { ok: false };

/**
 * Items for the exam: an unfinished sub-level continues with the items not yet read correctly;
 * a completed (or fully done) sub-level replays everything.
 */
export function examItemIds(allIds: string[], doneIds: Set<string>, completed: boolean): string[] {
  if (completed) return allIds;
  const remaining = allIds.filter((id) => !doneIds.has(id));
  return remaining.length ? remaining : allIds;
}

/** Combine the per-item saves of one exam run into the result screen's numbers. */
export function summarizeSaves(saves: ItemSave[]): ItemSave {
  let xpGained = 0;
  let totalXp = 0;
  let sublevelCompleted = false;
  let sublevelStars: number | null = null;
  for (const s of saves) {
    if (!s.ok) return { ok: false };
    xpGained += s.xpGained;
    totalXp = Math.max(totalXp, s.totalXp);
    if (s.sublevelCompleted) {
      sublevelCompleted = true;
      sublevelStars = s.sublevelStars;
    }
  }
  return { ok: true, xpGained, totalXp, sublevelCompleted, sublevelStars };
}
