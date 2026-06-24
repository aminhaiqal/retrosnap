export type EventStats = {
  total: number;
  uploaded: number;
  processing: number;
  processed: number;
  failed: number;
  hidden: number;
};

export type AdminEvent = {
  eventId: string;
  eventName: string;
  maxFrames: number;
  revealAt: string;
  filterName: string;
  isActive: boolean;
  guestCameraUrl: string;
  albumUrl: string;
  createdAt: string;
  updatedAt: string;
  stats: EventStats;
};

export type AdminPhoto = {
  photoId: string;
  eventId: string;
  guestSessionId: string;
  guestDisplayName: string;
  localPhotoId: string;
  uploadStatus: string;
  isHidden: boolean;
  previewUrl?: string;
  previewObjectKey?: string;
  originalObjectKey: string;
  processedObjectKey?: string;
  thumbnailObjectKey?: string;
  capturedAt: string;
  uploadedAt?: string;
  processedAt?: string;
  sizeBytes: number;
  processedSizeBytes?: number;
  thumbnailSizeBytes?: number;
  errorMessage?: string;
};

export type ExportLinksResponse = {
  eventId: string;
  mode: "signed_links";
  photos: Array<{
    photoId: string;
    localPhotoId: string;
    processedObjectKey: string;
    downloadUrl: string;
  }>;
  limitations: string;
};

export type CreateEventInput = {
  eventId?: string;
  eventName: string;
  maxFrames: number;
  revealAt: string;
  filterName: string;
  isActive: boolean;
};

type APIError = {
  error?: {
    code?: string;
    message?: string;
  };
};

const API_BASE_URL = (import.meta.env.VITE_RETROSNAP_API_BASE_URL ?? "http://localhost:8080").replace(/\/$/, "");

export class RetroSnapAdminAPI {
  constructor(private readonly getAdminToken: () => string) {}

  async listEvents() {
    return this.request<{ events: AdminEvent[] }>("/api/v1/events");
  }

  async createEvent(input: CreateEventInput) {
    return this.request<AdminEvent>("/api/v1/events", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async getEvent(eventId: string) {
    return this.request<AdminEvent>(`/api/v1/events/${encodeURIComponent(eventId)}`);
  }

  async listPhotos(eventId: string) {
    return this.request<{ photos: AdminPhoto[] }>(`/api/v1/events/${encodeURIComponent(eventId)}/photos`);
  }

  async setPhotoHidden(photoId: string, hidden: boolean) {
    return this.request<AdminPhoto>(`/api/v1/photos/${encodeURIComponent(photoId)}/moderation`, {
      method: "PATCH",
      body: JSON.stringify({ hidden }),
    });
  }

  async exportLinks(eventId: string) {
    return this.request<ExportLinksResponse>(`/api/v1/events/${encodeURIComponent(eventId)}/export`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  }

  private async request<T>(path: string, init: RequestInit = {}) {
    const token = this.getAdminToken().trim();
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });

    if (!response.ok) {
      throw new Error(await readAPIError(response));
    }

    return (await response.json()) as T;
  }
}

async function readAPIError(response: Response) {
  try {
    const body = (await response.json()) as APIError;
    return body.error?.message ?? `API request failed with ${response.status}`;
  } catch {
    return `API request failed with ${response.status}`;
  }
}
