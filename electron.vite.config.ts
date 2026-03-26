import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({ exclude: [] })]
  },
  preload: {
    plugins: [externalizeDepsPlugin({ exclude: [] })]
  },
  renderer: {
    resolve: {
      alias: {
        '@': resolve('src/renderer/src')
      }
    },
    plugins: [
      vue(),
      AutoImport({
        resolvers: [ElementPlusResolver()],
        dts: resolve('src/renderer/src/auto-imports.d.ts')
      }),
      Components({
        resolvers: [ElementPlusResolver()],
        dts: resolve('src/renderer/src/components.d.ts')
      })
    ]
  }
})
