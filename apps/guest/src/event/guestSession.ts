import { STORAGE_KEYS } from "@/lib/config";
import { toIsoString } from "@/lib/time";

export type GuestSession = {
  guestId: string;
  guestDisplayName: string;
  createdAt: string;
  apiSessions?: Record<string, ApiGuestSession>;
};

export type ApiGuestSession = {
  eventId: string;
  guestSessionId: string;
  guestToken: string;
  guestDisplayName: string;
  createdAt: string;
};

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `guest_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function createGuestSession(displayName = "Guest"): GuestSession {
  return {
    guestId: createId(),
    guestDisplayName: displayName,
    createdAt: toIsoString(),
  };
}

export function getOrCreateGuestSession(displayName = "Guest") {
  const fallback = createGuestSession(displayName);

  try {
    const stored = localStorage.getItem(STORAGE_KEYS.guestSession);
    if (stored) {
      const parsed = JSON.parse(stored) as GuestSession;
      if (parsed.guestId && parsed.createdAt) {
        return parsed;
      }
    }

    localStorage.setItem(STORAGE_KEYS.guestSession, JSON.stringify(fallback));
    return fallback;
  } catch {
    return fallback;
  }
}

export function getApiGuestSession(eventId: string) {
  return getOrCreateGuestSession().apiSessions?.[eventId];
}

export function saveApiGuestSession(apiSession: ApiGuestSession) {
  const guestSession = getOrCreateGuestSession(apiSession.guestDisplayName);
  const nextSession: GuestSession = {
    ...guestSession,
    guestDisplayName: apiSession.guestDisplayName || guestSession.guestDisplayName,
    apiSessions: {
      ...guestSession.apiSessions,
      [apiSession.eventId]: apiSession,
    },
  };

  localStorage.setItem(STORAGE_KEYS.guestSession, JSON.stringify(nextSession));
  return nextSession;
}
