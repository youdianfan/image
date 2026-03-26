import { defineStore } from "pinia";
import { ref, computed, watch } from "vue";
import type { NameFormat } from "@/utils/nameConverter";

export type ConflictStrategy = "autoNumber" | "overwrite" | "skip";

export interface RenameConfig {
  enabled: boolean;
  template: string;
  nameFormat: NameFormat;
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

const SETTINGS_KEY = "workspace-settings";

function loadSavedSettings(): { nameFormat?: NameFormat } {
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

function saveSettings(settings: { nameFormat: NameFormat }): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export const useWorkspaceStore = defineStore("workspace", () => {
  const saved = loadSavedSettings();

  const rename = ref<RenameConfig>({
    enabled: true,
    template: "{original}",
    nameFormat: saved.nameFormat || "snake_case",
    startIndex: 1,
    indexStep: 1,
    indexDigits: 3,
    conflictStrategy: "autoNumber",
  });

  const compress = ref<CompressConfig>({
    enabled: true,
    quality: 80,
    scale: 100,
    stripExif: true,
    outputFormat: "webp",
  });

  const output = ref<OutputConfig>({
    mode: "newDirectory",
    directory: "",
  });

  const hasAnyAction = computed(
    () => rename.value.enabled || compress.value.enabled,
  );

  // Persist nameFormat to localStorage
  watch(
    () => rename.value.nameFormat,
    (fmt) => saveSettings({ nameFormat: fmt }),
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
