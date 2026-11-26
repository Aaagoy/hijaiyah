import { describe, expect, it } from "vitest";
import { detectSpeech, downmix, normalizePeak, resampleLinear } from "./audio";

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

function tone(seconds: number, amp: number, rate = 16000): Float32Array {
  const out = new Float32Array(Math.round(seconds * rate));
  for (let i = 0; i < out.length; i++) out[i] = Math.sin((2 * Math.PI * 220 * i) / rate) * amp;
  return out;
}
function noise(seconds: number, amp: number, rate = 16000): Float32Array {
  const out = new Float32Array(Math.round(seconds * rate));
  let seed = 7;
  for (let i = 0; i < out.length; i++) {
    seed = (seed * 16807) % 2147483647;
    out[i] = ((seed / 2147483647) * 2 - 1) * amp;
  }
  return out;
}
const join = (...parts: Float32Array[]) => {
  const out = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
};

describe("detectSpeech", () => {
  it("finds no speech in near-silence", () => {
    expect(detectSpeech(noise(2, 0.001), 16000).hasSpeech).toBe(false);
  });
  it("finds no speech in steady background hum", () => {
    expect(detectSpeech(noise(2, 0.02), 16000).hasSpeech).toBe(false);
  });
  it("locates a spoken burst inside background noise", () => {
    const pcm = join(noise(1, 0.01), tone(0.4, 0.3), noise(1, 0.01));
    const v = detectSpeech(pcm, 16000);
    expect(v.hasSpeech).toBe(true);
    expect(v.start / 16000).toBeGreaterThan(0.8);
    expect(v.start / 16000).toBeLessThan(1.05);
    expect(v.end / 16000).toBeGreaterThan(1.35);
    expect(v.end / 16000).toBeLessThan(1.6);
  });
  it("finds speech from a quiet microphone", () => {
    const pcm = join(noise(1, 0.0005), tone(0.4, 0.02), noise(1, 0.0005));
    expect(detectSpeech(pcm, 16000).hasSpeech).toBe(true);
  });
});

describe("normalizePeak", () => {
  it("boosts a quiet recording to the target peak", () => {
    const out = normalizePeak(tone(0.1, 0.05), 0.9, 20);
    expect(Math.max(...out.map(Math.abs))).toBeCloseTo(0.9, 2);
  });
  it("caps the gain so hiss is not blown up", () => {
    const out = normalizePeak(tone(0.1, 0.001), 0.9, 20);
    expect(Math.max(...out.map(Math.abs))).toBeCloseTo(0.02, 3);
  });
  it("never makes a loud recording louder than the target", () => {
    const out = normalizePeak(tone(0.1, 0.99), 0.9, 20);
    expect(Math.max(...out.map(Math.abs))).toBeCloseTo(0.9, 2);
  });
});
