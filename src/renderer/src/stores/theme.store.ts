import { defineStore } from "pinia";
import { ref, watch } from "vue";

export type ThemeMode = "light" | "dark" | "system";

const THEME_KEY = "theme-settings";

interface ThemeSettings {
  mode: ThemeMode;
  primaryColor: string;
}

const DEFAULT_PRIMARY = "#409eff";

function loadSettings(): ThemeSettings {
  try {
    const data = localStorage.getItem(THEME_KEY);
    return data
      ? { mode: "system", primaryColor: DEFAULT_PRIMARY, ...JSON.parse(data) }
      : { mode: "system", primaryColor: DEFAULT_PRIMARY };
  } catch {
    return { mode: "system", primaryColor: DEFAULT_PRIMARY };
  }
}

function saveSettings(settings: ThemeSettings): void {
  localStorage.setItem(THEME_KEY, JSON.stringify(settings));
}

/** Convert hex to HSL components */
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) return { h: 0, s: 0, l };

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;

  return { h: h * 360, s, l };
}

function hslToHex(h: number, s: number, l: number): string {
  const hue2rgb = (p: number, q: number, t: number): number => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  if (s === 0) {
    const v = Math.round(l * 255);
    return `#${v.toString(16).padStart(2, "0").repeat(3)}`;
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = Math.round(hue2rgb(p, q, h / 360 + 1 / 3) * 255);
  const g = Math.round(hue2rgb(p, q, h / 360) * 255);
  const b = Math.round(hue2rgb(p, q, h / 360 - 1 / 3) * 255);

  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

/** Generate lighter/darker variants of the primary color */
function generatePrimaryShades(hex: string): Record<string, string> {
  const { h, s, l } = hexToHsl(hex);
  return {
    "--el-color-primary": hex,
    "--el-color-primary-light-1": hslToHex(h, s, l + (1 - l) * 0.1),
    "--el-color-primary-light-2": hslToHex(h, s, l + (1 - l) * 0.2),
    "--el-color-primary-light-3": hslToHex(h, s, l + (1 - l) * 0.3),
    "--el-color-primary-light-4": hslToHex(h, s, l + (1 - l) * 0.4),
    "--el-color-primary-light-5": hslToHex(h, s, l + (1 - l) * 0.5),
    "--el-color-primary-light-6": hslToHex(h, s, l + (1 - l) * 0.6),
    "--el-color-primary-light-7": hslToHex(h, s, l + (1 - l) * 0.7),
    "--el-color-primary-light-8": hslToHex(h, s, l + (1 - l) * 0.8),
    "--el-color-primary-light-9": hslToHex(h, s, l + (1 - l) * 0.9),
    "--el-color-primary-dark-2": hslToHex(h, s, l * 0.8),
  };
}

function generatePrimaryShadesDark(hex: string): Record<string, string> {
  const { h, s, l } = hexToHsl(hex);
  return {
    "--el-color-primary": hex,
    "--el-color-primary-light-1": hslToHex(h, s, l + (1 - l) * 0.1),
    "--el-color-primary-light-2": hslToHex(h, s, l + (1 - l) * 0.2),
    "--el-color-primary-light-3": hslToHex(h, s * 0.7, l * 0.4),
    "--el-color-primary-light-4": hslToHex(h, s * 0.6, l * 0.35),
    "--el-color-primary-light-5": hslToHex(h, s * 0.5, l * 0.3),
    "--el-color-primary-light-6": hslToHex(h, s * 0.4, l * 0.25),
    "--el-color-primary-light-7": hslToHex(h, s * 0.35, l * 0.22),
    "--el-color-primary-light-8": hslToHex(h, s * 0.3, l * 0.18),
    "--el-color-primary-light-9": hslToHex(h, s * 0.25, l * 0.15),
    "--el-color-primary-dark-2": hslToHex(h, s, Math.min(l * 1.2, 1)),
  };
}

export const useThemeStore = defineStore("theme", () => {
  const saved = loadSettings();
  const mode = ref<ThemeMode>(saved.mode);
  const primaryColor = ref(saved.primaryColor);

  function getResolvedDark(): boolean {
    if (mode.value === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return mode.value === "dark";
  }

  function applyTheme(): void {
    const isDark = getResolvedDark();
    const root = document.documentElement;

    // Toggle Element Plus dark mode class
    root.classList.toggle("dark", isDark);

    // Apply primary color shades
    const shades = isDark
      ? generatePrimaryShadesDark(primaryColor.value)
      : generatePrimaryShades(primaryColor.value);

    for (const [key, value] of Object.entries(shades)) {
      root.style.setProperty(key, value);
    }

    // Apply custom app-level CSS variables for primary color usage in components
    root.style.setProperty("--app-primary", primaryColor.value);
    const { h, s, l } = hexToHsl(primaryColor.value);
    root.style.setProperty(
      "--app-primary-light",
      isDark
        ? hslToHex(h, s * 0.4, l * 0.25)
        : hslToHex(h, s, l + (1 - l) * 0.85),
    );
  }

  function setMode(newMode: ThemeMode): void {
    mode.value = newMode;
    applyTheme();
  }

  function setPrimaryColor(color: string): void {
    primaryColor.value = color;
    applyTheme();
  }

  // Watch for system theme changes
  function init(): void {
    applyTheme();

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", () => {
      if (mode.value === "system") applyTheme();
    });
  }

  // Persist
  watch([mode, primaryColor], () => {
    saveSettings({ mode: mode.value, primaryColor: primaryColor.value });
  });

  return {
    mode,
    primaryColor,
    setMode,
    setPrimaryColor,
    init,
    getResolvedDark,
  };
});
