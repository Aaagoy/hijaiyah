// Uploads the curriculum (and any recordings in content/audio/) into Supabase.
// Usage: npm run seed            (needs NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local)
//        npm run seed -- --dry-run
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { buildCurriculum } from "../src/lib/content/curriculum";
import { AUDIO_EXTENSIONS, toRows } from "../src/lib/content/to-rows";

const AUDIO_DIR = "content/audio";
const MIME: Record<string, string> = { mp3: "audio/mpeg", m4a: "audio/mp4", wav: "audio/wav", webm: "audio/webm", ogg: "audio/ogg" };

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

function findAudio(): Map<string, string> {
  const files = new Map<string, string>();
  if (!existsSync(AUDIO_DIR)) return files;
  for (const name of readdirSync(AUDIO_DIR)) {
    const m = name.match(/^(.+)\.([a-z0-9]+)$/i);
    const ext = m?.[2].toLowerCase();
    if (m && ext && (AUDIO_EXTENSIONS as readonly string[]).includes(ext)) files.set(m[1], ext);
  }
  return files;
}

async function main() {
  loadEnvFile(".env.local");
  const audio = findAudio();
  const rows = toRows(buildCurriculum(), audio);
  console.log(`levels=${rows.levels.length} sublevels=${rows.sublevels.length} items=${rows.items.length} audio=${audio.size}`);
  if (process.argv.includes("--dry-run")) return;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Isi NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di .env.local");
  const db = createClient(url, key, { auth: { persistSession: false } });

  const check = <T>(label: string, res: { data: T; error: { message: string } | null }) => {
    if (res.error) throw new Error(`${label}: ${res.error.message}`);
    return res.data;
  };

  const levels = check("levels", await db.from("levels").upsert(rows.levels, { onConflict: "key" }).select("id,key")) ?? [];
  const levelId = new Map(levels.map((l: { id: string; key: string }) => [l.key, l.id]));
  const subPayload = rows.sublevels.map(({ level_key, ...s }) => ({ ...s, level_id: levelId.get(level_key) }));
  const subs = check("sublevels", await db.from("sublevels").upsert(subPayload, { onConflict: "key" }).select("id,key")) ?? [];
  const subId = new Map(subs.map((s: { id: string; key: string }) => [s.key, s.id]));
  const itemPayload = rows.items.map(({ sublevel_key, ...i }) => ({ ...i, sublevel_id: subId.get(sublevel_key) }));
  check("items", await db.from("items").upsert(itemPayload, { onConflict: "key" }));

  for (const [itemKey, ext] of audio) {
    const body = readFileSync(`${AUDIO_DIR}/${itemKey}.${ext}`);
    const res = await db.storage.from("audio").upload(`items/${itemKey}.${ext}`, body, { contentType: MIME[ext], upsert: true });
    if (res.error) throw new Error(`audio ${itemKey}: ${res.error.message}`);
  }
  console.log("Seed selesai.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
