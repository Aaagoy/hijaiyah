"use server";

import { revalidatePath } from "next/cache";
import { USERNAME_RULE, normalizeUsername, validateUsername } from "@/lib/auth/validation";
import { createClient } from "@/lib/supabase/server";

export interface UsernameState {
  value: string;
  ok?: boolean;
  message?: string;
}

export async function updateUsername(_prev: UsernameState, form: FormData): Promise<UsernameState> {
  const value = normalizeUsername(String(form.get("username") ?? ""));
  const invalid = validateUsername(value);
  if (invalid) return { value, message: invalid };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("update_username", { p_username: value });
  if (error) {
    if (error.message.includes("username_taken")) return { value, message: "Username sudah dipakai. Coba yang lain." };
    if (error.message.includes("username_invalid")) return { value, message: USERNAME_RULE };
    console.error("update_username failed:", error.message);
    return { value, message: "Gagal menyimpan username. Coba lagi." };
  }
  revalidatePath("/", "layout");
  return { value: data as string, ok: true, message: "Username tersimpan." };
}

export async function chooseAvatar(avatar: string): Promise<{ ok: boolean; message?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_avatar", { p_avatar: avatar });
  if (error) {
    console.error("set_avatar failed:", error.message);
    return { ok: false, message: "Gagal menyimpan foto profil. Coba lagi." };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
