export interface SignupInput {
  username: string;
  email: string;
  password: string;
}

export type SignupErrors = Record<keyof SignupInput, string | undefined>;

export function validateUsername(username: string): string | undefined {
  if (username.length < 3) return "Username minimal 3 karakter.";
  if (username.length > 20) return "Username maksimal 20 karakter.";
  if (!/^[a-z0-9_]+$/.test(username)) return "Username hanya boleh huruf kecil, angka, dan garis bawah (_).";
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
