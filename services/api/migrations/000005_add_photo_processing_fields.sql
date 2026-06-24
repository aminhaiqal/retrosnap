ALTER TABLE photos
ADD COLUMN IF NOT EXISTS processed_object_key TEXT,
ADD COLUMN IF NOT EXISTS thumbnail_object_key TEXT,
ADD COLUMN IF NOT EXISTS processed_size_bytes BIGINT,
ADD COLUMN IF NOT EXISTS thumbnail_size_bytes BIGINT,
ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS processing_attempts INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS next_processing_retry_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_photos_processing_pickup
ON photos(upload_status, next_processing_retry_at, uploaded_at);

CREATE INDEX IF NOT EXISTS idx_photos_processed_at
ON photos(processed_at);
