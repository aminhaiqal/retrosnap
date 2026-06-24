export type SafeErrorMessage =
  | "Failed to download original object"
  | "Invalid image format"
  | "Image processing failed"
  | "Failed to upload processed image"
  | "Failed to update processed metadata";

export function toLogError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return { message: String(error) };
}
