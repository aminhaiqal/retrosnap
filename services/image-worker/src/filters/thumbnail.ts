import sharp from "sharp";

export type ThumbnailOptions = {
  maxWidth: number;
  jpegQuality: number;
};

export async function generateThumbnail(input: Buffer, options: ThumbnailOptions) {
  return sharp(input, { failOn: "none" })
    .resize({
      width: options.maxWidth,
      withoutEnlargement: true,
      fit: "inside",
    })
    .jpeg({
      quality: options.jpegQuality,
      mozjpeg: true,
    })
    .toBuffer();
}
