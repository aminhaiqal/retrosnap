import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { EmptyQueueState } from "@/album/EmptyQueueState";
import { LocalPhotoCard } from "@/album/LocalPhotoCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  clearUploadedPhotos,
  deleteLocalPhoto,
  getQueuedPhotos,
  retryPhotoNow,
} from "@/queue/photoQueue";
import type { QueuedPhoto } from "@/queue/queueTypes";
import { syncManager } from "@/sync/syncManager";
import type { UploadUiStatus } from "@/sync/uploadStatus";

const EMPTY_STATUS: UploadUiStatus = {
  total: 0,
  queued: 0,
  uploading: 0,
  uploaded: 0,
  failed: 0,
  online: true,
  isSyncing: false,
};

export function LocalQueuePage() {
  const [photos, setPhotos] = useState<QueuedPhoto[]>([]);
  const [status, setStatus] = useState<UploadUiStatus>(EMPTY_STATUS);

  const loadPhotos = useCallback(async () => {
    setPhotos(await getQueuedPhotos());
  }, []);

  useEffect(() => {
    void syncManager.init();
    void loadPhotos();

    const unsubscribe = syncManager.subscribe((nextStatus) => {
      setStatus(nextStatus);
      void loadPhotos();
    });

    return unsubscribe;
  }, [loadPhotos]);

  const handleRetry = async (localPhotoId: string) => {
    await retryPhotoNow(localPhotoId);
    toast.success("Retry queued");
    await syncManager.triggerSync("debug-retry");
    await loadPhotos();
  };

  const handleDelete = async (localPhotoId: string) => {
    await deleteLocalPhoto(localPhotoId);
    toast.success("Local photo deleted");
    await syncManager.refreshStats();
    await loadPhotos();
  };

  const handleClearUploaded = async () => {
    await clearUploadedPhotos();
    toast.success("Uploaded photos cleared");
    await syncManager.refreshStats();
    await loadPhotos();
  };

  return (
    <main className="phone-shell mx-auto flex w-full max-w-[720px] flex-col gap-4 px-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-primary">Debug queue</p>
          <h1 className="text-2xl font-bold tracking-normal">Local photos</h1>
        </div>
        <Button asChild variant="outline">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Camera
          </Link>
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Queue stats</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Badge variant="outline">Total {status.total}</Badge>
          <Badge variant="outline">Queued {status.queued}</Badge>
          <Badge variant="outline">Uploading {status.uploading}</Badge>
          <Badge variant="secondary">Uploaded {status.uploaded}</Badge>
          <Badge variant={status.failed ? "destructive" : "outline"}>Failed {status.failed}</Badge>
          <Badge variant={status.online ? "secondary" : "destructive"}>{status.online ? "Online" : "Offline"}</Badge>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={() => syncManager.triggerSync("debug-manual")}>
          Retry sync
        </Button>
        <Button type="button" variant="destructive" className="flex-1" onClick={handleClearUploaded} disabled={!status.uploaded}>
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          Clear uploaded
        </Button>
      </div>

      {photos.length === 0 ? (
        <EmptyQueueState />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {photos.map((photo) => (
            <LocalPhotoCard key={photo.localPhotoId} photo={photo} onRetry={handleRetry} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </main>
  );
}
