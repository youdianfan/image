import {
  pipeline,
  env,
  type TranslationPipeline,
} from "@huggingface/transformers";

export type ModelStatus = "not-downloaded" | "downloading" | "ready" | "error";

const MODEL_ID = "Xenova/opus-mt-zh-en";

// Mirror sources for model download
export const MIRROR_OPTIONS = [
  { label: "HF 镜像 (中国大陆推荐)", value: "https://hf-mirror.com" },
  { label: "Hugging Face 官方", value: "https://huggingface.co" },
] as const;

const MIRROR_STORAGE_KEY = "ai-mirror-url";

export function getSavedMirrorUrl(): string {
  try {
    return localStorage.getItem(MIRROR_STORAGE_KEY) || MIRROR_OPTIONS[0].value;
  } catch {
    return MIRROR_OPTIONS[0].value;
  }
}

export function saveMirrorUrl(url: string): void {
  localStorage.setItem(MIRROR_STORAGE_KEY, url);
}
const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "shall",
  "should",
  "may",
  "might",
  "must",
  "can",
  "could",
  "of",
  "at",
  "by",
  "for",
  "with",
  "about",
  "to",
  "from",
  "up",
  "on",
  "in",
  "out",
  "and",
  "but",
  "or",
  "nor",
  "not",
  "so",
  "very",
  "just",
  "that",
  "this",
  "it",
]);

class AiTranslator {
  private translator: TranslationPipeline | null = null;
  private _status: ModelStatus = "not-downloaded";
  private _progress = 0;
  private _errorMessage = "";
  private loadingPromise: Promise<void> | null = null;

  get status(): ModelStatus {
    return this._status;
  }

  get progress(): number {
    return this._progress;
  }

  get errorMessage(): string {
    return this._errorMessage;
  }

  isReady(): boolean {
    return this._status === "ready" && this.translator !== null;
  }

  async loadModel(onProgress?: (progress: number) => void): Promise<void> {
    if (this._status === "ready") return;
    if (this.loadingPromise) return this.loadingPromise;

    this.loadingPromise = this._loadModelInternal(onProgress);
    try {
      await this.loadingPromise;
    } finally {
      this.loadingPromise = null;
    }
  }

  private async _loadModelInternal(
    onProgress?: (progress: number) => void,
  ): Promise<void> {
    this._status = "downloading";
    this._progress = 0;
    this._errorMessage = "";

    // Set mirror source before loading
    const mirrorUrl = getSavedMirrorUrl();
    env.remoteHost = mirrorUrl;
    env.allowLocalModels = false;

    try {
      this.translator = (await pipeline("translation", MODEL_ID, {
        progress_callback: (event: { status: string; progress?: number }) => {
          if (event.status === "progress" && event.progress != null) {
            this._progress = Math.round(event.progress);
            onProgress?.(this._progress);
          }
        },
      })) as TranslationPipeline;

      this._status = "ready";
      this._progress = 100;
      onProgress?.(100);
    } catch (err) {
      this._status = "error";
      this._errorMessage = err instanceof Error ? err.message : String(err);
      throw err;
    }
  }

  async translate(text: string): Promise<string> {
    if (!this.translator) {
      throw new Error("Model not loaded. Call loadModel() first.");
    }

    const result = await this.translator(text, {
      max_length: 128,
    });

    const output = Array.isArray(result)
      ? (result[0] as { translation_text: string }).translation_text
      : (result as unknown as { translation_text: string }).translation_text;

    return this.postProcess(output);
  }

  private postProcess(text: string): string {
    return text
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => !STOP_WORDS.has(word))
      .join(" ")
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }
}

// Singleton instance
export const aiTranslator = new AiTranslator();
