"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { signupOutcome, translateAuthError as translate } from "@/lib/auth/signup-result";
import { hasErrors, validateSignup, type SignupErrors } from "@/lib/auth/validation";
import { createClient } from "@/lib/supabase/server";

export interface AuthState {
  errors?: Partial<SignupErrors>;
  message?: string;
  success?: string;
  values?: { username?: string; email?: string };
}

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

export async function signUp(_prev: AuthState, form: FormData): Promise<AuthState> {
  const input = {
    username: text(form, "username"),
    email: text(form, "email"),
    password: String(form.get("password") ?? ""),
  };
  const values = { username: input.username, email: input.email };
  const errors = validateSignup(input);
  if (hasErrors(errors)) return { errors, values };

  const supabase = await createClient();
  const { data: available, error: rpcError } = await supabase.rpc("username_available", { p_username: input.username });
  if (rpcError) return { message: translate(rpcError.message), values };
  if (!available) return { errors: { username: "Username sudah dipakai. Pilih yang lain." }, values };

  const origin = (await headers()).get("origin") ?? "";
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: { data: { username: input.username }, emailRedirectTo: `${origin}/auth/confirm` },
  });
  const outcome = signupOutcome(data, error);
  if (outcome.kind === "username-taken") return { errors: { username: "Username sudah dipakai. Pilih yang lain." }, values };
  if (outcome.kind === "error") return { message: outcome.message, values };
  if (outcome.kind === "confirm") {
    return { success: "Pendaftaran berhasil! Cek email kamu dan klik tautan konfirmasi, lalu masuk.", values };
  }
  redirect("/belajar");
}

export async function signIn(_prev: AuthState, form: FormData): Promise<AuthState> {
  const email = text(form, "email");
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { message: "Isi email dan password.", values: { email } };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { message: translate(error.message), values: { email } };
  redirect("/belajar");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
