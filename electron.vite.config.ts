import { resolve } from "path";
import { createReadStream, readFileSync } from "fs";
import { defineConfig } from "electron-vite";
import type { Plugin } from "vite";
import vue from "@vitejs/plugin-vue";
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import { ElementPlusResolver } from "unplugin-vue-components/resolvers";

const ONNX_WASM_DIR = resolve("node_modules/onnxruntime-web/dist");
const ONNX_FILES = [
  "ort-wasm-simd-threaded.jsep.mjs",
  "ort-wasm-simd-threaded.jsep.wasm",
];

/**
 * Vite plugin to serve ONNX Runtime WASM files locally.
 * - Dev: middleware intercepts requests and serves from node_modules
 * - Build: emits files to output directory
 */
function serveOnnxWasm(): Plugin {
  return {
    name: "serve-onnx-wasm",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const filename = req.url?.split("?")[0]?.slice(1);
        if (filename && ONNX_FILES.includes(filename)) {
          const filePath = resolve(ONNX_WASM_DIR, filename);
          const contentType = filename.endsWith(".mjs")
            ? "application/javascript"
            : "application/wasm";
          res.setHeader("Content-Type", contentType);
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          createReadStream(filePath).pipe(res);
          return;
        }
        next();
      });
    },
    generateBundle() {
      for (const filename of ONNX_FILES) {
        const filePath = resolve(ONNX_WASM_DIR, filename);
        this.emitFile({
          type: "asset",
          fileName: filename,
          source: readFileSync(filePath),
        });
      }
    },
  };
}

export default defineConfig({
  main: {
    build: {
      externalizeDeps: true,
    },
  },
  preload: {
    build: {
      externalizeDeps: true,
    },
  },
  renderer: {
    optimizeDeps: {
      exclude: ["@huggingface/transformers"],
    },
    resolve: {
      alias: {
        "@": resolve("src/renderer/src"),
      },
    },
    plugins: [
      serveOnnxWasm(),
      vue(),
      AutoImport({
        resolvers: [ElementPlusResolver()],
        dts: resolve("src/renderer/src/auto-imports.d.ts"),
      }),
      Components({
        resolvers: [ElementPlusResolver()],
        dts: resolve("src/renderer/src/components.d.ts"),
      }),
    ],
  },
});
