import { resolve } from "path";
import { defineConfig } from "electron-vite";
import vue from "@vitejs/plugin-vue";
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import { ElementPlusResolver } from "unplugin-vue-components/resolvers";

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
    resolve: {
      alias: {
        "@": resolve("src/renderer/src"),
      },
    },
    plugins: [
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
