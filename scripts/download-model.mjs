// Downloads the @tilawa/core Zipformer model (NPL-1.2, non-commercial) into public/models/.
// Usage: npm run model:download
import { createWriteStream, existsSync, mkdirSync, renameSync, statSync } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const URL_ =
  "https://github.com/yazinsai/tilawa/releases/download/zipformer-a0w-ep1-a0.5/zipformer_a0w_ep1_a05.int8.onnx";
const DIR = "public/models";
const FILE = `${DIR}/zipformer_a0w_ep1_a05.int8.onnx`;

if (existsSync(FILE) && statSync(FILE).size > 1_000_000) {
  console.log(`Model already present: ${FILE}`);
  process.exit(0);
}
mkdirSync(DIR, { recursive: true });
console.log(`Downloading ${URL_} ...`);
const res = await fetch(URL_);
if (!res.ok || !res.body) throw new Error(`Download failed: HTTP ${res.status}`);
await pipeline(Readable.fromWeb(res.body), createWriteStream(`${FILE}.part`));
renameSync(`${FILE}.part`, FILE);
console.log(`Saved ${FILE} (${(statSync(FILE).size / 1e6).toFixed(1)} MB)`);
