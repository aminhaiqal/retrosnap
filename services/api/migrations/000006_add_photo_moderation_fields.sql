ALTER TABLE photos
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS hidden_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_photos_album_visible
ON photos(event_id, upload_status, is_hidden, processed_at);
