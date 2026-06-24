import { CAMERA_CAPTURE } from "@/lib/config";
import { RetroSnapError } from "@/lib/errors";
import { toIsoString } from "@/lib/time";

export type CapturedFrame = {
  blob: Blob;
  width: number;
  height: number;
  capturedAt: string;
  sizeBytes: number;
};

export type CaptureFrameOptions = {
  aspectRatio?: number;
  jpegQuality?: number;
  maxWidth?: number;
};

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new RetroSnapError("capture_failed", "Could not encode the captured frame."));
          return;
        }

        resolve(blob);
      },
      "image/jpeg",
      quality,
    );
  });
}

export async function captureFrame(
  video: HTMLVideoElement,
  {
    aspectRatio = CAMERA_CAPTURE.disposableAspectRatio,
    jpegQuality = CAMERA_CAPTURE.jpegQuality,
    maxWidth = CAMERA_CAPTURE.maxOutputWidth,
  }: CaptureFrameOptions = {},
): Promise<CapturedFrame> {
  const sourceWidth = video.videoWidth;
  const sourceHeight = video.videoHeight;

  if (!sourceWidth || !sourceHeight || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    throw new RetroSnapError("capture_not_ready", "Camera is not ready yet. Please try again.");
  }

  const sourceRatio = sourceWidth / sourceHeight;
  let cropWidth = sourceWidth;
  let cropHeight = sourceHeight;
  let sourceX = 0;
  let sourceY = 0;

  if (sourceRatio > aspectRatio) {
    cropWidth = Math.round(sourceHeight * aspectRatio);
    sourceX = Math.round((sourceWidth - cropWidth) / 2);
  } else {
    cropHeight = Math.round(sourceWidth / aspectRatio);
    sourceY = Math.round((sourceHeight - cropHeight) / 2);
  }

  const outputWidth = Math.min(cropWidth, maxWidth);
  const outputHeight = Math.round(outputWidth / aspectRatio);

  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new RetroSnapError("capture_failed", "This browser could not create an image canvas.");
  }

  context.drawImage(video, sourceX, sourceY, cropWidth, cropHeight, 0, 0, outputWidth, outputHeight);

  const blob = await canvasToJpegBlob(canvas, jpegQuality);

  return {
    blob,
    width: outputWidth,
    height: outputHeight,
    capturedAt: toIsoString(),
    sizeBytes: blob.size,
  };
}
