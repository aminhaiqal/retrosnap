export const APP_NAME = "RetroSnap Camera";

export const CAMERA_CAPTURE = {
  disposableAspectRatio: 3 / 2,
  jpegQuality: 0.86,
  compressedJpegQuality: 0.84,
  maxOutputWidth: 1600,
} as const;

export const STORAGE_KEYS = {
  guestSession: "retrosnap.guest-session.v1",
} as const;
