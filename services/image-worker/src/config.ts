import "dotenv/config";

export type WorkerConfig = {
  nodeEnv: string;
  databaseUrl: string;
  r2: {
    endpoint: string;
    region: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
    forcePathStyle: boolean;
  };
  worker: {
    concurrency: number;
    batchSize: number;
    pollIntervalMs: number;
    staleProcessingMinutes: number;
    maxProcessingAttempts: number;
  };
  images: {
    processedMaxWidth: number;
    processedJpegQuality: number;
    thumbnailMaxWidth: number;
    thumbnailJpegQuality: number;
    enableTimestampOverlay: boolean;
    timezone: string;
  };
};

type EnvSource = Record<string, string | undefined>;

export function loadConfig(env: EnvSource = process.env): WorkerConfig {
  const config: WorkerConfig = {
    nodeEnv: env.NODE_ENV?.trim() || "development",
    databaseUrl: required(env, "DATABASE_URL"),
    r2: {
      endpoint: required(env, "R2_ENDPOINT"),
      region: env.R2_REGION?.trim() || "auto",
      bucket: required(env, "R2_BUCKET"),
      accessKeyId: required(env, "R2_ACCESS_KEY_ID"),
      secretAccessKey: required(env, "R2_SECRET_ACCESS_KEY"),
      forcePathStyle: parseBoolean(env.R2_FORCE_PATH_STYLE, true),
    },
    worker: {
      concurrency: parsePositiveInt(env.WORKER_CONCURRENCY, 1, "WORKER_CONCURRENCY"),
      batchSize: parsePositiveInt(env.WORKER_BATCH_SIZE, 5, "WORKER_BATCH_SIZE"),
      pollIntervalMs: parsePositiveInt(env.WORKER_POLL_INTERVAL_MS, 5000, "WORKER_POLL_INTERVAL_MS"),
      staleProcessingMinutes: parsePositiveInt(
        env.WORKER_STALE_PROCESSING_MINUTES,
        15,
        "WORKER_STALE_PROCESSING_MINUTES",
      ),
      maxProcessingAttempts: parsePositiveInt(env.MAX_PROCESSING_ATTEMPTS, 8, "MAX_PROCESSING_ATTEMPTS"),
    },
    images: {
      processedMaxWidth: parsePositiveInt(env.PROCESSED_MAX_WIDTH, 1800, "PROCESSED_MAX_WIDTH"),
      processedJpegQuality: parseQuality(env.PROCESSED_JPEG_QUALITY, 84, "PROCESSED_JPEG_QUALITY"),
      thumbnailMaxWidth: parsePositiveInt(env.THUMBNAIL_MAX_WIDTH, 480, "THUMBNAIL_MAX_WIDTH"),
      thumbnailJpegQuality: parseQuality(env.THUMBNAIL_JPEG_QUALITY, 76, "THUMBNAIL_JPEG_QUALITY"),
      enableTimestampOverlay: parseBoolean(env.ENABLE_TIMESTAMP_OVERLAY, true),
      timezone: env.TIMEZONE?.trim() || "Asia/Kuala_Lumpur",
    },
  };

  return config;
}

function required(env: EnvSource, key: string) {
  const value = env[key]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

function parsePositiveInt(value: string | undefined, fallback: number, key: string) {
  if (!value?.trim()) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${key} must be a positive integer`);
  }

  return parsed;
}

function parseQuality(value: string | undefined, fallback: number, key: string) {
  const parsed = parsePositiveInt(value, fallback, key);
  if (parsed > 100) {
    throw new Error(`${key} must be between 1 and 100`);
  }

  return parsed;
}

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (!value?.trim()) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}
