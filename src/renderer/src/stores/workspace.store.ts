import { defineStore } from "pinia";
import { ref, computed } from "vue";

export type ConflictStrategy = "autoNumber" | "overwrite" | "skip";

export interface RenameConfig {
  enabled: boolean;
  template: string;
  startIndex: number;
  indexStep: number;
  indexDigits: number;
  conflictStrategy: ConflictStrategy;
}

export interface CompressConfig {
  enabled: boolean;
  quality: number;
  scale: number;
  stripExif: boolean;
  outputFormat: "original" | "jpg" | "webp" | "png";
}

export interface OutputConfig {
  mode: "newDirectory" | "overwrite";
  directory: string;
}

export const useWorkspaceStore = defineStore("workspace", () => {
  const rename = ref<RenameConfig>({
    enabled: true,
    template: "{original}-{index}",
    startIndex: 1,
    indexStep: 1,
    indexDigits: 3,
    conflictStrategy: "autoNumber",
  });

  const compress = ref<CompressConfig>({
    enabled: false,
    quality: 80,
    scale: 100,
    stripExif: true,
    outputFormat: "original",
  });

  const output = ref<OutputConfig>({
    mode: "newDirectory",
    directory: "",
  });

  const hasAnyAction = computed(
    () => rename.value.enabled || compress.value.enabled,
  );

  function updateRename(partial: Partial<RenameConfig>): void {
    rename.value = { ...rename.value, ...partial };
  }

  function updateCompress(partial: Partial<CompressConfig>): void {
    compress.value = { ...compress.value, ...partial };
  }

  function updateOutput(partial: Partial<OutputConfig>): void {
    output.value = { ...output.value, ...partial };
  }

  return {
    rename,
    compress,
    output,
    hasAnyAction,
    updateRename,
    updateCompress,
    updateOutput,
  };
});
