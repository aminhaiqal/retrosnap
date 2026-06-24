import type { WorkerConfig } from "../config.js";
import type { PhotoRepository } from "../db/photoRepository.js";
import { processImagePipeline } from "../filters/imagePipeline.js";
import type { WorkerLogger } from "../logger.js";
import { processedObjectKey, thumbnailObjectKey } from "../storage/objectKeys.js";
import type { ObjectStorage } from "../storage/storageTypes.js";
import type { SafeErrorMessage } from "../utils/errors.js";
import { toLogError } from "../utils/errors.js";
import { sizeBytes } from "../utils/bytes.js";
import type { PhotoJob } from "./jobTypes.js";
import { getNextProcessingRetryAt } from "./retryPolicy.js";

const processedCacheControl = "public, max-age=31536000, immutable";

export type ProcessPhotoJobDeps = {
  photoRepository: PhotoRepository;
  storage: ObjectStorage;
  config: WorkerConfig;
  logger: WorkerLogger;
};

export async function processPhotoJob(job: PhotoJob, deps: ProcessPhotoJobDeps) {
  deps.logger.info({ photoId: job.id, attempts: job.processingAttempts }, "photo processing started");

  let originalBuffer: Buffer;
  try {
    originalBuffer = await deps.storage.downloadObject(job.originalObjectKey);
  } catch (error) {
    await markJobFailed(job, deps, "Failed to download original object", error);
    return;
  }

  const processedKey = processedObjectKey(job);
  const thumbKey = thumbnailObjectKey(job);
  let processedBuffer: Buffer;
  let thumbnailBuffer: Buffer;

  try {
    const pipelineResult = await processImagePipeline(
      {
        originalBuffer,
        capturedAt: job.capturedAt,
      },
      deps.config.images,
    );
    processedBuffer = pipelineResult.processedBuffer;
    thumbnailBuffer = pipelineResult.thumbnailBuffer;
  } catch (error) {
    const message = error instanceof Error && error.message.includes("Unsupported") ? "Invalid image format" : "Image processing failed";
    await markJobFailed(job, deps, message, error);
    return;
  }

  try {
    await deps.storage.uploadObject({
      objectKey: processedKey,
      body: processedBuffer,
      contentType: "image/jpeg",
      cacheControl: processedCacheControl,
    });
    await deps.storage.uploadObject({
      objectKey: thumbKey,
      body: thumbnailBuffer,
      contentType: "image/jpeg",
      cacheControl: processedCacheControl,
    });
  } catch (error) {
    await markJobFailed(job, deps, "Failed to upload processed image", error);
    return;
  }

  try {
    await deps.photoRepository.markProcessed(job.id, {
      processedObjectKey: processedKey,
      thumbnailObjectKey: thumbKey,
      processedSizeBytes: sizeBytes(processedBuffer),
      thumbnailSizeBytes: sizeBytes(thumbnailBuffer),
    });
  } catch (error) {
    await markJobFailed(job, deps, "Failed to update processed metadata", error);
    return;
  }

  deps.logger.info(
    {
      photoId: job.id,
      processedObjectKey: processedKey,
      thumbnailObjectKey: thumbKey,
      processedSizeBytes: sizeBytes(processedBuffer),
      thumbnailSizeBytes: sizeBytes(thumbnailBuffer),
    },
    "photo processed successfully",
  );
}

async function markJobFailed(job: PhotoJob, deps: ProcessPhotoJobDeps, errorMessage: SafeErrorMessage, error: unknown) {
  const nextRetryAt = getNextProcessingRetryAt(job.processingAttempts, deps.config.worker.maxProcessingAttempts);
  const maxAttemptsReached = nextRetryAt === null;

  deps.logger.error(
    {
      photoId: job.id,
      attempts: job.processingAttempts,
      nextRetryAt: nextRetryAt?.toISOString(),
      maxAttemptsReached,
      error: toLogError(error),
    },
    "photo processing failed",
  );

  try {
    await deps.photoRepository.markFailed({
      photoId: job.id,
      errorMessage,
      nextRetryAt,
      maxAttemptsReached,
    });

    if (maxAttemptsReached) {
      deps.logger.warn({ photoId: job.id, attempts: job.processingAttempts }, "max attempts reached");
    } else {
      deps.logger.info({ photoId: job.id, nextRetryAt: nextRetryAt.toISOString() }, "retry scheduled");
    }
  } catch (markFailedError) {
    deps.logger.error(
      {
        photoId: job.id,
        error: toLogError(markFailedError),
      },
      "failed to update failed processing state",
    );
  }
}
