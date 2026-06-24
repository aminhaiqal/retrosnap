CREATE TABLE IF NOT EXISTS guest_sessions (
  id UUID PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  guest_display_name TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  user_agent TEXT,
  client_generated_guest_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_guest_sessions_event_id ON guest_sessions(event_id);
CREATE INDEX IF NOT EXISTS idx_guest_sessions_token_hash ON guest_sessions(token_hash);
