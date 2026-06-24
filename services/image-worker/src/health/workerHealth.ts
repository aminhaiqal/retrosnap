export type WorkerHealth = {
  startedAt: string;
  isPolling: boolean;
  activeJobs: number;
  lastPollAt?: string;
  lastSuccessfulPollAt?: string;
};

export function createWorkerHealth(): WorkerHealth {
  return {
    startedAt: new Date().toISOString(),
    isPolling: false,
    activeJobs: 0,
  };
}
