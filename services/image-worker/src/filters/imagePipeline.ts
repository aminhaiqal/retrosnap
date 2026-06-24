import sharp from "sharp";

import type { WorkerConfig } from "../config.js";
import { applyMalaysianVintage } from "./malaysianVintage.js";
import { addTimestampOverlay } from "./timestampOverlay.js";
import { generateThumbnail } from "./thumbnail.js";

export type ImagePipelineInput = {
  originalBuffer: Buffer;
  capturedAt: Date;
};

export type ImagePipelineResult = {
  processedBuffer: Buffer;
  thumbnailBuffer: Buffer;
  processedWidth: number;
  processedHeight: number;
};

export async function processImagePipeline(input: ImagePipelineInput, config: WorkerConfig["images"]): Promise<ImagePipelineResult> {
  await validateProcessableImage(input.originalBuffer);

  let processedBuffer = await applyMalaysianVintage(input.originalBuffer, {
    maxWidth: config.processedMaxWidth,
    jpegQuality: config.processedJpegQuality,
  });

  if (config.enableTimestampOverlay) {
    processedBuffer = await addTimestampOverlay(processedBuffer, {
      capturedAt: input.capturedAt,
      timezone: config.timezone,
    });
  }

  const thumbnailBuffer = await generateThumbnail(processedBuffer, {
    maxWidth: config.thumbnailMaxWidth,
    jpegQuality: config.thumbnailJpegQuality,
  });

  const metadata = await sharp(processedBuffer).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error("Processed image dimensions are unavailable");
  }

  return {
    processedBuffer,
    thumbnailBuffer,
    processedWidth: metadata.width,
    processedHeight: metadata.height,
  };
}

async function validateProcessableImage(buffer: Buffer) {
  const metadata = await sharp(buffer, { failOn: "none" }).metadata();
  if (!metadata.format || !["jpeg", "jpg", "png", "webp", "heif", "tiff"].includes(metadata.format)) {
    throw new Error("Unsupported or invalid image format");
  }
}
