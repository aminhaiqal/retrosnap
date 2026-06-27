import { getDb, PHOTO_QUEUE_STORE } from "@/queue/indexedDb";
import type { EnqueuePhotoInput, QueuedPhoto, QueueStats, UploadStatus } from "@/queue/queueTypes";
import { RetroSnapError } from "@/lib/errors";
import { toIsoString } from "@/lib/time";

const STORAGE_SAFETY_BUFFER_BYTES = 10 * 1024 * 1024;

const EMPTY_STATS: QueueStats = {
  total: 0,
  queued: 0,
  uploading: 0,
  uploaded: 0,
  failed: 0,
};

function sortNewestFirst(photos: QueuedPhoto[]) {
  return photos.sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
}

function createStorageFullError(cause?: unknown) {
  return new RetroSnapError(
    "storage_failed",
    "This phone does not have enough space to save the photo. Free some space, then try again.",
    cause,
  );
}

function isQuotaExceededError(error: unknown) {
  return typeof DOMException !== "undefined" && error instanceof DOMException && error.name === "QuotaExceededError";
}

async function assertPhotoStorageAvailable(photoSizeBytes: number) {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) {
    return;
  }

  try {
    const { quota, usage = 0 } = await navigator.storage.estimate();
    if (!quota) {
      return;
    }

    const remainingBytes = quota - usage;
    if (remainingBytes < photoSizeBytes + STORAGE_SAFETY_BUFFER_BYTES) {
      throw createStorageFullError();
    }
  } catch (error) {
    if (error instanceof RetroSnapError) {
      throw error;
    }
  }
}

export async function enqueuePhoto(input: EnqueuePhotoInput) {
  const database = await getDb();
  const photo: QueuedPhoto = {
    ...input,
    uploadStatus: input.uploadStatus ?? "queued",
    uploadAttempts: input.uploadAttempts ?? 0,
  };

  await assertPhotoStorageAvailable(photo.blob.size || photo.sizeBytes);

  try {
    await database.put(PHOTO_QUEUE_STORE, photo);
  } catch (error) {
    if (isQuotaExceededError(error)) {
      throw createStorageFullError(error);
    }

    throw error;
  }

  return photo;
}

export async function getQueuedPhotos() {
  const database = await getDb();
  return sortNewestFirst(await database.getAll(PHOTO_QUEUE_STORE));
}

export async function getPhotosByStatus(status: UploadStatus) {
  const database = await getDb();
  const photos = await database.getAllFromIndex(PHOTO_QUEUE_STORE, "uploadStatus", status);
  return sortNewestFirst(photos);
}

export async function getQueueStats(): Promise<QueueStats> {
  const photos = await getQueuedPhotos();

  return photos.reduce<QueueStats>(
    (stats, photo) => {
      stats.total += 1;
      stats[photo.uploadStatus] += 1;
      return stats;
    },
    { ...EMPTY_STATS },
  );
}

export async function getLocalPhotoCountForEvent(eventId: string) {
  const database = await getDb();
  return database.countFromIndex(PHOTO_QUEUE_STORE, "eventId", eventId);
}

export async function getNextRetryDelayMs(now = new Date()) {
  const failedPhotos = await getPhotosByStatus("failed");

  if (!failedPhotos.length) {
    return undefined;
  }

  const nowMs = now.getTime();
  const nextRetryMs = failedPhotos.reduce<number | undefined>((earliest, photo) => {
    const retryMs = photo.nextRetryAt ? new Date(photo.nextRetryAt).getTime() : nowMs;
    const normalizedRetryMs = Number.isFinite(retryMs) ? retryMs : nowMs;

    return earliest === undefined ? normalizedRetryMs : Math.min(earliest, normalizedRetryMs);
  }, undefined);

  if (nextRetryMs === undefined) {
    return undefined;
  }

  return Math.max(0, nextRetryMs - nowMs);
}

async function updatePhoto(localPhotoId: string, update: (photo: QueuedPhoto) => QueuedPhoto) {
  const database = await getDb();
  const photo = await database.get(PHOTO_QUEUE_STORE, localPhotoId);

  if (!photo) {
    return undefined;
  }

  const updated = update(photo);
  await database.put(PHOTO_QUEUE_STORE, updated);
  return updated;
}

export async function markUploading(localPhotoId: string) {
  return updatePhoto(localPhotoId, (photo) => ({
    ...photo,
    uploadStatus: "uploading",
    errorMessage: undefined,
  }));
}

export async function markUploaded(localPhotoId: string, remotePhotoId: string, remoteUrl: string) {
  return updatePhoto(localPhotoId, (photo) => ({
    ...photo,
    uploadStatus: "uploaded",
    remotePhotoId,
    remoteUrl,
    nextRetryAt: undefined,
    errorMessage: undefined,
  }));
}

export async function markFailed(localPhotoId: string, errorMessage: string, nextRetryAt: string) {
  return updatePhoto(localPhotoId, (photo) => ({
    ...photo,
    uploadStatus: "failed",
    errorMessage,
    nextRetryAt,
  }));
}

export async function incrementAttempt(localPhotoId: string) {
  return updatePhoto(localPhotoId, (photo) => ({
    ...photo,
    uploadAttempts: photo.uploadAttempts + 1,
    lastUploadAttemptAt: toIsoString(),
  }));
}

export async function retryPhotoNow(localPhotoId: string) {
  return updatePhoto(localPhotoId, (photo) => ({
    ...photo,
    uploadStatus: "queued",
    nextRetryAt: undefined,
    errorMessage: undefined,
  }));
}

export async function requeueInterruptedUploads() {
  const uploading = await getPhotosByStatus("uploading");
  if (!uploading.length) {
    return 0;
  }

  const database = await getDb();
  const transaction = database.transaction(PHOTO_QUEUE_STORE, "readwrite");

  await Promise.all(
    uploading.map((photo) =>
      transaction.store.put({
        ...photo,
        uploadStatus: "queued",
        nextRetryAt: undefined,
        errorMessage: undefined,
      }),
    ),
  );
  await transaction.done;

  return uploading.length;
}

export async function deleteLocalPhoto(localPhotoId: string) {
  const database = await getDb();
  await database.delete(PHOTO_QUEUE_STORE, localPhotoId);
}

export async function clearUploadedPhotos() {
  const uploaded = await getPhotosByStatus("uploaded");
  const database = await getDb();
  const transaction = database.transaction(PHOTO_QUEUE_STORE, "readwrite");

  await Promise.all(uploaded.map((photo) => transaction.store.delete(photo.localPhotoId)));
  await transaction.done;
}
