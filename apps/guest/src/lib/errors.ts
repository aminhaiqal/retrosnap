export type AppErrorCode =
  | "camera_unsupported"
  | "camera_permission_denied"
  | "camera_not_found"
  | "camera_in_use"
  | "camera_unknown"
  | "capture_not_ready"
  | "capture_failed"
  | "storage_failed"
  | "upload_offline"
  | "upload_failed";

export class RetroSnapError extends Error {
  readonly code: AppErrorCode;
  readonly cause?: unknown;

  constructor(code: AppErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = "RetroSnapError";
    this.code = code;
    this.cause = cause;
  }
}

export function getErrorMessage(error: unknown) {
  if (error instanceof RetroSnapError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}
