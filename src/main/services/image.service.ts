import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import { BrowserWindow } from "electron";

export interface CompressOptions {
  quality: number;
  scale: number;
  stripExif: boolean;
  outputFormat: "original" | "jpg" | "webp" | "png";
  outputDirectory: string;
}

export interface CompressResult {
  success: number;
  failed: number;
  totalOriginalSize: number;
  totalCompressedSize: number;
  errors: Array<{ source: string; error: string }>;
}

export interface CompressFileResult {
  source: string;
  target: string;
  originalSize: number;
  compressedSize: number;
}

function getOutputExtension(
  originalExt: string,
  outputFormat: CompressOptions["outputFormat"],
): string {
  if (outputFormat === "original") return originalExt;
  return outputFormat === "jpg" ? "jpg" : outputFormat;
}

export class ImageService {
  async compressImages(
    filePaths: string[],
    options: CompressOptions,
    window: BrowserWindow,
  ): Promise<CompressResult> {
    const result: CompressResult = {
      success: 0,
      failed: 0,
      totalOriginalSize: 0,
      totalCompressedSize: 0,
      errors: [],
    };

    // Ensure output directory exists
    if (options.outputDirectory) {
      await fs.mkdir(options.outputDirectory, { recursive: true });
    }

    const total = filePaths.length;

    for (let i = 0; i < filePaths.length; i++) {
      const filePath = filePaths[i];

      try {
        const fileResult = await this.compressSingleFile(filePath, options);

        result.success++;
        result.totalOriginalSize += fileResult.originalSize;
        result.totalCompressedSize += fileResult.compressedSize;

        this.sendProgress(window, {
          completed: i + 1,
          total,
          filePath,
          originalSize: fileResult.originalSize,
          compressedSize: fileResult.compressedSize,
          status: "done",
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        result.failed++;
        result.errors.push({ source: filePath, error: errorMsg });

        this.sendProgress(window, {
          completed: i + 1,
          total,
          filePath,
          originalSize: 0,
          compressedSize: 0,
          status: "error",
          error: errorMsg,
        });
      }
    }

    return result;
  }

  private async compressSingleFile(
    filePath: string,
    options: CompressOptions,
  ): Promise<CompressFileResult> {
    const stat = await fs.stat(filePath);
    const originalSize = stat.size;
    const originalExt = path.extname(filePath).slice(1).toLowerCase();
    const outputExt = getOutputExtension(originalExt, options.outputFormat);

    // Build output path
    const baseName = path.basename(filePath, path.extname(filePath));
    const outputFileName = `${baseName}.${outputExt}`;
    const outputDir = options.outputDirectory || path.dirname(filePath);
    const outputPath = path.join(outputDir, outputFileName);

    // Build Sharp pipeline
    let pipeline = sharp(filePath);

    // Apply EXIF rotation then strip metadata
    if (options.stripExif) {
      pipeline = pipeline.rotate(); // Auto-rotate based on EXIF, then strip
    }

    // Resize if scale is not 100%
    if (options.scale !== 100) {
      const metadata = await sharp(filePath).metadata();
      if (metadata.width) {
        const newWidth = Math.round(metadata.width * (options.scale / 100));
        pipeline = pipeline.resize(newWidth);
      }
    }

    // Output format and quality
    const quality = options.quality;
    switch (outputExt) {
      case "jpg":
      case "jpeg":
        pipeline = pipeline.jpeg({ quality, mozjpeg: true });
        break;
      case "webp":
        pipeline = pipeline.webp({ quality });
        break;
      case "png":
        pipeline = pipeline.png({
          compressionLevel: Math.round(((100 - quality) / 100) * 9),
        });
        break;
      default:
        // For other formats, convert to jpeg as fallback
        pipeline = pipeline.jpeg({ quality });
        break;
    }

    // Write to buffer then to file (to get compressed size)
    const buffer = await pipeline.toBuffer();
    await fs.writeFile(outputPath, buffer);

    return {
      source: filePath,
      target: outputPath,
      originalSize,
      compressedSize: buffer.length,
    };
  }

  async getImageMetadata(
    filePath: string,
  ): Promise<{ width: number; height: number; format: string }> {
    const metadata = await sharp(filePath).metadata();
    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
      format: metadata.format || "unknown",
    };
  }

  private sendProgress(
    window: BrowserWindow,
    data: {
      completed: number;
      total: number;
      filePath: string;
      originalSize: number;
      compressedSize: number;
      status: string;
      error?: string;
    },
  ): void {
    try {
      window.webContents.send("task:progress", data);
    } catch {
      // Window may be closed
    }
  }
}

export const imageService = new ImageService();
