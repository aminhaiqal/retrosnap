import { openDB, type DBSchema, type IDBPDatabase } from "idb";

import type { QueuedPhoto } from "@/queue/queueTypes";

export const DATABASE_NAME = "retrosnap-camera-db";
export const DATABASE_VERSION = 1;
export const PHOTO_QUEUE_STORE = "photo_queue";

export interface RetroSnapCameraDb extends DBSchema {
  photo_queue: {
    key: string;
    value: QueuedPhoto;
    indexes: {
      eventId: string;
      uploadStatus: string;
      capturedAt: string;
      nextRetryAt: string;
    };
  };
}

let databasePromise: Promise<IDBPDatabase<RetroSnapCameraDb>> | undefined;

export function getDb() {
  databasePromise ??= openDB<RetroSnapCameraDb>(DATABASE_NAME, DATABASE_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(PHOTO_QUEUE_STORE)) {
        const store = database.createObjectStore(PHOTO_QUEUE_STORE, {
          keyPath: "localPhotoId",
        });

        store.createIndex("eventId", "eventId");
        store.createIndex("uploadStatus", "uploadStatus");
        store.createIndex("capturedAt", "capturedAt");
        store.createIndex("nextRetryAt", "nextRetryAt");
      }
    },
  });

  return databasePromise;
}
