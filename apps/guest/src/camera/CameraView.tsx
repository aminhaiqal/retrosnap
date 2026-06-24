import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Cloud, CloudOff, Images, Loader2, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { captureFrame } from "@/capture/captureFrame";
import { createImageMetadata } from "@/capture/imageMetadata";
import { attachStreamToVideoElement, requestCameraStream, stopCameraStream } from "@/camera/cameraEngine";
import { CameraPermissionState } from "@/camera/CameraPermissionState";
import { FilmWindAnimation } from "@/camera/FilmWindAnimation";
import { FrameCounter } from "@/camera/FrameCounter";
import { ShutterButton } from "@/camera/ShutterButton";
import { Viewfinder } from "@/camera/Viewfinder";
import type { EventConfig } from "@/event/eventConfig";
import type { GuestSession } from "@/event/guestSession";
import { enqueuePhoto } from "@/queue/photoQueue";
import { syncManager } from "@/sync/syncManager";
import type { UploadUiStatus } from "@/sync/uploadStatus";
import { getErrorMessage, RetroSnapError } from "@/lib/errors";

type CameraViewProps = {
  eventConfig: EventConfig;
  guestSession: GuestSession;
  framesRemaining: number;
  syncStatus: UploadUiStatus;
  onPhotoCaptured: () => void;
};

type CameraState = "requesting" | "ready" | "error";

function getStatusText(status: UploadUiStatus) {
  if (!status.online) {
    return "Offline";
  }

  if (status.isSyncing) {
    return "Syncing";
  }

  if (status.failed > 0) {
    return "Retry pending";
  }

  if (status.queued > 0 || status.uploading > 0) {
    return "Queued";
  }

  return "Synced";
}

export function CameraView({ eventConfig, guestSession, framesRemaining, syncStatus, onPhotoCaptured }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraState, setCameraState] = useState<CameraState>("requesting");
  const [cameraError, setCameraError] = useState<RetroSnapError>();
  const [isCapturing, setIsCapturing] = useState(false);
  const [isWinding, setIsWinding] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Point, tap, and keep the party moving.");

  const startCamera = useCallback(async () => {
    setCameraState("requesting");
    setCameraError(undefined);
    stopCameraStream(streamRef.current);

    try {
      const stream = await requestCameraStream();
      streamRef.current = stream;

      if (videoRef.current) {
        await attachStreamToVideoElement(videoRef.current, stream);
      }

      setCameraState("ready");
      setStatusMessage("Camera ready.");
    } catch (error) {
      const nextError =
        error instanceof RetroSnapError
          ? error
          : new RetroSnapError("camera_unknown", getErrorMessage(error), error);
      setCameraError(nextError);
      setCameraState("error");
      setStatusMessage(nextError.message);
    }
  }, []);

  useEffect(() => {
    void startCamera();

    return () => {
      stopCameraStream(streamRef.current);
      streamRef.current = null;
    };
  }, [startCamera]);

  const handleShutter = async () => {
    if (!videoRef.current || isCapturing || cameraState !== "ready" || framesRemaining <= 0) {
      return;
    }

    setIsCapturing(true);
    setStatusMessage("Saving to film roll...");
    let saved = false;

    try {
      const capturedFrame = await captureFrame(videoRef.current);
      const metadata = createImageMetadata(capturedFrame, eventConfig, guestSession);

      await enqueuePhoto({
        ...metadata,
        blob: capturedFrame.blob,
      });

      saved = true;
      onPhotoCaptured();
      setIsWinding(true);
      setStatusMessage("Saved locally. Syncing when connection is available.");
      toast.success("Saved locally", {
        description: "RetroSnap will sync this photo when the connection is available.",
      });
      void syncManager.triggerSync("capture");
    } catch (error) {
      const message = getErrorMessage(error);
      setStatusMessage(message);
      toast.error("Photo was not saved", {
        description: message,
      });
    } finally {
      if (!saved) {
        setIsCapturing(false);
      }
    }
  };

  const queuedLocalCount = syncStatus.queued + syncStatus.uploading + syncStatus.failed;
  const shutterDisabled = cameraState !== "ready" || isCapturing || framesRemaining <= 0;

  return (
    <main className="phone-shell mx-auto flex w-full max-w-[430px] flex-col gap-4 px-4">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-primary">RetroSnap</p>
          <h1 className="truncate text-2xl font-bold tracking-normal">{eventConfig.eventName}</h1>
          <p className="text-sm text-muted-foreground">{guestSession.guestDisplayName} camera</p>
        </div>
        <Button asChild variant="outline" size="icon" aria-label="Open local queue">
          <Link to="/queue">
            <Images className="h-5 w-5" aria-hidden="true" />
          </Link>
        </Button>
      </header>

      <Card className="border-stone-700 bg-[#161411] p-3 shadow-camera">
        <CardContent className="space-y-4 p-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge variant={syncStatus.online ? "secondary" : "destructive"} className="gap-1">
              {syncStatus.online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {getStatusText(syncStatus)}
            </Badge>
            <Badge variant="outline" className="gap-1">
              {syncStatus.isSyncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Cloud className="h-3 w-3" />}
              {queuedLocalCount} local queued
            </Badge>
          </div>

          {cameraState === "error" ? (
            <CameraPermissionState error={cameraError} onRetry={startCamera} />
          ) : (
            <div className="relative">
              <Viewfinder videoRef={videoRef} isReady={cameraState === "ready"} />
              <FilmWindAnimation
                active={isWinding}
                onFinished={() => {
                  setIsWinding(false);
                  setIsCapturing(false);
                }}
              />
            </div>
          )}

          <FrameCounter framesRemaining={framesRemaining} maxFrames={eventConfig.maxFrames} />

          {framesRemaining <= 0 ? (
            <Alert>
              <CloudOff className="h-4 w-4" aria-hidden="true" />
              <AlertTitle>Film roll completed</AlertTitle>
              <AlertDescription>All frames are saved locally. Keep this tab open when possible so sync can finish.</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex flex-col items-center gap-3 pb-2 pt-1">
            <ShutterButton disabled={shutterDisabled} isCapturing={isCapturing} onPress={handleShutter} />
            <p className="min-h-5 text-center text-sm text-muted-foreground">{statusMessage}</p>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
