import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Cloud, CloudOff, Images, Loader2, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    return "Will post later";
  }

  if (status.isSyncing) {
    return "Posting";
  }

  if (status.failed > 0) {
    return "Posting later";
  }

  if (status.queued > 0 || status.uploading > 0) {
    return "Posting";
  }

  return "Ready";
}

function getPendingText(count: number) {
  if (count === 0) {
    return "All posted";
  }

  return count === 1 ? "1 photo safe" : `${count} photos safe`;
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
      setStatusMessage("Saved. We'll post it automatically.");
      toast.success("Photo saved", {
        description: "We'll post it automatically.",
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
    <main className="relative h-[100svh] w-full overflow-hidden bg-black text-foreground">
      <div className="absolute inset-0">
        {cameraState === "error" ? (
          <div className="grid h-full w-full place-items-center bg-background px-4">
            <div className="w-full max-w-md">
              <CameraPermissionState error={cameraError} onRetry={startCamera} />
            </div>
          </div>
        ) : (
          <>
            <Viewfinder videoRef={videoRef} isReady={cameraState === "ready"} />
            <FilmWindAnimation
              active={isWinding}
              onFinished={() => {
                setIsWinding(false);
                setIsCapturing(false);
              }}
            />
          </>
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/90 via-black/55 to-transparent px-4 pb-16 pt-4 sm:px-6">
        <header className="mx-auto flex w-full max-w-6xl items-start justify-between gap-3">
          <div className="min-w-0 drop-shadow">
            <p className="text-xs font-semibold uppercase text-primary">RetroSnap</p>
            <h1 className="max-w-[72vw] truncate text-2xl font-bold tracking-normal sm:max-w-none sm:text-3xl">
              {eventConfig.eventName}
            </h1>
            <p className="truncate text-sm text-stone-200">{guestSession.guestDisplayName} camera</p>
          </div>
          <Button
            asChild
            variant="outline"
            size="icon"
            aria-label="Open local queue"
            className="pointer-events-auto shrink-0 border-white/20 bg-black/55 text-white backdrop-blur hover:bg-black/70"
          >
            <Link to="/queue">
              <Images className="h-5 w-5" aria-hidden="true" />
            </Link>
          </Button>
        </header>

        <div className="mx-auto mt-3 flex w-full max-w-6xl flex-wrap items-center gap-2">
          <Badge variant="secondary" className="gap-1 bg-black/55 backdrop-blur">
            {syncStatus.online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {getStatusText(syncStatus)}
          </Badge>
          <Badge variant="outline" className="gap-1 border-white/20 bg-black/55 text-stone-100 backdrop-blur">
            {syncStatus.isSyncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Cloud className="h-3 w-3" />}
            {getPendingText(queuedLocalCount)}
          </Badge>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-4 pb-4 pt-16 sm:px-6">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3">
          <FrameCounter framesRemaining={framesRemaining} maxFrames={eventConfig.maxFrames} />

          {framesRemaining <= 0 ? (
            <Alert className="border-white/15 bg-black/65 text-stone-100 backdrop-blur">
              <CloudOff className="h-4 w-4" aria-hidden="true" />
              <AlertTitle>Film roll completed</AlertTitle>
              <AlertDescription>All photos are saved. We'll keep posting them in the background.</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex flex-col items-center gap-3 sm:grid sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
            <p className="order-2 min-h-5 max-w-full text-center text-sm text-stone-200 sm:order-none sm:text-left">
              {statusMessage}
            </p>
            <div className="order-1 sm:order-none">
              <ShutterButton disabled={shutterDisabled} isCapturing={isCapturing} onPress={handleShutter} />
            </div>
            <div className="hidden sm:block" aria-hidden="true" />
          </div>
        </div>
      </div>
    </main>
  );
}
