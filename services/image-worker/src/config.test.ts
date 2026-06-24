import { describe, expect, it } from "vitest";

import { loadConfig } from "./config.js";

const baseEnv = {
  DATABASE_URL: "postgres://retrosnap:retrosnap@localhost:5432/retrosnap?sslmode=disable",
  R2_ENDPOINT: "https://example.r2.cloudflarestorage.com",
  R2_BUCKET: "retrosnap-photos",
  R2_ACCESS_KEY_ID: "key",
  R2_SECRET_ACCESS_KEY: "secret",
};

describe("config parsing", () => {
  it("parses numeric and boolean values", () => {
    const config = loadConfig({
      ...baseEnv,
      WORKER_CONCURRENCY: "2",
      WORKER_BATCH_SIZE: "7",
      PROCESSED_JPEG_QUALITY: "83",
      ENABLE_TIMESTAMP_OVERLAY: "false",
    });

    expect(config.worker.concurrency).toBe(2);
    expect(config.worker.batchSize).toBe(7);
    expect(config.images.processedJpegQuality).toBe(83);
    expect(config.images.enableTimestampOverlay).toBe(false);
  });
});
