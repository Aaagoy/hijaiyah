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

/**
 * Flatten the curriculum into table rows linked by key.
 * @param audioFiles item key → file extension of its recording in content/audio/
 */
export function toRows(levels: CurriculumLevel[], audioFiles: Map<string, string>) {
  const out = { levels: [] as LevelRow[], sublevels: [] as SublevelRow[], items: [] as ItemRow[] };
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
          audio_path: ext ? `items/${item.key}.${ext}` : null,
        });
      });
    }
  }
  return out;
}
