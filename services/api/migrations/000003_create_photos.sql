CREATE TABLE IF NOT EXISTS photos (
  id UUID PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  guest_session_id UUID NOT NULL REFERENCES guest_sessions(id) ON DELETE CASCADE,
  local_photo_id TEXT NOT NULL,
  object_key TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL,
  upload_status TEXT NOT NULL,
  etag TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  uploaded_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, local_photo_id)
);

CREATE INDEX IF NOT EXISTS idx_photos_event_id ON photos(event_id);
CREATE INDEX IF NOT EXISTS idx_photos_guest_session_id ON photos(guest_session_id);
CREATE INDEX IF NOT EXISTS idx_photos_upload_status ON photos(upload_status);
CREATE INDEX IF NOT EXISTS idx_photos_captured_at ON photos(captured_at);
