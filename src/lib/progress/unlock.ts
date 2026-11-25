export interface SublevelState {
  id: string;
  levelComingSoon: boolean;
  completed: boolean;
}

/**
 * Sub-levels in global order unlock one after another: everything up to and including the
 * first incomplete one is open. Coming-soon content is never open.
 */
export function computeUnlocked(ordered: SublevelState[]): Set<string> {
  const unlocked = new Set<string>();
  for (const sub of ordered) {
    if (sub.levelComingSoon) continue;
    unlocked.add(sub.id);
    if (!sub.completed) break;
  }
  return unlocked;
}
