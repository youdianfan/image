import { createI18n } from "vue-i18n";
import zhCN from "./locales/zh-CN";
import ja from "./locales/ja";
import ko from "./locales/ko";

export type AppLocale = "zh-CN" | "ja" | "ko";

export const LOCALE_OPTIONS: { value: AppLocale; label: string }[] = [
  { value: "zh-CN", label: "简体中文" },
  { value: "ja", label: "日本語" },
  { value: "ko", label: "한국어" },
];

const LOCALE_KEY = "app-locale";

function getSavedLocale(): AppLocale {
  const saved = localStorage.getItem(LOCALE_KEY);
  if (saved === "ja" || saved === "ko" || saved === "zh-CN") return saved;
  return "zh-CN";
}

export function saveLocale(locale: AppLocale): void {
  localStorage.setItem(LOCALE_KEY, locale);
}

export const i18n = createI18n({
  legacy: false,
  locale: getSavedLocale(),
  fallbackLocale: "zh-CN",
  messages: {
    "zh-CN": zhCN,
    ja,
    ko,
  },
});
