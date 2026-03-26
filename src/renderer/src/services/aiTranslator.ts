import {
  pipeline,
  env,
  type TranslationPipeline,
} from "@huggingface/transformers";

export type ModelStatus = "loading" | "ready" | "error";

const MODEL_ID = "Xenova/opus-mt-zh-en";

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
  private _status: ModelStatus = "loading";
  private _errorMessage = "";
  private loadingPromise: Promise<void> | null = null;

  get status(): ModelStatus {
    return this._status;
  }

  get errorMessage(): string {
    return this._errorMessage;
  }

  isReady(): boolean {
    return this._status === "ready" && this.translator !== null;
  }

  async loadModel(): Promise<void> {
    if (this._status === "ready") return;
    if (this.loadingPromise) return this.loadingPromise;

    this.loadingPromise = this._loadModelInternal();
    try {
      await this.loadingPromise;
    } finally {
      this.loadingPromise = null;
    }
  }

  private async _loadModelInternal(): Promise<void> {
    this._status = "loading";
    this._errorMessage = "";

    // Load from local-model:// protocol (served by Electron main process)
    env.remoteHost = "local-model://localhost";
    env.allowLocalModels = false;
    env.useBrowserCache = false;

    // Use locally bundled ONNX Runtime WASM files (from src/renderer/public/)
    if (env.backends?.onnx?.wasm) {
      env.backends.onnx.wasm.wasmPaths = import.meta.env.BASE_URL;
      env.backends.onnx.wasm.proxy = false;
    }

    try {
      this.translator = (await (pipeline as Function)(
        "translation",
        MODEL_ID,
        { quantized: true },
      )) as TranslationPipeline;

      this._status = "ready";
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

    const result = await (this.translator as Function)(text, {
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
