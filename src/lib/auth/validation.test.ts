import { describe, expect, it } from "vitest";
import { validateSignup, normalizeUsername, validateUsername } from "./validation";

const valid = { username: "ahmad_23", email: "ahmad@contoh.id", password: "rahasia123" };

describe("validateSignup", () => {
  it("accepts valid input", () => {
    expect(validateSignup(valid)).toEqual({ username: undefined, email: undefined, password: undefined });
  });
  it("rejects a username shorter than 3 characters", () => {
    expect(validateSignup({ ...valid, username: "ab" }).username).toMatch(/3/);
  });
  it("rejects a username longer than 20 characters", () => {
    expect(validateSignup({ ...valid, username: "a".repeat(21) }).username).toMatch(/20/);
  });
  it("allows single spaces between words in the username", () => {
    expect(validateUsername("ahmad yusuf 23")).toBeUndefined();
    expect(validateUsername("a".repeat(9) + " " + "b".repeat(10))).toBeUndefined();
  });
  it("rejects symbols in the username", () => {
    expect(validateSignup({ ...valid, username: "ahmad 23!" }).username).toMatch(/huruf kecil/);
  });
  it("rejects spaces at the edges or doubled spaces", () => {
    expect(validateUsername(" ahmad")).toBeDefined();
    expect(validateUsername("ahmad  yusuf")).toBeDefined();
  });
  it("normalizes what the user typed: trims, single spaces, lowercase", () => {
    expect(normalizeUsername("  Ahmad   Yusuf ")).toBe("ahmad yusuf");
  });
  it("rejects uppercase letters in the username", () => {
    expect(validateSignup({ ...valid, username: "Ahmad" }).username).toMatch(/huruf kecil/);
  });
  it("rejects an invalid email", () => {
    expect(validateSignup({ ...valid, email: "ahmad@" }).email).toMatch(/email/i);
  });
  it("rejects a password shorter than 8 characters", () => {
    expect(validateSignup({ ...valid, password: "1234567" }).password).toMatch(/8/);
  });
});
