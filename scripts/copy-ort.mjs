// Copies the onnxruntime-web WASM runtime into public/ort/ so the recognizer worker can load it.
import { copyFileSync, mkdirSync, readdirSync } from "node:fs";

const SRC = "node_modules/onnxruntime-web/dist";
const DEST = "public/ort";
mkdirSync(DEST, { recursive: true });
const files = readdirSync(SRC).filter((f) => /^ort-wasm.*\.(wasm|mjs)$/.test(f));
for (const f of files) copyFileSync(`${SRC}/${f}`, `${DEST}/${f}`);
console.log(`copy-ort: ${files.length} files -> ${DEST}`);
