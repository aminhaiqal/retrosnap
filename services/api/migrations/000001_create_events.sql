CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  event_name TEXT NOT NULL,
  max_frames INTEGER NOT NULL DEFAULT 27,
  reveal_at TIMESTAMPTZ NOT NULL,
  filter_name TEXT NOT NULL DEFAULT 'Malaysian Vintage',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
