import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface CompressOptions {
  quality: number
  scale: number
  stripExif: boolean
  outputFormat: 'original' | 'jpg' | 'webp' | 'png'
  outputDirectory: string
}

export const useCompressStore = defineStore('compress', () => {
  const options = ref<CompressOptions>({
    quality: 80,
    scale: 100,
    stripExif: true,
    outputFormat: 'original',
    outputDirectory: ''
  })

  function updateOptions(partial: Partial<CompressOptions>): void {
    options.value = { ...options.value, ...partial }
  }

  return { options, updateOptions }
})
