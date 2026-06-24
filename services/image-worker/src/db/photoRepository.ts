import type { QueryResultRow } from "pg";

import type { PgPool } from "./pool.js";
import type { PhotoJob, ProcessedPhotoResult } from "../jobs/jobTypes.js";

type PhotoJobRow = QueryResultRow & {
  id: string;
  event_id: string;
  guest_session_id: string;
  local_photo_id: string;
  object_key: string;
  content_type: string;
  captured_at: Date;
  upload_status: PhotoJob["uploadStatus"];
  processing_attempts: number;
};

export class PhotoRepository {
  constructor(private readonly pool: PgPool) {}

  async claimJobs(batchSize: number, staleProcessingMinutes: number): Promise<PhotoJob[]> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");
      const result = await client.query<PhotoJobRow>(
        `
WITH candidates AS (
  SELECT id
  FROM photos
  WHERE (
    upload_status = 'uploaded'
    OR (
      upload_status = 'failed'
      AND next_processing_retry_at IS NOT NULL
      AND next_processing_retry_at <= now()
    )
    OR (
      upload_status = 'processing'
      AND processing_started_at < now() - ($2::int * interval '1 minute')
    )
  )
  ORDER BY uploaded_at ASC NULLS LAST, updated_at ASC
  LIMIT $1
  FOR UPDATE SKIP LOCKED
)
UPDATE photos AS p
SET upload_status = 'processing',
    processing_attempts = processing_attempts + 1,
    processing_started_at = now(),
    updated_at = now(),
    error_message = NULL
FROM candidates
WHERE p.id = candidates.id
RETURNING p.id,
          p.event_id,
          p.guest_session_id,
          p.local_photo_id,
          p.object_key,
          p.content_type,
          p.captured_at,
          p.upload_status,
          p.processing_attempts
`,
        [batchSize, staleProcessingMinutes],
      );
      await client.query("COMMIT");
      return result.rows.map(mapPhotoJob);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async markProcessed(photoId: string, result: ProcessedPhotoResult): Promise<void> {
    await this.pool.query(
      `
UPDATE photos
SET upload_status = 'processed',
    processed_object_key = $2,
    thumbnail_object_key = $3,
    processed_size_bytes = $4,
    thumbnail_size_bytes = $5,
    processed_at = now(),
    next_processing_retry_at = NULL,
    error_message = NULL,
    updated_at = now()
WHERE id = $1
`,
      [
        photoId,
        result.processedObjectKey,
        result.thumbnailObjectKey,
        result.processedSizeBytes,
        result.thumbnailSizeBytes,
      ],
    );
  }

  async markFailed(input: {
    photoId: string;
    errorMessage: string;
    nextRetryAt: Date | null;
    maxAttemptsReached: boolean;
  }): Promise<void> {
    await this.pool.query(
      `
UPDATE photos
SET upload_status = 'failed',
    error_message = $2,
    next_processing_retry_at = $3,
    updated_at = now()
WHERE id = $1
`,
      [
        input.photoId,
        input.maxAttemptsReached ? `${input.errorMessage}. Max processing attempts reached.` : input.errorMessage,
        input.nextRetryAt,
      ],
    );
  }
}

function mapPhotoJob(row: PhotoJobRow): PhotoJob {
  return {
    id: row.id,
    eventId: row.event_id,
    guestSessionId: row.guest_session_id,
    localPhotoId: row.local_photo_id,
    originalObjectKey: row.object_key,
    contentType: row.content_type,
    capturedAt: row.captured_at,
    uploadStatus: row.upload_status,
    processingAttempts: row.processing_attempts,
  };
}
