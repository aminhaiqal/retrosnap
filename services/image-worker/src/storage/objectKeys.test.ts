import { describe, expect, it } from "vitest";

import type { PhotoJob } from "../jobs/jobTypes.js";
import { processedObjectKey, thumbnailObjectKey } from "./objectKeys.js";

const job: PhotoJob = {
  id: "photo-id",
  eventId: "demo-wedding-001",
  guestSessionId: "55c7ca22-a812-4377-b421-8c9c7b099a1a",
  localPhotoId: "local_123",
  originalObjectKey: "events/demo-wedding-001/originals/55c7ca22-a812-4377-b421-8c9c7b099a1a/local_123.jpg",
  contentType: "image/jpeg",
  capturedAt: new Date("2026-06-25T20:45:00+08:00"),
  uploadStatus: "processing",
  processingAttempts: 1,
};

describe("object key generation", () => {
  it("creates processed and thumbnail keys from trusted job fields", () => {
    expect(processedObjectKey(job)).toBe(
      "events/demo-wedding-001/processed/55c7ca22-a812-4377-b421-8c9c7b099a1a/local_123.jpg",
    );
    expect(thumbnailObjectKey(job)).toBe(
      "events/demo-wedding-001/thumbs/55c7ca22-a812-4377-b421-8c9c7b099a1a/local_123.jpg",
    );
  });
});
