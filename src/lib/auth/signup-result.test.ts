import { describe, expect, it } from "vitest";
import { signupOutcome } from "./signup-result";

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
