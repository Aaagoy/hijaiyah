"use server";

import type { ItemSave } from "@/lib/practice/resume";
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

/**
 * Save one item read correctly in the exam (best stars kept, XP for improvements only).
 * Errors are returned as values: thrown server-action messages are hidden in production builds.
 */
export async function saveItemResult(itemId: string, stars: number): Promise<ItemSave> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("record_item", { p_item_id: itemId, p_stars: stars })
    .single<{ xp_gained: number; total_xp: number; sublevel_completed: boolean; sublevel_stars: number | null }>();
  if (error || !data) {
    if (error) console.error("record_item failed:", error.message);
    return { ok: false };
  }
  return {
    ok: true,
    xpGained: data.xp_gained,
    totalXp: data.total_xp,
    sublevelCompleted: data.sublevel_completed,
    sublevelStars: data.sublevel_stars,
  };
}
