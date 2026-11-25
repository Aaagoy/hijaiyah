"use server";

import { createClient } from "@/lib/supabase/server";

export interface AttemptInput {
  itemId: string;
  mode: "belajar" | "ujian";
  attemptNo: number;
  status: "correct" | "wrong" | "silent";
  heardKey: string | null;
  score: number | null;
  transcript: string;
}

/** Log one recognition result (never audio). Failures are swallowed: logging must not block practice. */
export async function recordAttempt(input: AttemptInput): Promise<void> {
  const supabase = await createClient();
  const score = input.score !== null && Number.isFinite(input.score) ? input.score : null;
  const { error } = await supabase.from("attempts").insert({
    item_id: input.itemId,
    mode: input.mode,
    attempt_no: Math.max(1, Math.floor(input.attemptNo)),
    status: input.status,
    heard_key: input.heardKey,
    score,
    transcript: input.transcript.slice(0, 500),
  });
  if (error) console.error("recordAttempt:", error.message);
}

export type FinishResult = { ok: true; xpGained: number; totalXp: number; sublevelStars: number } | { ok: false };

/** Errors are returned as values: thrown server-action messages are hidden in production builds. */
export async function finishSublevel(sublevelId: string, itemStars: Record<string, number>): Promise<FinishResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("complete_sublevel", { p_sublevel_id: sublevelId, p_item_stars: itemStars })
    .single<{ xp_gained: number; total_xp: number; sublevel_stars: number }>();
  if (error || !data) return { ok: false };
  return { ok: true, xpGained: data.xp_gained, totalXp: data.total_xp, sublevelStars: data.sublevel_stars };
}
