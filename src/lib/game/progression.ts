export type Stars = 1 | 2 | 3;

export const XP_PER_STAR = 10;

/** Stars for an item read correctly on the given attempt (1-based). */
export function starsForAttempts(attempts: number): Stars {
  if (attempts <= 1) return 3;
  if (attempts <= 4) return 2;
  return 1;
}

/** Sub-level stars: mean of the item stars, rounded down. 0 when there are no items. */
export function sublevelStars(itemStars: number[]): 0 | Stars {
  if (itemStars.length === 0) return 0;
  const mean = itemStars.reduce((sum, s) => sum + s, 0) / itemStars.length;
  return Math.floor(mean) as 0 | Stars;
}

/** XP earned when an item's best stars go from oldBest to newStars (improvement only). */
export function xpDelta(oldBest: number, newStars: number): number {
  return Math.max(0, newStars - oldBest) * XP_PER_STAR;
}

/** Total XP needed to reach a user level: 25·(n−1)·(n+2). */
export function xpThreshold(level: number): number {
  return 25 * (level - 1) * (level + 2);
}

export function levelForXp(xp: number): { level: number; current: number; next: number } {
  let level = 1;
  while (xp >= xpThreshold(level + 1)) level++;
  return { level, current: xpThreshold(level), next: xpThreshold(level + 1) };
}
