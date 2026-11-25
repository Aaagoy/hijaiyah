import { describe, expect, it } from "vitest";
import { validateSignup } from "./validation";

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
  it("rejects spaces and symbols in the username", () => {
    expect(validateSignup({ ...valid, username: "ahmad 23!" }).username).toMatch(/huruf kecil/);
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
