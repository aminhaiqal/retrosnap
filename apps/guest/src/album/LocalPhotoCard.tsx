import { useEffect, useMemo, useState } from "react";
import { RefreshCcw, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { QueuedPhoto, UploadStatus } from "@/queue/queueTypes";
import { formatBytes, formatShortDateTime } from "@/lib/time";

type LocalPhotoCardProps = {
  photo: QueuedPhoto;
  onRetry: (localPhotoId: string) => void;
  onDelete: (localPhotoId: string) => void;
};

function getBadgeVariant(status: UploadStatus) {
  if (status === "uploaded") {
    return "secondary";
  }

  return status === "uploading" ? "default" : "outline";
}

function getStatusLabel(status: UploadStatus) {
  if (status === "queued") {
    return "Saved";
  }

  if (status === "uploading") {
    return "Posting";
  }

  if (status === "uploaded") {
    return "Posted";
  }

  return "Posting later";
}

export function LocalPhotoCard({ photo, onRetry, onDelete }: LocalPhotoCardProps) {
  const [previewUrl, setPreviewUrl] = useState<string>();
  const canRetry = photo.uploadStatus === "failed" || photo.uploadStatus === "queued";
  const details = useMemo(
    () => [
      ["Captured", formatShortDateTime(photo.capturedAt)],
      ["Size", formatBytes(photo.sizeBytes)],
      ["Dimensions", `${photo.width} x ${photo.height}`],
      ["Attempts", String(photo.uploadAttempts)],
    ],
    [photo],
  );

  useEffect(() => {
    const objectUrl = URL.createObjectURL(photo.blob);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [photo.blob]);

  return (
    <Card>
      <CardContent className="space-y-4 p-3">
        <div className="grid grid-cols-[96px_1fr] gap-3">
          <div className="aspect-[3/2] overflow-hidden rounded-md bg-black">
            {previewUrl ? <img src={previewUrl} alt="" className="h-full w-full object-cover" /> : null}
          </div>
          <div className="min-w-0 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Badge variant={getBadgeVariant(photo.uploadStatus)}>{getStatusLabel(photo.uploadStatus)}</Badge>
              <span className="truncate font-mono text-[10px] text-muted-foreground">{photo.localPhotoId.slice(0, 8)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              {details.map(([label, value]) => (
                <div key={label}>
                  <p className="font-semibold uppercase text-stone-300">{label}</p>
                  <p>{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {photo.uploadStatus === "failed" ? (
          <p className="rounded-md border border-border bg-muted/30 p-2 text-sm text-muted-foreground">
            We'll try again automatically.
          </p>
        ) : null}

        {photo.remoteUrl ? <p className="truncate text-xs text-muted-foreground">{photo.remoteUrl}</p> : null}

        <Separator />

        <div className="flex gap-2">
          <Button type="button" variant="outline" className="flex-1" disabled={!canRetry} onClick={() => onRetry(photo.localPhotoId)}>
            <RefreshCcw className="h-4 w-4" aria-hidden="true" />
            Post now
          </Button>
          <Button type="button" variant="destructive" size="icon" aria-label="Delete local photo" onClick={() => onDelete(photo.localPhotoId)}>
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
