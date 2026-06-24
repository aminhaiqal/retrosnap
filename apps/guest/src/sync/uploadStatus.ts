import type { QueueStats } from "@/queue/queueTypes";

export type UploadUiStatus = QueueStats & {
  online: boolean;
  isSyncing: boolean;
  lastSyncAt?: string;
};

export function buildUploadStatus(stats: QueueStats, online: boolean, isSyncing: boolean, lastSyncAt?: string): UploadUiStatus {
  return {
    ...stats,
    online,
    isSyncing,
    lastSyncAt,
  };
}
