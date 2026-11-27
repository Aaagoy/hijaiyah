export const USERNAME_RULE = "Username hanya boleh huruf kecil, angka, garis bawah (_), dan spasi di antara kata.";
export const USERNAME_HINT = "Huruf kecil, angka, garis bawah (_), dan spasi; 3–20 karakter.";

export interface SignupInput {
  username: string;
  email: string;
  password: string;
}

export type SignupErrors = Record<keyof SignupInput, string | undefined>;

/** Words of lowercase letters, digits or "_", separated by single spaces. */
const USERNAME_PATTERN = /^[a-z0-9_]+( [a-z0-9_]+)*$/;

/** What we store: trimmed, inner whitespace collapsed to one space, lowercase. */
export function normalizeUsername(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").toLowerCase();
}

export function validateUsername(username: string): string | undefined {
  if (username.length < 3) return "Username minimal 3 karakter.";
  if (username.length > 20) return "Username maksimal 20 karakter.";
  if (!USERNAME_PATTERN.test(username)) return USERNAME_RULE;
  return undefined;
}

export function validateSignup(input: SignupInput): SignupErrors {
  return {
    username: validateUsername(input.username),
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email) ? undefined : "Format email tidak valid.",
    password: input.password.length >= 8 ? undefined : "Password minimal 8 karakter.",
  };
}

export const hasErrors = (errors: SignupErrors) => Object.values(errors).some(Boolean);
