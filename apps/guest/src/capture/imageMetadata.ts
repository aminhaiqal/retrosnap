import type { CapturedFrame } from "@/capture/captureFrame";
import type { EventConfig } from "@/event/eventConfig";
import type { GuestSession } from "@/event/guestSession";
import type { QueuedPhoto } from "@/queue/queueTypes";

function createLocalPhotoId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `local_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function createImageMetadata(
  capturedFrame: CapturedFrame,
  eventConfig: EventConfig,
  guestSession: GuestSession,
): Omit<QueuedPhoto, "blob"> {
  return {
    localPhotoId: createLocalPhotoId(),
    eventId: eventConfig.eventId,
    guestId: guestSession.guestId,
    guestDisplayName: guestSession.guestDisplayName,
    width: capturedFrame.width,
    height: capturedFrame.height,
    sizeBytes: capturedFrame.sizeBytes,
    capturedAt: capturedFrame.capturedAt,
    uploadStatus: "queued",
    uploadAttempts: 0,
  };
}
