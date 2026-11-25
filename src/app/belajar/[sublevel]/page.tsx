import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PracticeSession, type PracticeItem } from "@/components/practice/practice-session";
import type { Candidate } from "@/lib/content/curriculum";
import { loadHome, requireProfile } from "@/lib/progress/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Latihan — Hijaiyah" };

export default async function SublevelPage({ params }: PageProps<"/belajar/[sublevel]">) {
  const { sublevel: key } = await params;
  await requireProfile();
  const levels = await loadHome();
  const all = levels.flatMap((l) => l.sublevels.map((s) => ({ ...s, levelTitle: l.title })));
  const index = all.findIndex((s) => s.key === key);
  if (index === -1) notFound();
  const sub = all[index];
  if (sub.locked) redirect("/belajar");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("items")
    .select("id, key, ord, arabic, latin, phonemes, explanation, candidates, audio_path")
    .eq("sublevel_id", sub.id)
    .order("ord");
  if (error) throw new Error(`Gagal memuat soal: ${error.message}`);

  const items: PracticeItem[] = (data ?? []).map((row) => ({
    id: row.id,
    key: row.key,
    arabic: row.arabic,
    latin: row.latin,
    phonemes: row.phonemes,
    explanation: row.explanation,
    candidates: row.candidates as Candidate[],
    audioUrl: row.audio_path ? supabase.storage.from("audio").getPublicUrl(row.audio_path).data.publicUrl : null,
  }));
  const next = all[index + 1];

  return (
    <PracticeSession
      sublevel={{ id: sub.id, title: sub.title, levelTitle: sub.levelTitle, completed: sub.completed }}
      items={items}
      nextHref={next ? `/belajar/${next.key}` : null}
    />
  );
}
