import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  redact: {
    paths: [
      "r2.accessKeyId",
      "r2.secretAccessKey",
      "*.accessKeyId",
      "*.secretAccessKey",
      "*.guestToken",
      "*.uploadUrl",
    ],
    remove: true,
  },
});

export type WorkerLogger = typeof logger;
