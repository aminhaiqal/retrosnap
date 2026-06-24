const retryDelaysMs = [
  30 * 1000,
  2 * 60 * 1000,
  10 * 60 * 1000,
  30 * 60 * 1000,
  2 * 60 * 60 * 1000,
];

export function getNextProcessingRetryAt(processingAttempts: number, maxAttempts: number, from = new Date()) {
  if (processingAttempts >= maxAttempts) {
    return null;
  }

  const delayMs = retryDelaysMs[Math.min(Math.max(processingAttempts - 1, 0), retryDelaysMs.length - 1)];
  return new Date(from.getTime() + delayMs);
}
