import { defineStore } from "pinia";
import { ref, watch } from "vue";
import type { ConflictStrategy } from "@/stores/workspace.store";

const SETTINGS_KEY = "app-settings";

interface AppSettings {
  autoTranslate: boolean;
  conflictStrategy: ConflictStrategy;
}

const DEFAULTS: AppSettings = {
  autoTranslate: true,
  conflictStrategy: "autoNumber",
};

function loadSettings(): AppSettings {
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    return data ? { ...DEFAULTS, ...JSON.parse(data) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export const useSettingsStore = defineStore("settings", () => {
  const saved = loadSettings();

  const autoTranslate = ref(saved.autoTranslate);
  const conflictStrategy = ref<ConflictStrategy>(saved.conflictStrategy);

  watch(
    [autoTranslate, conflictStrategy],
    () => {
      saveSettings({
        autoTranslate: autoTranslate.value,
        conflictStrategy: conflictStrategy.value,
      });
    },
  );

  function setAutoTranslate(val: boolean): void {
    autoTranslate.value = val;
  }

  function setConflictStrategy(val: ConflictStrategy): void {
    conflictStrategy.value = val;
  }

  return {
    autoTranslate,
    conflictStrategy,
    setAutoTranslate,
    setConflictStrategy,
  };
});
