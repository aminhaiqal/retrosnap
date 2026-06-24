import { loadConfig } from "./config.js";
import { createPool } from "./db/pool.js";
import { PhotoRepository } from "./db/photoRepository.js";
import { createWorkerHealth } from "./health/workerHealth.js";
import { JobPoller } from "./jobs/jobPoller.js";
import { logger } from "./logger.js";
import { R2Storage } from "./storage/r2Client.js";

async function main() {
  const config = loadConfig();
  logger.info(
    {
      nodeEnv: config.nodeEnv,
      concurrency: config.worker.concurrency,
      batchSize: config.worker.batchSize,
      pollIntervalMs: config.worker.pollIntervalMs,
    },
    "config loaded",
  );

  const pool = createPool(config.databaseUrl);
  const photoRepository = new PhotoRepository(pool);
  const storage = new R2Storage(config.r2);
  const health = createWorkerHealth();
  const poller = new JobPoller({
    photoRepository,
    storage,
    config,
    logger,
    health,
  });
  const abortController = new AbortController();

  const requestShutdown = () => {
    if (!abortController.signal.aborted) {
      abortController.abort();
    }
  };

  process.once("SIGINT", () => {
    logger.info("SIGINT received");
    requestShutdown();
  });
  process.once("SIGTERM", () => {
    logger.info("SIGTERM received");
    requestShutdown();
  });

  logger.info("worker started");
  try {
    await poller.start(abortController.signal);
  } finally {
    await poller.stop();
    await pool.end();
  }
}

main().catch((error: unknown) => {
  logger.fatal({ error }, "worker crashed");
  process.exitCode = 1;
});
