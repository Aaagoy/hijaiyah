import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buildHomeModel, type HomeLevel } from "./home-model";

export interface Profile {
  id: string;
  username: string;
  xp: number;
}

/** The signed-in user's profile; redirects to /masuk when there is none. */
export async function requireProfile(): Promise<Profile> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub as string | undefined;
  if (!userId) redirect("/masuk");
  const { data } = await supabase.from("profiles").select("id, username, xp").eq("id", userId).single();
  if (!data) redirect("/masuk");
  return data;
}

export async function loadHome(): Promise<HomeLevel[]> {
  const supabase = await createClient();
  const [levels, sublevels, items, itemProgress, sublevelProgress] = await Promise.all([
    supabase.from("levels").select("id, key, ord, title, description, coming_soon"),
    supabase.from("sublevels").select("id, level_id, key, ord, title"),
    supabase.from("items").select("id, sublevel_id"),
    supabase.from("item_progress").select("item_id, best_stars"),
    supabase.from("sublevel_progress").select("sublevel_id, best_stars"),
  ]);
  const failed = [levels, sublevels, items, itemProgress, sublevelProgress].find((r) => r.error);
  if (failed?.error) throw new Error(`Gagal memuat data belajar: ${failed.error.message}`);
  return buildHomeModel({
    levels: levels.data ?? [],
    sublevels: sublevels.data ?? [],
    items: items.data ?? [],
    itemProgress: itemProgress.data ?? [],
    sublevelProgress: sublevelProgress.data ?? [],
  });
}
