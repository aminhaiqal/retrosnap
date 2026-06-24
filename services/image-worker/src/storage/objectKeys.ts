import type { PhotoJob } from "../jobs/jobTypes.js";

const safePartPattern = /^[A-Za-z0-9._-]+$/;

export function validateObjectKeyPart(value: string) {
  return safePartPattern.test(value);
}

export function processedObjectKey(job: PhotoJob) {
  validateJobParts(job);
  return `events/${job.eventId}/processed/${job.guestSessionId}/${job.localPhotoId}.jpg`;
}

export function thumbnailObjectKey(job: PhotoJob) {
  validateJobParts(job);
  return `events/${job.eventId}/thumbs/${job.guestSessionId}/${job.localPhotoId}.jpg`;
}

function validateJobParts(job: PhotoJob) {
  for (const [label, value] of [
    ["eventId", job.eventId],
    ["guestSessionId", job.guestSessionId],
    ["localPhotoId", job.localPhotoId],
  ] as const) {
    if (!validateObjectKeyPart(value)) {
      throw new Error(`Invalid ${label} for object key`);
    }
  }
}
