import { describe, expect, it } from "vitest";
import { downmix, resampleLinear } from "./audio";

describe("downmix", () => {
  it("averages channels sample by sample", () => {
    const out = downmix([Float32Array.from([1, 0, 0.5]), Float32Array.from([0, 0, -0.5])]);
    expect(Array.from(out)).toEqual([0.5, 0, 0]);
  });
  it("returns a single channel unchanged", () => {
    const ch = Float32Array.from([0.1, 0.2]);
    expect(downmix([ch])).toBe(ch);
  });
});

describe("resampleLinear", () => {
  it("shrinks 48 kHz to 16 kHz by a factor of 3", () => {
    expect(resampleLinear(new Float32Array(4800), 48000, 16000)).toHaveLength(1600);
  });
  it("keeps a constant signal constant", () => {
    const out = resampleLinear(new Float32Array(441).fill(0.25), 44100, 16000);
    expect(out.every((v) => Math.abs(v - 0.25) < 1e-6)).toBe(true);
  });
  it("returns the input when rates match", () => {
    const pcm = new Float32Array(10);
    expect(resampleLinear(pcm, 16000, 16000)).toBe(pcm);
  });
});
