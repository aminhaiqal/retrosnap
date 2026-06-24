export type PhotoUploadStatus = "uploaded" | "processing" | "processed" | "failed" | "hidden";

export type PhotoJob = {
  id: string;
  eventId: string;
  guestSessionId: string;
  localPhotoId: string;
  originalObjectKey: string;
  contentType: string;
  capturedAt: Date;
  uploadStatus: PhotoUploadStatus;
  processingAttempts: number;
};

export type ProcessedPhotoResult = {
  processedObjectKey: string;
  thumbnailObjectKey: string;
  processedSizeBytes: number;
  thumbnailSizeBytes: number;
};
