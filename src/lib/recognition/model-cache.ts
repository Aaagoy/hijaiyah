/** Served from public/ by default; set NEXT_PUBLIC_MODEL_URL to load it from elsewhere (it must allow CORS). */
export const MODEL_URL = process.env.NEXT_PUBLIC_MODEL_URL || "/models/zipformer_a0w_ep1_a05.int8.onnx";
export const MODEL_CACHE_NAME = "hijaiyah-model-v1";

export interface CacheLike {
  match(url: string): Promise<Response | undefined>;
  put(url: string, response: Response): Promise<void>;
}

/**
 * Return the file from the cache, or download it (reporting progress) and cache it.
 * Only a fully downloaded file is ever stored; cache failures fall back to a plain download.
 */
export async function fetchWithCache(
  url: string,
  cache: CacheLike | null,
  fetcher: typeof fetch,
  onProgress: (loaded: number, total: number) => void,
): Promise<ArrayBuffer> {
  // Caching is best effort: private browsing or a full disk must not block learning.
  const cached = await cache?.match(url).catch(() => undefined);
  if (cached) return cached.arrayBuffer();

  const res = await fetcher(url);
  if (!res.ok || !res.body) throw new Error(`Gagal mengunduh model (HTTP ${res.status}).`);
  const total = Number(res.headers.get("content-length")) || 0;
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    onProgress(loaded, total || loaded);
  }
  const bytes = new Uint8Array(loaded);
  let at = 0;
  for (const c of chunks) {
    bytes.set(c, at);
    at += c.length;
  }
  await cache
    ?.put(url, new Response(bytes, { headers: { "content-type": "application/octet-stream" } }))
    .catch(() => {});
  return bytes.buffer;
}
