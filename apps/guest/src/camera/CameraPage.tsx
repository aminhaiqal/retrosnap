import { useEffect, useMemo, useState } from "react";

import { CameraView } from "@/camera/CameraView";
import { MOCK_EVENT_CONFIG } from "@/event/eventConfig";
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
  const guestSession = useMemo(() => getOrCreateGuestSession(MOCK_EVENT_CONFIG.guestDisplayName), []);
  const [capturedCount, setCapturedCount] = useState(0);
  const [syncStatus, setSyncStatus] = useState<UploadUiStatus>(INITIAL_SYNC_STATUS);

  useEffect(() => {
    let mounted = true;

    async function loadCount() {
      const count = await getLocalPhotoCountForEvent(MOCK_EVENT_CONFIG.eventId);
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
  }, []);

  const framesRemaining = Math.max(0, MOCK_EVENT_CONFIG.maxFrames - capturedCount);

  return (
    <CameraView
      eventConfig={MOCK_EVENT_CONFIG}
      guestSession={guestSession}
      framesRemaining={framesRemaining}
      syncStatus={syncStatus}
      onPhotoCaptured={() => setCapturedCount((count) => Math.min(MOCK_EVENT_CONFIG.maxFrames, count + 1))}
    />
  );
}
