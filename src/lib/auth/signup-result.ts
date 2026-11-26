export type SignupOutcome =
  | { kind: "session" }
  | { kind: "confirm" }
  | { kind: "username-taken" }
  | { kind: "error"; message: string };

interface SignupData {
  session: unknown | null;
  user: { identities?: unknown[] | null } | null;
}

/** Translate an auth error message from Supabase into Indonesian copy. */
export function translateAuthError(message: string): string {
  if (/already registered/i.test(message)) return "Email ini sudah terdaftar. Silakan masuk.";
  if (/invalid login credentials/i.test(message)) return "Email atau password salah.";
  if (/email not confirmed/i.test(message)) return "Email belum dikonfirmasi. Cek kotak masuk email kamu.";
  if (/rate limit/i.test(message)) return "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.";
  if (/password/i.test(message)) return "Password ditolak: terlalu pendek atau terlalu mudah ditebak. Gunakan password lain.";
  if (/email address .*invalid|invalid email/i.test(message)) return "Alamat email ditolak. Gunakan alamat email lain yang aktif.";
  if (/sending .*email/i.test(message)) return "Email konfirmasi gagal dikirim. Coba lagi beberapa saat lagi.";
  if (/signups? not allowed|signup.*disabled/i.test(message)) return "Pendaftaran sedang ditutup.";
  return "Terjadi kesalahan. Coba lagi sebentar lagi.";
}

/** Interpret the result of supabase.auth.signUp. */
export function signupOutcome(data: SignupData | null, error: { message: string } | null): SignupOutcome {
  // The profile trigger fails on a duplicate username (two signups racing for the same name).
  if (error && /database error saving new user/i.test(error.message)) return { kind: "username-taken" };
  if (error) {
    // Keep the original text in the server log: the user only sees the Indonesian summary.
    console.error("signUp failed:", error.message);
    return { kind: "error", message: translateAuthError(error.message) };
  }
  // With email confirmation on, an already-registered email returns a user without identities.
  if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    return { kind: "error", message: "Email ini sudah terdaftar. Silakan masuk." };
  }
  return data?.session ? { kind: "session" } : { kind: "confirm" };
}
