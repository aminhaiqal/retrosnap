import type { QueuedPhoto } from "@/queue/queueTypes";
import { isOnline } from "@/sync/networkStatus";
import { RetroSnapError } from "@/lib/errors";

export type UploadPhotoResult = {
  remotePhotoId: string;
  remoteUrl: string;
};

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function createRemoteId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `remote_${crypto.randomUUID()}`;
  }

  return `remote_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export async function uploadPhoto(photo: QueuedPhoto): Promise<UploadPhotoResult> {
  const uploadDurationMs = 500 + Math.random() * 1000;
  await wait(uploadDurationMs);

  if (!isOnline()) {
    throw new RetroSnapError("upload_offline", "Device is offline. The photo will retry automatically.");
  }

  if (Math.random() < 0.1) {
    throw new RetroSnapError("upload_failed", "Mock upload failed. The photo will retry soon.");
  }

  const remotePhotoId = createRemoteId();

  return {
    remotePhotoId,
    remoteUrl: `https://storage.example.com/demo/${photo.eventId}/${remotePhotoId}.jpg`,
  };
}
