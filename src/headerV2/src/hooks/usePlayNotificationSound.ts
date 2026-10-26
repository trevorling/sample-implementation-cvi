import { useCallback } from "react";
import { useDing } from "./useAudio";

const DATABASE_NAME = "byk-notification-sounds";
const DATABASE_VERSION = 1;
const STORE_NAME = "played-events";
const EVENT_RETENTION_MS = 60 * 60 * 1000;

interface PlayedEventRecord {
  eventUuid: string;
  createdAt: number;
}

let databasePromise: Promise<IDBDatabase> | null = null;

const openDatabase = (): Promise<IDBDatabase> => {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is unavailable"));
  }

  if (!databasePromise) {
    databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          const store = database.createObjectStore(STORE_NAME, { keyPath: "eventUuid" });
          store.createIndex("createdAt", "createdAt");
        }
      };

      request.onsuccess = () => {
        const database = request.result;
        database.onversionchange = () => {
          database.close();
          databasePromise = null;
        };
        resolve(database);
      };

      request.onerror = () => reject(request.error ?? new Error("Unable to open sound deduplication database"));
    }).catch((error: unknown) => {
      databasePromise = null;
      throw error;
    });
  }

  return databasePromise;
};

const removeExpiredEvents = (database: IDBDatabase): Promise<void> =>
  new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const expirationTime = Date.now() - EVENT_RETENTION_MS;
    const cursorRequest = store.index("createdAt").openCursor(IDBKeyRange.upperBound(expirationTime));

    cursorRequest.onsuccess = () => {
      const cursor = cursorRequest.result;
      if (!cursor) return;

      cursor.delete();
      cursor.continue();
    };

    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error("Unable to clean sound deduplication records"));
  });

const claimEvent = async (eventUuid: string): Promise<boolean> => {
  const database = await openDatabase();
  await removeExpiredEvents(database);

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const record: PlayedEventRecord = {
      eventUuid,
      createdAt: Date.now(),
    };
    const request = transaction.objectStore(STORE_NAME).add(record);
    let claimed = false;

    request.onsuccess = () => {
      claimed = true;
    };

    request.onerror = (event) => {
      if (request.error?.name === "ConstraintError") {
        // A duplicate UUID is an expected result; keep the transaction from aborting.
        event.preventDefault();
        event.stopPropagation();
      }
    };

    transaction.oncomplete = () => resolve(claimed);
    transaction.onabort = () => reject(transaction.error ?? request.error ?? new Error("Unable to claim notification event"));
  });
};

/** Plays a sound once per event UUID across all tabs in this browser profile. */
export const usePlayNotificationSound = (soundEnabled: boolean) => {
  const ding = useDing();

  return useCallback(async (eventUuid: string): Promise<boolean> => {
    if (!soundEnabled || !eventUuid.trim()) return false;
    const normalizedEventUuid = eventUuid.trim();

    try {
      const claimed = await claimEvent(normalizedEventUuid);
      if (!claimed) return false;

      ding.pause();
      ding.currentTime = 0;
      await ding.play();
      return true;
    } catch (error) {
      console.error("Unable to play notification sound", error);
      return false;
    }
  }, [ding, soundEnabled]);
};
