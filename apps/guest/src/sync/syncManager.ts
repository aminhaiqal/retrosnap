import { getNextRetryAt } from "@/queue/retryPolicy";
import {
  getNextRetryDelayMs,
  getQueueStats,
  getQueuedPhotos,
  incrementAttempt,
  markFailed,
  markUploaded,
  markUploading,
  requeueInterruptedUploads,
} from "@/queue/photoQueue";
import type { QueueStats, QueuedPhoto } from "@/queue/queueTypes";
import { buildUploadStatus, type UploadUiStatus } from "@/sync/uploadStatus";
import { isOnline, subscribeToNetworkStatus } from "@/sync/networkStatus";
import { uploadPhoto } from "@/sync/uploadPhoto";
import { getErrorMessage } from "@/lib/errors";
import { toIsoString } from "@/lib/time";

type SyncSubscriber = (status: UploadUiStatus) => void;

const EMPTY_STATS: QueueStats = {
  total: 0,
  queued: 0,
  uploading: 0,
  uploaded: 0,
  failed: 0,
};

function isRetryDue(photo: QueuedPhoto, now = new Date()) {
  if (photo.uploadStatus === "queued") {
    return true;
  }

  if (photo.uploadStatus !== "failed") {
    return false;
  }

  return !photo.nextRetryAt || new Date(photo.nextRetryAt) <= now;
}

class SyncManager {
  private initialized = false;
  private syncing = false;
  private stats: QueueStats = EMPTY_STATS;
  private lastSyncAt: string | undefined;
  private subscribers = new Set<SyncSubscriber>();
  private unsubscribeNetwork?: () => void;
  private retryTimeoutId?: number;

  getStatus(): UploadUiStatus {
    return buildUploadStatus(this.stats, isOnline(), this.syncing, this.lastSyncAt);
  }

  subscribe(callback: SyncSubscriber) {
    this.subscribers.add(callback);
    callback(this.getStatus());

    return () => {
      this.subscribers.delete(callback);
    };
  }

  async init() {
    if (this.initialized) {
      return;
    }

    this.initialized = true;
    this.unsubscribeNetwork = subscribeToNetworkStatus((online) => {
      this.notify();

      if (online) {
        void this.triggerSync("online");
      }
    });

    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    await requeueInterruptedUploads();
    await this.refreshStats();
    void this.triggerSync("load");
  }

  dispose() {
    this.unsubscribeNetwork?.();
    this.clearRetryTimer();
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    this.initialized = false;
  }

  async refreshStats() {
    this.stats = await getQueueStats();
    this.notify();
    await this.scheduleNextRetry();
  }

  async triggerSync(_reason = "manual") {
    if (this.syncing) {
      return;
    }

    await this.refreshStats();

    if (!isOnline()) {
      return;
    }

    this.syncing = true;
    this.notify();

    try {
      const photos = await getQueuedPhotos();
      const candidates = photos
        .filter((photo) => isRetryDue(photo))
        .sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));

      for (const photo of candidates) {
        if (!isOnline()) {
          break;
        }

        const attemptedPhoto = (await incrementAttempt(photo.localPhotoId)) ?? photo;
        await markUploading(photo.localPhotoId);
        await this.refreshStats();

        try {
          const result = await uploadPhoto(attemptedPhoto);
          await markUploaded(photo.localPhotoId, result.remotePhotoId, result.remoteUrl);
        } catch (error) {
          const nextRetryAt = getNextRetryAt(attemptedPhoto.uploadAttempts || 1);
          await markFailed(photo.localPhotoId, getErrorMessage(error), nextRetryAt);
        }

        await this.refreshStats();
      }

      this.lastSyncAt = toIsoString();
    } finally {
      this.syncing = false;
      await this.refreshStats();
    }
  }

  private notify() {
    const status = this.getStatus();
    this.subscribers.forEach((callback) => callback(status));
  }

  private clearRetryTimer() {
    if (this.retryTimeoutId !== undefined) {
      if (typeof window !== "undefined") {
        window.clearTimeout(this.retryTimeoutId);
      }
      this.retryTimeoutId = undefined;
    }
  }

  private async scheduleNextRetry() {
    this.clearRetryTimer();

    if (typeof window === "undefined" || this.syncing || !isOnline()) {
      return;
    }

    const retryDelayMs = await getNextRetryDelayMs();
    if (retryDelayMs === undefined) {
      return;
    }

    this.retryTimeoutId = window.setTimeout(() => {
      this.retryTimeoutId = undefined;
      void this.triggerSync("retry-timer");
    }, retryDelayMs);
  }

  private handleVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      void this.triggerSync("visible");
    }
  };
}

export const syncManager = new SyncManager();
