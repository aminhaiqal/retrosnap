import type { QueuedPhoto } from "@/queue/queueTypes";
import { getApiGuestSession, saveApiGuestSession, type ApiGuestSession } from "@/event/guestSession";
import { API_BASE_URL, ENABLE_MOCK_API } from "@/lib/config";
import { isOnline } from "@/sync/networkStatus";
import { RetroSnapError } from "@/lib/errors";

export type UploadPhotoResult = {
  remotePhotoId: string;
  remoteUrl: string;
};

type ApiErrorResponse = {
  error?: {
    code?: string;
    message?: string;
  };
};

type CreateGuestSessionResponse = {
  guestSessionId: string;
  guestToken: string;
  eventId: string;
  guestDisplayName: string;
  createdAt: string;
};

type PresignResponse = {
  photoId: string;
  localPhotoId: string;
  objectKey: string;
  uploadUrl: string;
  method: "PUT";
  expiresInSeconds: number;
  headers: Record<string, string>;
};

type ConfirmResponse = {
  photoId: string;
  localPhotoId: string;
  eventId: string;
  uploadStatus: "uploaded";
  objectKey: string;
  uploadedAt?: string;
};

async function readApiError(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as ApiErrorResponse;
    return body.error?.message || fallback;
  } catch {
    return fallback;
  }
}

async function apiFetch<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  if (!response.ok) {
    const message = await readApiError(response, "RetroSnap API request failed.");
    throw new RetroSnapError("upload_failed", message);
  }

  return (await response.json()) as T;
}

async function ensureGuestSession(photo: QueuedPhoto) {
  const existingSession = getApiGuestSession(photo.eventId);
  if (existingSession) {
    return existingSession;
  }

  const created = await apiFetch<CreateGuestSessionResponse>(`/api/v1/events/${encodeURIComponent(photo.eventId)}/guest-sessions`, {
    method: "POST",
    body: JSON.stringify({
      guestDisplayName: photo.guestDisplayName || "Guest",
      clientGeneratedGuestId: photo.guestId,
    }),
  });

  const apiSession: ApiGuestSession = {
    eventId: created.eventId,
    guestSessionId: created.guestSessionId,
    guestToken: created.guestToken,
    guestDisplayName: created.guestDisplayName,
    createdAt: created.createdAt,
  };

  saveApiGuestSession(apiSession);
  return apiSession;
}

function authorizationHeader(session: ApiGuestSession) {
  return {
    Authorization: `Bearer ${session.guestToken}`,
  };
}

function toUploadHeaders(headers: Record<string, string>) {
  const uploadHeaders = new Headers();

  Object.entries(headers).forEach(([key, value]) => {
    const normalizedKey = key.toLowerCase();
    if (normalizedKey === "host" || normalizedKey === "content-length") {
      return;
    }

    uploadHeaders.set(key, value);
  });

  if (!uploadHeaders.has("Content-Type")) {
    uploadHeaders.set("Content-Type", "image/jpeg");
  }

  return uploadHeaders;
}

async function requestPresignedUpload(photo: QueuedPhoto, session: ApiGuestSession) {
  return apiFetch<PresignResponse>("/api/v1/uploads/presign", {
    method: "POST",
    headers: authorizationHeader(session),
    body: JSON.stringify({
      eventId: photo.eventId,
      guestSessionId: session.guestSessionId,
      localPhotoId: photo.localPhotoId,
      contentType: "image/jpeg",
      sizeBytes: photo.sizeBytes,
      width: photo.width,
      height: photo.height,
      capturedAt: photo.capturedAt,
    }),
  });
}

async function putBlobToStorage(photo: QueuedPhoto, presign: PresignResponse) {
  const response = await fetch(presign.uploadUrl, {
    method: presign.method,
    headers: toUploadHeaders(presign.headers),
    body: photo.blob,
  });

  if (!response.ok) {
    throw new RetroSnapError("upload_failed", `Storage upload failed with status ${response.status}.`);
  }

  return response.headers.get("ETag") ?? response.headers.get("etag") ?? undefined;
}

async function confirmUpload(photo: QueuedPhoto, session: ApiGuestSession, presign: PresignResponse, etag?: string) {
  return apiFetch<ConfirmResponse>("/api/v1/uploads/confirm", {
    method: "POST",
    headers: authorizationHeader(session),
    body: JSON.stringify({
      photoId: presign.photoId,
      localPhotoId: photo.localPhotoId,
      eventId: photo.eventId,
      guestSessionId: session.guestSessionId,
      objectKey: presign.objectKey,
      etag,
    }),
  });
}

async function mockUploadPhoto(photo: QueuedPhoto): Promise<UploadPhotoResult> {
  await new Promise((resolve) => window.setTimeout(resolve, 250));

  return {
    remotePhotoId: `mock-${photo.localPhotoId}`,
    remoteUrl: `mock://retrosnap/${encodeURIComponent(photo.eventId)}/${encodeURIComponent(photo.localPhotoId)}.jpg`,
  };
}

export async function uploadPhoto(photo: QueuedPhoto): Promise<UploadPhotoResult> {
  if (!isOnline()) {
    throw new RetroSnapError("upload_offline", "Device is offline. The photo will retry automatically.");
  }

  if (ENABLE_MOCK_API) {
    return mockUploadPhoto(photo);
  }

  const session = await ensureGuestSession(photo);
  const presign = await requestPresignedUpload(photo, session);
  const etag = await putBlobToStorage(photo, presign);
  const confirmed = await confirmUpload(photo, session, presign, etag);

  if (confirmed.uploadStatus !== "uploaded") {
    throw new RetroSnapError("upload_failed", "Upload confirmation did not complete.");
  }

  return {
    remotePhotoId: confirmed.photoId,
    remoteUrl: confirmed.objectKey,
  };
}
