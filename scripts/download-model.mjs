/**
 * Download Xenova/opus-mt-zh-en model files from HuggingFace for local bundling.
 * Usage: node scripts/download-model.mjs [--mirror]
 *   --mirror  Use hf-mirror.com (recommended for China mainland)
 */

import fs from "fs";
import path from "path";
import http from "http";
import https from "https";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");

const useMirror = process.argv.includes("--mirror");
const BASE_URL = useMirror
  ? "https://hf-mirror.com"
  : "https://huggingface.co";

const MODEL_ID = "Xenova/opus-mt-zh-en";
const OUTPUT_DIR = path.join(PROJECT_ROOT, "resources", "models", MODEL_ID);

// Files to download (quantized ONNX for smaller size)
const FILES = [
  "config.json",
  "generation_config.json",
  "tokenizer.json",
  "tokenizer_config.json",
  "onnx/encoder_model_quantized.onnx",
  "onnx/decoder_model_merged_quantized.onnx",
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const dir = path.dirname(dest);
    fs.mkdirSync(dir, { recursive: true });

    const file = fs.createWriteStream(dest);
    const request = (urlStr, redirectCount = 0) => {
      if (redirectCount > 5) {
        reject(new Error(`Too many redirects for ${urlStr}`));
        return;
      }
      const mod = urlStr.startsWith("https") ? https : http;
      mod.get(urlStr, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          // Handle relative redirects
          const redirectUrl = res.headers.location.startsWith("http")
            ? res.headers.location
            : new URL(res.headers.location, urlStr).href;
          request(redirectUrl, redirectCount + 1);
          return;
        }
        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(`HTTP ${res.statusCode} for ${urlStr}`));
          return;
        }

        const totalBytes = parseInt(res.headers["content-length"] || "0", 10);
        let downloaded = 0;

        res.on("data", (chunk) => {
          downloaded += chunk.length;
          if (totalBytes > 0) {
            const pct = ((downloaded / totalBytes) * 100).toFixed(1);
            const mb = (downloaded / 1024 / 1024).toFixed(1);
            const totalMb = (totalBytes / 1024 / 1024).toFixed(1);
            process.stdout.write(`\r  ${mb}MB / ${totalMb}MB (${pct}%)`);
          }
        });

        res.pipe(file);
        file.on("finish", () => {
          file.close();
          console.log();
          resolve();
        });
      }).on("error", (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
    };
    request(url);
  });
}

async function main() {
  console.log(`Downloading model: ${MODEL_ID}`);
  console.log(`Source: ${BASE_URL}`);
  console.log(`Output: ${OUTPUT_DIR}\n`);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  for (const file of FILES) {
    const url = `${BASE_URL}/${MODEL_ID}/resolve/main/${file}`;
    const dest = path.join(OUTPUT_DIR, file);

    if (fs.existsSync(dest)) {
      console.log(`[skip] ${file} (already exists)`);
      continue;
    }

    console.log(`[download] ${file}`);
    console.log(`  ${url}`);
    try {
      await download(url, dest);
      console.log(`  -> OK`);
    } catch (err) {
      console.error(`  -> FAILED: ${err.message}`);
      process.exit(1);
    }
  }

  console.log("\nAll model files downloaded successfully!");
}

main();
