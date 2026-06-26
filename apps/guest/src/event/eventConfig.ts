import { API_BASE_URL, ENABLE_MOCK_API } from "@/lib/config";

export const MOCK_EVENT_CONFIG = {
  eventId: "demo-wedding-001",
  eventName: "Aisyah & Daniel",
  guestDisplayName: "Guest",
  maxFrames: 27,
  revealAt: "2026-12-01T10:00:00+08:00",
  filterName: "Malaysian Vintage",
} as const;

export type EventConfig = {
  eventId: string;
  eventName: string;
  guestDisplayName: string;
  maxFrames: number;
  revealAt: string;
  filterName: string;
  isActive?: boolean;
  guestCameraUrl?: string;
  albumUrl?: string;
};

export async function fetchPublicEventConfig(eventId: string): Promise<EventConfig> {
  if (ENABLE_MOCK_API) {
    return {
      ...MOCK_EVENT_CONFIG,
      eventId,
      guestCameraUrl: `/e/${encodeURIComponent(eventId)}`,
      albumUrl: `/e/${encodeURIComponent(eventId)}/album`,
      isActive: true,
    };
  }

  const response = await fetch(`${API_BASE_URL}/api/v1/events/${encodeURIComponent(eventId)}/public`);
  if (!response.ok) {
    throw new Error("Could not load event.");
  }

  const event = (await response.json()) as Omit<EventConfig, "guestDisplayName">;
  return {
    ...event,
    guestDisplayName: "Guest",
  };
}
