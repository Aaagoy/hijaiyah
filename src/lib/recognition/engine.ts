import {
  BLANK_ID,
  DEFAULT_ZIPFORMER_IO,
  FramePosteriors,
  GreedyCtcDecoder,
  KaldiFbank,
  TOKENS,
  ZipformerRunner,
} from "@tilawa/core";
import type { Candidate } from "@/lib/content/curriculum";
import { TARGET_RATE, detectSpeech, normalizePeak } from "./audio";
import { SILENCE_KEY, scoreCandidates, type Verdict } from "./scoring";

/** The streaming runner holds back up to one window of frames; silence flushes the tail. */
export const TAIL_SILENCE_SECONDS = 1;
const MAX_FRAMES = 4000;
/** Margin kept around detected speech so soft onsets and endings are not cut. */
const SPEECH_PAD_SECONDS = 0.2;
const TARGET_PEAK = 0.9;
/** Limit on amplification, so a far-away voice is helped without turning hiss into "speech". */
const MAX_GAIN = 10;

export type RecognitionResult = Verdict & { transcript: string };

/** Runs the tilawa Zipformer model on one short recording at a time. */
export class RecognitionEngine {
  private constructor(private readonly runner: ZipformerRunner) {}

  static async create(ort: unknown, model: ArrayBuffer | Uint8Array): Promise<RecognitionEngine> {
    const runner = await ZipformerRunner.create(ort, model, DEFAULT_ZIPFORMER_IO);
    return new RecognitionEngine(runner);
  }

  async recognize(recording: Float32Array, target: Candidate, others: Candidate[]): Promise<RecognitionResult> {
    // Decide "nothing was said" from the audio energy: the model's own blank path is too cheap.
    const region = detectSpeech(recording, TARGET_RATE);
    if (!region.hasSpeech) {
      return { status: "silent", heardKey: SILENCE_KEY, targetScore: Number.NaN, scores: {}, transcript: "" };
    }
    // Keep only the spoken part (plus a little margin) so background noise before and after is
    // not decoded, then lift quiet microphones to a consistent level.
    const pad = Math.round(SPEECH_PAD_SECONDS * TARGET_RATE);
    const pcm16k = normalizePeak(
      recording.subarray(Math.max(0, region.start - pad), Math.min(recording.length, region.end + pad)),
      TARGET_PEAK,
      MAX_GAIN,
    );

    this.runner.reset();
    const fbank = new KaldiFbank();
    const frames = [
      ...fbank.acceptWaveform(pcm16k),
      ...fbank.acceptWaveform(new Float32Array(TAIL_SILENCE_SECONDS * TARGET_RATE)),
      ...fbank.inputFinished(),
    ];
    const vocab = this.runner.io.vocabSize;
    const post = new FramePosteriors(vocab, MAX_FRAMES);
    const decoder = new GreedyCtcDecoder(TOKENS, BLANK_ID);
    const out = await this.runner.accept(frames);
    if (out.frames > 0) post.push(out.logProbs, out.frames, 0);
    const tokens = [...decoder.consume(out.logProbs, out.frames, vocab), ...decoder.flush()];
    const verdict = scoreCandidates(post, out.frames, target, others, { speechDetected: true });
    return { ...verdict, transcript: tokens.map((t) => t.sym).join("") };
  }
}
