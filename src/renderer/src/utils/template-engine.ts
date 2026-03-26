import type { RenameRule } from "@/stores/rename.store";

export interface TemplateContext {
  original: string;
  extension: string;
  index: number;
  type: string;
  module: string;
  date: string;
  width?: number;
  height?: number;
}

const VARIABLE_REGEX = /\{(\w+)\}/g;

function formatIndex(position: number, rule: RenameRule): string {
  const value = rule.startIndex + position * rule.indexStep;
  return String(value).padStart(rule.indexDigits, "0");
}

function formatDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

export function buildContext(
  fileName: string,
  extension: string,
  position: number,
  rule: RenameRule,
): TemplateContext {
  const original = fileName.replace(/\.[^.]+$/, "");
  return {
    original,
    extension,
    index: position,
    type: rule.type,
    module: rule.module,
    date: formatDate(),
    width: undefined,
    height: undefined,
  };
}

export function applyTemplate(
  template: string,
  context: TemplateContext,
  rule: RenameRule,
): string {
  const effectiveTemplate = template.trim() || "{original}";

  const name = effectiveTemplate.replace(
    VARIABLE_REGEX,
    (_match, varName: string) => {
      switch (varName) {
        case "original":
          return context.original;
        case "index":
          return formatIndex(context.index, rule);
        case "type":
          return context.type || "";
        case "module":
          return context.module || "";
        case "date":
          return context.date;
        case "width":
          return context.width != null ? String(context.width) : "";
        case "height":
          return context.height != null ? String(context.height) : "";
        case "ai":
          return "";
        default:
          return "";
      }
    },
  );

  // Clean up multiple consecutive separators caused by empty variables
  const cleaned = name
    .replace(/[-_.]{2,}/g, (m) => m[0])
    .replace(/^[-_.]|[-_.]$/g, "");

  const finalName = cleaned || `unnamed-${formatIndex(context.index, rule)}`;

  return `${finalName}.${context.extension}`;
}
