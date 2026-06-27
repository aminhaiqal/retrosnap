import { API_BASE_URL, ENABLE_MOCK_API, STORAGE_KEYS } from "@/lib/config";

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

function getEventConfigCacheKey(eventId: string) {
  return `${STORAGE_KEYS.eventConfigPrefix}${eventId}`;
}

function getCachedEventConfig(eventId: string) {
  try {
    const stored = localStorage.getItem(getEventConfigCacheKey(eventId));
    if (!stored) {
      return undefined;
    }

    const parsed = JSON.parse(stored) as EventConfig;
    if (parsed.eventId !== eventId || !parsed.eventName || !parsed.revealAt) {
      return undefined;
    }

    return {
      ...parsed,
      guestDisplayName: parsed.guestDisplayName || "Guest",
    };
  } catch {
    return undefined;
  }
}

function saveCachedEventConfig(config: EventConfig) {
  try {
    localStorage.setItem(getEventConfigCacheKey(config.eventId), JSON.stringify(config));
  } catch {
    // The camera can still work without this cache; IndexedDB remains the source for saved photos.
  }
}

export async function fetchPublicEventConfig(eventId: string): Promise<EventConfig> {
  if (ENABLE_MOCK_API) {
    const config = {
      ...MOCK_EVENT_CONFIG,
      eventId,
      guestCameraUrl: `/e/${encodeURIComponent(eventId)}`,
      albumUrl: `/e/${encodeURIComponent(eventId)}/album`,
      isActive: true,
    };

    saveCachedEventConfig(config);
    return config;
  }

  const cachedConfig = getCachedEventConfig(eventId);
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/api/v1/events/${encodeURIComponent(eventId)}/public`);
  } catch (error) {
    if (cachedConfig) {
      return cachedConfig;
    }

    throw error;
  }

  if (!response.ok) {
    if (response.status >= 500 && cachedConfig) {
      return cachedConfig;
    }

    throw new Error("Could not load event.");
  }

  let event: Omit<EventConfig, "guestDisplayName">;
  try {
    event = (await response.json()) as Omit<EventConfig, "guestDisplayName">;
  } catch (error) {
    if (cachedConfig) {
      return cachedConfig;
    }

    throw error;
  }

  const config = {
    ...event,
    guestDisplayName: "Guest",
  };

  saveCachedEventConfig(config);
  return config;
}
