import { describe, expect, it } from "vitest";
import { fetchWithCache, type CacheLike } from "./model-cache";

function memoryCache(): CacheLike & { store: Map<string, Response> } {
  const store = new Map<string, Response>();
  return {
    store,
    async match(url) {
      return store.get(url)?.clone();
    },
    async put(url, res) {
      store.set(url, res);
    },
  };
}

function streamResponse(chunks: Uint8Array[], failAfter?: number): Response {
  let i = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (failAfter !== undefined && i === failAfter) return controller.error(new Error("network down"));
      if (i < chunks.length) controller.enqueue(chunks[i++]);
      else controller.close();
    },
  });
  const total = chunks.reduce((n, c) => n + c.length, 0);
  return new Response(body, { headers: { "content-length": String(total) } });
}

describe("fetchWithCache", () => {
  it("returns a cached copy without fetching", async () => {
    const cache = memoryCache();
    await cache.put("/m.onnx", new Response(new Uint8Array([7, 8])));
    let fetched = false;
    const buf = await fetchWithCache("/m.onnx", cache, async () => ((fetched = true), new Response("")), () => {});
    expect(fetched).toBe(false);
    expect(Array.from(new Uint8Array(buf))).toEqual([7, 8]);
  });

  it("downloads with progress and stores the complete file", async () => {
    const cache = memoryCache();
    const progress: Array<[number, number]> = [];
    const buf = await fetchWithCache(
      "/m.onnx",
      cache,
      async () => streamResponse([new Uint8Array([1, 2]), new Uint8Array([3])]),
      (loaded, total) => progress.push([loaded, total]),
    );
    expect(Array.from(new Uint8Array(buf))).toEqual([1, 2, 3]);
    expect(progress.at(-1)).toEqual([3, 3]);
    expect(cache.store.has("/m.onnx")).toBe(true);
  });

  it("stores nothing and rejects when the download breaks", async () => {
    const cache = memoryCache();
    const run = fetchWithCache("/m.onnx", cache, async () => streamResponse([new Uint8Array([1])], 1), () => {});
    await expect(run).rejects.toThrow();
    expect(cache.store.size).toBe(0);
  });

  it("rejects on an HTTP error", async () => {
    const cache = memoryCache();
    const run = fetchWithCache("/m.onnx", cache, async () => new Response("no", { status: 404 }), () => {});
    await expect(run).rejects.toThrow(/404/);
    expect(cache.store.size).toBe(0);
  });
});
