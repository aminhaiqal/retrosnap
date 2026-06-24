import sharp from "sharp";

import { formatMalaysiaTimestamp } from "../utils/time.js";

export type TimestampOverlayOptions = {
  capturedAt: Date;
  timezone: string;
};

export function formatTimestamp(capturedAt: Date, timezone: string) {
  return formatMalaysiaTimestamp(capturedAt, timezone);
}

export async function addTimestampOverlay(input: Buffer, options: TimestampOverlayOptions) {
  const metadata = await sharp(input).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error("Cannot determine image dimensions for timestamp overlay");
  }

  const timestamp = escapeXml(formatTimestamp(options.capturedAt, options.timezone));
  const fontSize = Math.max(22, Math.round(Math.min(metadata.width, metadata.height) * 0.034));
  const padding = Math.round(fontSize * 0.7);
  const shadowOffset = Math.max(2, Math.round(fontSize * 0.09));

  const svg = `
<svg width="${metadata.width}" height="${metadata.height}" xmlns="http://www.w3.org/2000/svg">
  <text
    x="${metadata.width - padding}"
    y="${metadata.height - padding}"
    text-anchor="end"
    font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    font-size="${fontSize}"
    font-weight="700"
    letter-spacing="1"
    fill="#ff9b38"
    stroke="rgba(0,0,0,0.72)"
    stroke-width="${shadowOffset}"
    paint-order="stroke fill"
  >${timestamp}</text>
</svg>`;

  return sharp(input).composite([{ input: Buffer.from(svg), blend: "over" }]).jpeg({ quality: 92 }).toBuffer();
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
