export const MOCK_EVENT_CONFIG = {
  eventId: "demo-wedding-001",
  eventName: "Aisyah & Daniel",
  guestDisplayName: "Guest",
  maxFrames: 27,
  revealAt: "2026-12-01T10:00:00+08:00",
  filterName: "Malaysian Vintage",
} as const;

export type EventConfig = typeof MOCK_EVENT_CONFIG;
