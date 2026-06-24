import { CAMERA_CAPTURE } from "@/lib/config";
import { RetroSnapError } from "@/lib/errors";

export type ImageCompressionOptions = {
  maxWidth?: number;
  jpegQuality?: number;
};

function encodeCanvas(canvas: HTMLCanvasElement, jpegQuality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new RetroSnapError("capture_failed", "Could not compress image."));
          return;
        }

        resolve(blob);
      },
      "image/jpeg",
      jpegQuality,
    );
  });
}

export async function compressImageBlob(
  blob: Blob,
  { maxWidth = CAMERA_CAPTURE.maxOutputWidth, jpegQuality = CAMERA_CAPTURE.compressedJpegQuality }: ImageCompressionOptions = {},
) {
  const bitmap = await createImageBitmap(blob);

  if (bitmap.width <= maxWidth) {
    bitmap.close();
    return blob;
  }

  const width = maxWidth;
  const height = Math.round((bitmap.height / bitmap.width) * width);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new RetroSnapError("capture_failed", "This browser could not create an image canvas.");
  }

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return encodeCanvas(canvas, jpegQuality);
}
