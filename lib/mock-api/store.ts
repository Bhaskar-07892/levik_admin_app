"use client";

import { useSyncExternalStore } from "react";
import { createSeedDatabase, DEMO_DATA_VERSION } from "@/lib/mock-data/seed";
import { readJson, StorageError, STORAGE_KEYS, writeJson } from "@/lib/storage/browser-storage";
import type { Database } from "@/types";

/**
 * Client-side demo database. Reads come from an in-memory snapshot; every mutation goes through
 * `commit`, which applies changes to a copy, swaps it in atomically and persists it to localStorage.
 *
 * Browser storage gives no concurrency or financial-grade guarantees; it exists only for the demo.
 */
let current: Database | null = null;
let storageWarning: string | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function persist(db: Database) {
  try {
    writeJson(STORAGE_KEYS.database, db);
    storageWarning = null;
  } catch (error) {
    storageWarning =
      error instanceof StorageError
        ? error.message
        : "Changes could not be saved to browser storage. They will be lost on refresh.";
  }
}

function load(): Database {
  try {
    const stored = readJson<Database>(STORAGE_KEYS.database);
    if (stored && stored.version === DEMO_DATA_VERSION) return stored;
  } catch (error) {
    storageWarning = error instanceof StorageError ? error.message : "Browser storage could not be read.";
  }
  const seeded = createSeedDatabase();
  persist(seeded);
  return seeded;
}

export function getDb(): Database {
  if (!current) current = load();
  return current;
}

export function commit<T>(mutator: (draft: Database) => T): T {
  const draft = structuredClone(getDb());
  const result = mutator(draft);
  current = draft;
  persist(draft);
  emit();
  return result;
}

export function resetDemoDatabase(): void {
  current = createSeedDatabase();
  persist(current);
  emit();
}

export function getStorageWarning(): string | null {
  return storageWarning;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEYS.database) {
      current = load();
      emit();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Database snapshot, or null during server rendering and hydration. */
export function useDatabaseSnapshot(): Database | null {
  return useSyncExternalStore(subscribe, getDb, () => null);
}

/** Use inside the admin shell, which only renders children once the database is loaded. */
export function useDb(): Database {
  const db = useDatabaseSnapshot();
  if (!db) throw new Error("useDb() called before the demo database was loaded.");
  return db;
}
