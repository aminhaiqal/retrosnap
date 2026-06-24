INSERT INTO events (
  id,
  event_name,
  max_frames,
  reveal_at,
  filter_name,
  is_active
)
VALUES (
  'demo-wedding-001',
  'Aisyah & Daniel',
  27,
  '2026-12-01T10:00:00+08:00',
  'Malaysian Vintage',
  true
)
ON CONFLICT (id) DO NOTHING;
