import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { CameraView } from "@/camera/CameraView";
import { fetchPublicEventConfig, MOCK_EVENT_CONFIG, type EventConfig } from "@/event/eventConfig";
import { getOrCreateGuestSession } from "@/event/guestSession";
import { getLocalPhotoCountForEvent } from "@/queue/photoQueue";
import { syncManager } from "@/sync/syncManager";
import type { UploadUiStatus } from "@/sync/uploadStatus";

const INITIAL_SYNC_STATUS: UploadUiStatus = {
  total: 0,
  queued: 0,
  uploading: 0,
  uploaded: 0,
  failed: 0,
  online: true,
  isSyncing: false,
};

export function CameraPage() {
  const { eventId } = useParams();
  const requestedEventId = eventId ?? MOCK_EVENT_CONFIG.eventId;
  const [eventConfig, setEventConfig] = useState<EventConfig>(
    requestedEventId === MOCK_EVENT_CONFIG.eventId ? MOCK_EVENT_CONFIG : { ...MOCK_EVENT_CONFIG, eventId: requestedEventId },
  );
  const [eventError, setEventError] = useState<string | null>(null);
  const guestSession = useMemo(() => getOrCreateGuestSession(eventConfig.guestDisplayName), [eventConfig.guestDisplayName]);
  const [capturedCount, setCapturedCount] = useState(0);
  const [syncStatus, setSyncStatus] = useState<UploadUiStatus>(INITIAL_SYNC_STATUS);

  useEffect(() => {
    let mounted = true;

    async function loadEvent() {
      try {
        const nextEventConfig = await fetchPublicEventConfig(requestedEventId);
        if (mounted) {
          setEventConfig(nextEventConfig);
          setEventError(null);
        }
      } catch (error) {
        if (mounted) {
          setEventError(error instanceof Error ? error.message : "Could not load event.");
        }
      }
    }

    void loadEvent();

    return () => {
      mounted = false;
    };
  }, [requestedEventId]);

  useEffect(() => {
    let mounted = true;

    async function loadCount() {
      const count = await getLocalPhotoCountForEvent(eventConfig.eventId);
      if (mounted) {
        setCapturedCount(count);
      }
    }

    void syncManager.init();
    void loadCount();
    const unsubscribe = syncManager.subscribe((status) => {
      setSyncStatus(status);
      void loadCount();
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [eventConfig.eventId]);

  const framesRemaining = Math.max(0, eventConfig.maxFrames - capturedCount);

  if (eventError) {
    return (
      <main className="phone-shell mx-auto grid w-full max-w-[430px] place-items-center px-4 text-center">
        <div className="rounded-lg border border-border bg-card p-5">
          <h1 className="text-xl font-semibold">Event unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">{eventError}</p>
        </div>
      </main>
    );
  }

  return (
    <CameraView
      eventConfig={eventConfig}
      guestSession={guestSession}
      framesRemaining={framesRemaining}
      syncStatus={syncStatus}
      onPhotoCaptured={() => setCapturedCount((count) => Math.min(eventConfig.maxFrames, count + 1))}
    />
  );
}
