export const TARGET_RATE = 16000;

/** Average several channels into one. */
export function downmix(channels: Float32Array[]): Float32Array {
  if (channels.length === 1) return channels[0];
  const length = Math.min(...channels.map((c) => c.length));
  const out = new Float32Array(length);
  for (const ch of channels) for (let i = 0; i < length; i++) out[i] += ch[i] / channels.length;
  return out;
}

/** Linear-interpolation resampler (good enough for speech going into an 80-bin fbank). */
export function resampleLinear(input: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate) return input;
  const outLength = Math.round((input.length * toRate) / fromRate);
  const out = new Float32Array(outLength);
  const step = fromRate / toRate;
  for (let i = 0; i < outLength; i++) {
    const pos = i * step;
    const left = Math.floor(pos);
    const right = Math.min(left + 1, input.length - 1);
    const frac = pos - left;
    out[i] = input[left] * (1 - frac) + input[right] * frac;
  }
  return out;
}

export interface SpeechRegion {
  hasSpeech: boolean;
  /** Sample range [start, end) that contains the speech. */
  start: number;
  end: number;
}

/**
 * Energy-based voice activity detection. The noise floor is the quiet 20th percentile of the
 * recording, so steady background hum is ignored and only sounds clearly louder than it count.
 */
export function detectSpeech(pcm: Float32Array, rate: number): SpeechRegion {
  const frame = Math.round(rate * 0.02);
  const hop = Math.round(rate * 0.01);
  const rms: number[] = [];
  for (let at = 0; at + frame <= pcm.length; at += hop) {
    let sum = 0;
    for (let i = at; i < at + frame; i++) sum += pcm[i] * pcm[i];
    rms.push(Math.sqrt(sum / frame));
  }
  if (rms.length === 0) return { hasSpeech: false, start: 0, end: 0 };
  const floor = [...rms].sort((a, b) => a - b)[Math.floor(rms.length * 0.2)];
  const threshold = Math.max(floor * 4, 0.003);
  const loud = rms.map((r, i) => (r > threshold ? i : -1)).filter((i) => i >= 0);
  if (loud.length * hop < rate * 0.08) return { hasSpeech: false, start: 0, end: 0 };
  return { hasSpeech: true, start: loud[0] * hop, end: Math.min(pcm.length, loud[loud.length - 1] * hop + frame) };
}

/** Scale so the loudest sample reaches `target`, never amplifying by more than `maxGain`. */
export function normalizePeak(pcm: Float32Array, target: number, maxGain: number): Float32Array {
  let peak = 0;
  for (const v of pcm) peak = Math.max(peak, Math.abs(v));
  if (peak === 0) return pcm;
  const gain = Math.min(maxGain, target / peak);
  return pcm.map((v) => v * gain);
}
