import { describe, expect, it } from "vitest";

import { getNextProcessingRetryAt } from "./retryPolicy.js";

describe("retry policy", () => {
  const now = new Date("2026-06-25T12:00:00.000Z");

  it.each([
    [1, 30],
    [2, 120],
    [3, 600],
    [4, 1800],
    [5, 7200],
    [8, null],
  ])("returns retry time for attempt %s", (attempt, seconds) => {
    const result = getNextProcessingRetryAt(attempt, 8, now);
    if (seconds === null) {
      expect(result).toBeNull();
    } else {
      expect(result?.toISOString()).toBe(new Date(now.getTime() + seconds * 1000).toISOString());
    }
  });
});
