const RETRY_DELAYS_SECONDS = [5, 15, 30, 60];
const MAX_DELAY_SECONDS = 5 * 60;

export function getRetryDelayMs(uploadAttempts: number) {
  const baseSeconds = RETRY_DELAYS_SECONDS[Math.max(0, uploadAttempts - 1)] ?? MAX_DELAY_SECONDS;
  const cappedSeconds = Math.min(baseSeconds, MAX_DELAY_SECONDS);
  const jitter = 0.85 + Math.random() * 0.3;

  return Math.round(cappedSeconds * jitter * 1000);
}

export function getNextRetryAt(uploadAttempts: number, from = new Date()) {
  return new Date(from.getTime() + getRetryDelayMs(uploadAttempts)).toISOString();
}
