import type { Candidate, CurriculumLevel } from "./curriculum";

export const AUDIO_EXTENSIONS = ["mp3", "m4a", "wav", "webm", "ogg"] as const;

export interface LevelRow {
  key: string;
  ord: number;
  title: string;
  description: string;
  coming_soon: boolean;
}
export interface SublevelRow {
  key: string;
  level_key: string;
  ord: number;
  title: string;
}
export interface ItemRow {
  key: string;
  sublevel_key: string;
  ord: number;
  arabic: string;
  latin: string;
  phonemes: string;
  explanation: string;
  candidates: Candidate[];
  audio_path: string | null;
}

const allItems = (levels: CurriculumLevel[]) => levels.flatMap((l) => l.sublevels.flatMap((s) => s.items));

/**
 * Items that need a recording: the first item of each distinct reading. Later items with the
 * same reading (e.g. the mixed levels) reuse that recording.
 */
export function recordingKeys(levels: CurriculumLevel[]): Set<string> {
  const seen = new Set<string>();
  const keys = new Set<string>();
  for (const item of allItems(levels)) {
    if (seen.has(item.phonemes)) continue;
    seen.add(item.phonemes);
    keys.add(item.key);
  }
  return keys;
}

/**
 * Flatten the curriculum into table rows linked by key.
 * @param audioFiles item key → file extension of its recording in content/audio/.
 * An item without its own file uses the recording of another item with the same reading.
 */
export function toRows(levels: CurriculumLevel[], audioFiles: Map<string, string>) {
  const out = { levels: [] as LevelRow[], sublevels: [] as SublevelRow[], items: [] as ItemRow[] };
  const shared = new Map<string, string>();
  for (const item of allItems(levels)) {
    const ext = audioFiles.get(item.key);
    if (ext && !shared.has(item.phonemes)) shared.set(item.phonemes, `items/${item.key}.${ext}`);
  }
  for (const level of levels) {
    out.levels.push({
      key: level.key,
      ord: level.order,
      title: level.title,
      description: level.description,
      coming_soon: level.comingSoon,
    });
    for (const sub of level.sublevels) {
      out.sublevels.push({ key: sub.key, level_key: level.key, ord: sub.order, title: sub.title });
      sub.items.forEach((item, i) => {
        const ext = audioFiles.get(item.key);
        out.items.push({
          key: item.key,
          sublevel_key: sub.key,
          ord: i + 1,
          arabic: item.arabic,
          latin: item.latin,
          phonemes: item.phonemes,
          explanation: item.explanation,
          candidates: item.candidates,
          audio_path: ext ? `items/${item.key}.${ext}` : (shared.get(item.phonemes) ?? null),
        });
      });
    }
  }
  return out;
}
