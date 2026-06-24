import { AlertTriangle, CameraOff, RotateCcw } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { RetroSnapError } from "@/lib/errors";

type CameraPermissionStateProps = {
  error?: RetroSnapError;
  onRetry: () => void;
};

export function CameraPermissionState({ error, onRetry }: CameraPermissionStateProps) {
  const isUnsupported = error?.code === "camera_unsupported";

  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 rounded-lg border border-border bg-black/35 p-5 text-center">
      {isUnsupported ? (
        <CameraOff className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
      ) : (
        <AlertTriangle className="h-10 w-10 text-primary" aria-hidden="true" />
      )}
      <Alert className="text-left">
        <AlertTitle>{isUnsupported ? "Camera unsupported" : "Camera needs permission"}</AlertTitle>
        <AlertDescription>
          {error?.message ?? "Allow camera access so RetroSnap can capture photos directly from this device."}
        </AlertDescription>
      </Alert>
      {!isUnsupported ? (
        <Button type="button" onClick={onRetry} className="w-full">
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Try again
        </Button>
      ) : null}
    </div>
  );
}
