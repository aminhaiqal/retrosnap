export type UploadStatus = "queued" | "uploading" | "uploaded" | "failed";

export type QueuedPhoto = {
  localPhotoId: string;
  eventId: string;
  guestId: string;
  guestDisplayName: string;
  blob: Blob;
  width: number;
  height: number;
  sizeBytes: number;
  capturedAt: string;
  uploadStatus: UploadStatus;
  uploadAttempts: number;
  nextRetryAt?: string;
  lastUploadAttemptAt?: string;
  remotePhotoId?: string;
  remoteUrl?: string;
  errorMessage?: string;
};

export type QueueStats = {
  total: number;
  queued: number;
  uploading: number;
  uploaded: number;
  failed: number;
};

export type EnqueuePhotoInput = Omit<
  QueuedPhoto,
  "uploadStatus" | "uploadAttempts" | "nextRetryAt" | "lastUploadAttemptAt" | "remotePhotoId" | "remoteUrl" | "errorMessage"
> &
  Partial<
    Pick<
      QueuedPhoto,
      "uploadStatus" | "uploadAttempts" | "nextRetryAt" | "lastUploadAttemptAt" | "remotePhotoId" | "remoteUrl" | "errorMessage"
    >
  >;
