import sharp from "sharp";
import { describe, expect, it } from "vitest";

import type { WorkerConfig } from "../config.js";
import { processImagePipeline } from "./imagePipeline.js";

const imageConfig: WorkerConfig["images"] = {
  processedMaxWidth: 1800,
  processedJpegQuality: 84,
  thumbnailMaxWidth: 480,
  thumbnailJpegQuality: 76,
  enableTimestampOverlay: false,
  timezone: "Asia/Kuala_Lumpur",
};

describe("image pipeline", () => {
  it("returns JPEG buffers for a generated image", async () => {
    const original = await sharp({
      create: {
        width: 900,
        height: 600,
        channels: 3,
        background: "#c79b73",
      },
    })
      .jpeg()
      .toBuffer();

    const result = await processImagePipeline(
      {
        originalBuffer: original,
        capturedAt: new Date("2026-06-25T12:45:00.000Z"),
      },
      imageConfig,
    );

    const processedMetadata = await sharp(result.processedBuffer).metadata();
    const thumbnailMetadata = await sharp(result.thumbnailBuffer).metadata();

    expect(processedMetadata.format).toBe("jpeg");
    expect(thumbnailMetadata.format).toBe("jpeg");
    expect(thumbnailMetadata.width).toBeLessThanOrEqual(480);
  });
});
