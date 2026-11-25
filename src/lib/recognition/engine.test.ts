import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as ort from "onnxruntime-node";
import { RecognitionEngine } from "./engine";

const MODEL = "public/models/zipformer_a0w_ep1_a05.int8.onnx";

describe.skipIf(!existsSync(MODEL))("RecognitionEngine (real model)", () => {
  it("reports near-silence as silent", async () => {
    const engine = await RecognitionEngine.create(ort, readFileSync(MODEL));
    const pcm = new Float32Array(16000 * 1.5);
    for (let i = 0; i < pcm.length; i++) pcm[i] = Math.sin(i * 7.3) * 0.0005;
    const target = { key: "ba-a", phonemes: "بَ", latin: "ba" };
    const result = await engine.recognize(pcm, target, [{ key: "ba-i", phonemes: "بِ", latin: "bi" }]);
    expect(result.status).toBe("silent");
    expect(result.transcript).toBe("");
  });

  it("can be called twice (state resets between recordings)", async () => {
    const engine = await RecognitionEngine.create(ort, readFileSync(MODEL));
    const pcm = new Float32Array(16000);
    const target = { key: "ba-a", phonemes: "بَ", latin: "ba" };
    const a = await engine.recognize(pcm, target, []);
    const b = await engine.recognize(pcm, target, []);
    expect(b.scores).toEqual(a.scores);
  });
});
