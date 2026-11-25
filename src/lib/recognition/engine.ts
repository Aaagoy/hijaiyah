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
import { TARGET_RATE } from "./audio";
import { scoreCandidates, type Verdict } from "./scoring";

/** The streaming runner holds back up to one window of frames; silence flushes the tail. */
export const TAIL_SILENCE_SECONDS = 1;
const MAX_FRAMES = 4000;

export type RecognitionResult = Verdict & { transcript: string };

/** Runs the tilawa Zipformer model on one short recording at a time. */
export class RecognitionEngine {
  private constructor(private readonly runner: ZipformerRunner) {}

  static async create(ort: unknown, model: ArrayBuffer | Uint8Array): Promise<RecognitionEngine> {
    const runner = await ZipformerRunner.create(ort, model, DEFAULT_ZIPFORMER_IO);
    return new RecognitionEngine(runner);
  }

  async recognize(pcm16k: Float32Array, target: Candidate, others: Candidate[]): Promise<RecognitionResult> {
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
    const verdict = scoreCandidates(post, out.frames, target, others);
    return { ...verdict, transcript: tokens.map((t) => t.sym).join("") };
  }
}
