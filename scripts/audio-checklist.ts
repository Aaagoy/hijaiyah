// Writes content/audio/README.md: naming rules + a checklist of every item to record.
// Usage: npm run audio:checklist
import { writeFileSync } from "node:fs";
import { buildCurriculum } from "../src/lib/content/curriculum";
import { recordingKeys } from "../src/lib/content/to-rows";

const levels = buildCurriculum();
const toRecord = recordingKeys(levels);
const total = toRecord.size;
const lines = [
  "# Rekaman contoh audio",
  "",
  "Taruh satu file per item di folder ini dengan nama `<kunci-item>.<ext>` (mp3, m4a, wav, webm, atau ogg),",
  "misalnya `fathah-ba.m4a`, lalu jalankan `npm run seed`. Item tanpa file menampilkan \"Audio contoh belum tersedia\".",
  "",
  "Tips: rekam di ruangan sepi, satu item per file, beri jeda sekitar 0,3 detik sebelum dan sesudah bacaan.",
  "",
  "Level campuran tidak perlu direkam: itemnya otomatis memakai rekaman bacaan yang sama dari level sebelumnya.",
  "",
  `## Daftar rekaman (${total})`,
  "",
];
for (const level of levels) {
  const items = level.sublevels.flatMap((s) => s.items).filter((i) => toRecord.has(i.key));
  if (!items.length) continue;
  lines.push(`### ${level.order}. ${level.title}`, "");
  for (const item of items) lines.push(`- [ ] \`${item.key}\` — ${item.arabic} (${item.latin})`);
  lines.push("");
}
writeFileSync("content/audio/README.md", lines.join("\n"));
console.log(`content/audio/README.md: ${total} recordings`);
