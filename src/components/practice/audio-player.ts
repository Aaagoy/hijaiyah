export interface PlayerLike {
  src: string;
}

/** Reuse the player only while it plays the same recording; a new item gets a new player. */
export function audioFor<T extends PlayerLike>(current: T | null, url: string, create: (url: string) => T): T {
  if (current && current.src.endsWith(url)) return current;
  return create(url);
}
