import { aiTranslator } from "@/services/aiTranslator";

export type NameFormat =
  | "camelCase"
  | "PascalCase"
  | "snake_case"
  | "SCREAMING_CASE"
  | "kebab-case"
  | "package.case";

export const ALL_FORMATS: {
  format: NameFormat;
  label: string;
  desc: string;
  example: string;
}[] = [
  { format: "camelCase", label: "camelCase", desc: "小驼峰命名", example: "whiteCat" },
  { format: "PascalCase", label: "PascalCase", desc: "大驼峰命名", example: "WhiteCat" },
  { format: "snake_case", label: "snake_case", desc: "下划线命名", example: "white_cat" },
  { format: "SCREAMING_CASE", label: "SCREAMING_CASE", desc: "大写下划线", example: "WHITE_CAT" },
  { format: "kebab-case", label: "kebab-case", desc: "短横线命名", example: "white-cat" },
  { format: "package.case", label: "package.case", desc: "点分命名", example: "white.cat" },
];

// Check if a character is Chinese
function isChinese(char: string): boolean {
  const code = char.charCodeAt(0);
  return code >= 0x4e00 && code <= 0x9fff;
}

// Check if input contains any Chinese characters
export function containsChinese(input: string): boolean {
  for (const char of input) {
    if (isChinese(char)) return true;
  }
  return false;
}

/**
 * Split a Latin-only segment by camelCase boundaries.
 */
function splitLatinSegment(segment: string): string[] {
  const parts = segment
    .replace(/([a-z])([A-Z])/g, "$1\0$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1\0$2")
    .replace(/([a-zA-Z])(\d)/g, "$1\0$2")
    .replace(/(\d)([a-zA-Z])/g, "$1\0$2")
    .split("\0");

  return parts.filter((p) => p.length > 0);
}

/**
 * Tokenize an English/Latin string into words.
 * Handles: camelCase, PascalCase, snake_case, kebab-case, package.case, spaces.
 */
export function tokenize(input: string): string[] {
  const trimmed = input.trim();
  if (!trimmed) return [];

  const words: string[] = [];
  let current = "";

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];

    if (/[a-zA-Z0-9]/.test(char)) {
      current += char;
    } else if (isChinese(char)) {
      // Chinese characters without AI: keep as-is in a word
      if (current) {
        words.push(...splitLatinSegment(current));
        current = "";
      }
      words.push(char);
    } else {
      // Separator
      if (current) {
        words.push(...splitLatinSegment(current));
        current = "";
      }
    }
  }

  if (current) {
    words.push(...splitLatinSegment(current));
  }

  return words.filter((w) => w.length > 0).map((w) => w.toLowerCase());
}

function capitalize(word: string): string {
  if (!word) return word;
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/**
 * Convert tokenized words to the specified naming format.
 */
function wordsToFormat(words: string[], format: NameFormat): string {
  if (words.length === 0) return "";

  switch (format) {
    case "camelCase":
      return words
        .map((w, i) => (i === 0 ? w.toLowerCase() : capitalize(w)))
        .join("");
    case "PascalCase":
      return words.map(capitalize).join("");
    case "snake_case":
      return words.map((w) => w.toLowerCase()).join("_");
    case "SCREAMING_CASE":
      return words.map((w) => w.toUpperCase()).join("_");
    case "kebab-case":
      return words.map((w) => w.toLowerCase()).join("-");
    case "package.case":
      return words.map((w) => w.toLowerCase()).join(".");
    default:
      return words.join(" ");
  }
}

/**
 * Synchronous convert — works for pure English/Latin input.
 * Chinese characters pass through as-is.
 */
export function convertName(input: string, format: NameFormat): string {
  const words = tokenize(input);
  return wordsToFormat(words, format);
}

/**
 * Async convert — translates Chinese to English first using AI, then converts.
 * Falls back to sync if AI not available.
 */
export async function convertNameAsync(
  input: string,
  format: NameFormat,
): Promise<string> {
  if (!containsChinese(input)) {
    return convertName(input, format);
  }

  // AI translation available
  if (aiTranslator.isReady()) {
    try {
      const translated = await aiTranslator.translate(input);
      return convertName(translated, format);
    } catch {
      // Fallback to sync
      return convertName(input, format);
    }
  }

  // No AI: sync fallback
  return convertName(input, format);
}

/**
 * Convert all formats at once (sync).
 */
export function convertAll(input: string): Record<NameFormat, string> {
  return {
    camelCase: convertName(input, "camelCase"),
    PascalCase: convertName(input, "PascalCase"),
    snake_case: convertName(input, "snake_case"),
    SCREAMING_CASE: convertName(input, "SCREAMING_CASE"),
    "kebab-case": convertName(input, "kebab-case"),
    "package.case": convertName(input, "package.case"),
  };
}

/**
 * Convert all formats at once (async with AI translation).
 */
export async function convertAllAsync(
  input: string,
): Promise<Record<NameFormat, string>> {
  if (!containsChinese(input) || !aiTranslator.isReady()) {
    return convertAll(input);
  }

  try {
    const translated = await aiTranslator.translate(input);
    return convertAll(translated);
  } catch {
    return convertAll(input);
  }
}

/**
 * Batch convert multiple lines.
 */
export function batchConvert(lines: string[], format: NameFormat): string[] {
  return lines.map((line) => (line.trim() ? convertName(line, format) : ""));
}
