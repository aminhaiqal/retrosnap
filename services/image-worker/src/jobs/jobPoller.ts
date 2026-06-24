import type { WorkerConfig } from "../config.js";
import type { PhotoRepository } from "../db/photoRepository.js";
import type { WorkerHealth } from "../health/workerHealth.js";
import type { WorkerLogger } from "../logger.js";
import type { ObjectStorage } from "../storage/storageTypes.js";
import { sleep } from "../utils/time.js";
import { processPhotoJob } from "./processPhotoJob.js";
import type { PhotoJob } from "./jobTypes.js";

export type JobPollerDeps = {
  photoRepository: PhotoRepository;
  storage: ObjectStorage;
  config: WorkerConfig;
  logger: WorkerLogger;
  health: WorkerHealth;
};

export class JobPoller {
  private readonly pendingJobs: PhotoJob[] = [];
  private readonly activeJobs = new Set<Promise<void>>();
  private stopped = false;
  private pollInProgress = false;

  constructor(private readonly deps: JobPollerDeps) {}

  async start(signal: AbortSignal) {
    this.deps.health.isPolling = true;
    this.deps.logger.info("polling started");

    while (!this.stopped && !signal.aborted) {
      await this.pollOnce();
      this.dispatchJobs();

      try {
        await sleep(this.deps.config.worker.pollIntervalMs, signal);
      } catch {
        break;
      }
    }

    await this.stop();
  }

  async stop() {
    if (this.stopped) {
      return;
    }

    this.stopped = true;
    this.deps.health.isPolling = false;
    this.deps.logger.info({ activeJobs: this.activeJobs.size }, "worker shutting down");

    await Promise.allSettled([...this.activeJobs]);
  }

  private async pollOnce() {
    if (this.pollInProgress || this.pendingJobs.length > 0) {
      return;
    }

    this.pollInProgress = true;
    this.deps.health.lastPollAt = new Date().toISOString();

    try {
      const jobs = await this.deps.photoRepository.claimJobs(
        this.deps.config.worker.batchSize,
        this.deps.config.worker.staleProcessingMinutes,
      );

      if (jobs.length > 0) {
        this.pendingJobs.push(...jobs);
        this.deps.logger.info({ claimed: jobs.length }, "jobs claimed");
      }

      this.deps.health.lastSuccessfulPollAt = new Date().toISOString();
    } catch (error) {
      this.deps.logger.error({ error }, "polling failed");
    } finally {
      this.pollInProgress = false;
    }
  }

  private dispatchJobs() {
    while (
      !this.stopped &&
      this.pendingJobs.length > 0 &&
      this.activeJobs.size < this.deps.config.worker.concurrency
    ) {
      const job = this.pendingJobs.shift();
      if (!job) {
        return;
      }

      const promise = processPhotoJob(job, {
        photoRepository: this.deps.photoRepository,
        storage: this.deps.storage,
        config: this.deps.config,
        logger: this.deps.logger,
      }).finally(() => {
        this.activeJobs.delete(promise);
        this.deps.health.activeJobs = this.activeJobs.size;
        this.dispatchJobs();
      });

      this.activeJobs.add(promise);
      this.deps.health.activeJobs = this.activeJobs.size;
    }
  }
}
