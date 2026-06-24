import { getDb, PHOTO_QUEUE_STORE } from "@/queue/indexedDb";
import type { EnqueuePhotoInput, QueuedPhoto, QueueStats, UploadStatus } from "@/queue/queueTypes";
import { toIsoString } from "@/lib/time";

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

export async function enqueuePhoto(input: EnqueuePhotoInput) {
  const database = await getDb();
  const photo: QueuedPhoto = {
    ...input,
    uploadStatus: input.uploadStatus ?? "queued",
    uploadAttempts: input.uploadAttempts ?? 0,
  };

  await database.put(PHOTO_QUEUE_STORE, photo);
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
