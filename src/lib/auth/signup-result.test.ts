import { describe, expect, it } from "vitest";
import { signupOutcome, translateAuthError } from "./signup-result";

describe("signupOutcome", () => {
  it("logs in directly when a session is returned", () => {
    expect(signupOutcome({ session: {}, user: { identities: [{}] } }, null)).toEqual({ kind: "session" });
  });
  it("asks to confirm the email for a new user without a session", () => {
    expect(signupOutcome({ session: null, user: { identities: [{}] } }, null).kind).toBe("confirm");
  });
  it("reports an already registered email (Supabase returns no identities)", () => {
    expect(signupOutcome({ session: null, user: { identities: [] } }, null)).toEqual({
      kind: "error",
      message: "Email ini sudah terdaftar. Silakan masuk.",
    });
  });
  it("reports a username taken in a race as a username error", () => {
    expect(signupOutcome(null, { message: "Database error saving new user" })).toEqual({
      kind: "username-taken",
    });
  });
  it("translates other errors to Indonesian", () => {
    expect(signupOutcome(null, { message: "something odd" })).toEqual({
      kind: "error",
      message: "Terjadi kesalahan. Coba lagi sebentar lagi.",
    });
  });
});

describe("translateAuthError", () => {
  it("explains a password rejected by the project's password policy", () => {
    expect(translateAuthError("Password should be at least 6 characters.")).toMatch(/Password/);
    expect(translateAuthError("Password is known to be weak and easy to guess, please choose a different one.")).toMatch(/Password/);
  });
  it("explains an email address Supabase rejects", () => {
    expect(translateAuthError('Email address "a@b.c" is invalid')).toMatch(/email/i);
  });
  it("explains a confirmation email that could not be sent", () => {
    expect(translateAuthError("Error sending confirmation email")).toMatch(/email konfirmasi/i);
  });
  it("explains the email rate limit", () => {
    expect(translateAuthError("email rate limit exceeded")).toMatch(/Terlalu banyak/);
  });
  it("explains disabled signups", () => {
    expect(translateAuthError("Signups not allowed for this instance")).toMatch(/ditutup/);
  });
});
