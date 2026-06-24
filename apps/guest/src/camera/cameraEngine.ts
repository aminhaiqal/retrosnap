import { RetroSnapError } from "@/lib/errors";

export const PREFERRED_CAMERA_CONSTRAINTS: MediaStreamConstraints = {
  video: {
    facingMode: { ideal: "environment" },
    width: { ideal: 1920 },
    height: { ideal: 1080 },
  },
  audio: false,
};

export const FALLBACK_CAMERA_CONSTRAINTS: MediaStreamConstraints = {
  video: true,
  audio: false,
};

export function isCameraSupported() {
  return Boolean(navigator.mediaDevices?.getUserMedia);
}

function toCameraError(error: unknown) {
  if (!isCameraSupported()) {
    return new RetroSnapError("camera_unsupported", "This browser does not support camera access.", error);
  }

  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "SecurityError") {
      return new RetroSnapError("camera_permission_denied", "Camera permission was denied.", error);
    }

    if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
      return new RetroSnapError("camera_not_found", "No camera was found on this device.", error);
    }

    if (error.name === "NotReadableError" || error.name === "TrackStartError") {
      return new RetroSnapError("camera_in_use", "The camera is already in use by another app.", error);
    }
  }

  return new RetroSnapError("camera_unknown", "Could not start the camera. Please try again.", error);
}

export async function requestCameraStream() {
  if (!isCameraSupported()) {
    throw toCameraError(undefined);
  }

  try {
    return await navigator.mediaDevices.getUserMedia(PREFERRED_CAMERA_CONSTRAINTS);
  } catch (preferredError) {
    try {
      return await navigator.mediaDevices.getUserMedia(FALLBACK_CAMERA_CONSTRAINTS);
    } catch (fallbackError) {
      throw toCameraError(fallbackError ?? preferredError);
    }
  }
}

export async function attachStreamToVideoElement(video: HTMLVideoElement, stream: MediaStream) {
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  video.setAttribute("playsinline", "true");

  try {
    await video.play();
  } catch (error) {
    throw new RetroSnapError("camera_unknown", "Camera preview could not start.", error);
  }
}

export function stopCameraStream(stream: MediaStream | null | undefined) {
  stream?.getTracks().forEach((track) => track.stop());
}
