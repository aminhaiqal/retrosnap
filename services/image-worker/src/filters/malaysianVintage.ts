import sharp from "sharp";

export type MalaysianVintageOptions = {
  maxWidth: number;
  jpegQuality: number;
};

export async function applyMalaysianVintage(input: Buffer, options: MalaysianVintageOptions) {
  return sharp(input, { failOn: "none" })
    .rotate()
    .resize({
      width: options.maxWidth,
      withoutEnlargement: true,
      fit: "inside",
    })
    .modulate({
      brightness: 1.02,
      saturation: 1.08,
      hue: -2,
    })
    .linear(1.04, -3)
    .gamma(1.02)
    .jpeg({
      quality: options.jpegQuality,
      mozjpeg: true,
    })
    .toBuffer();
}
