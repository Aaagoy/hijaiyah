/// <reference lib="webworker" />
import * as ort from "onnxruntime-web/wasm";
import { RecognitionEngine } from "./engine";
import { MODEL_CACHE_NAME, MODEL_URL, fetchWithCache } from "./model-cache";
import type { WorkerRequest, WorkerResponse } from "./worker-protocol";

declare const self: DedicatedWorkerGlobalScope;

ort.env.wasm.wasmPaths = "/ort/";
ort.env.wasm.numThreads = 1;

let engine: Promise<RecognitionEngine> | null = null;
const post = (msg: WorkerResponse) => self.postMessage(msg);

async function loadEngine(): Promise<RecognitionEngine> {
  const cache = await caches.open(MODEL_CACHE_NAME).catch(() => null);
  const model = await fetchWithCache(MODEL_URL, cache, fetch, (loaded, total) =>
    post({ type: "progress", loaded, total }),
  );
  return RecognitionEngine.create(ort, model);
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const msg = event.data;
  if (msg.type === "load") {
    engine ??= loadEngine();
    try {
      await engine;
      post({ type: "ready" });
    } catch (err) {
      engine = null;
      post({ type: "error", message: err instanceof Error ? err.message : String(err) });
    }
    return;
  }
  try {
    if (!engine) throw new Error("Model belum dimuat.");
    const result = await (await engine).recognize(msg.pcm, msg.target, msg.others);
    post({ type: "result", id: msg.id, result });
  } catch (err) {
    post({ type: "error", id: msg.id, message: err instanceof Error ? err.message : String(err) });
  }
};
