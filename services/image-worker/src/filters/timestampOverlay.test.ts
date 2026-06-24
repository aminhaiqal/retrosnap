import { describe, expect, it } from "vitest";

import { formatTimestamp } from "./timestampOverlay.js";

describe("timestamp formatting", () => {
  it("formats in Malaysia time", () => {
    const date = new Date("2026-06-25T12:45:00.000Z");
    expect(formatTimestamp(date, "Asia/Kuala_Lumpur")).toBe("25.06.26 08:45 PM");
  });
});
