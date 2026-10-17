/**
 * Thin wrapper around window.localStorage. All browser storage access goes through here so
 * Server Components never touch `window`, and storage failures surface as typed errors.
 */
export class StorageError extends Error {}

function getStorage(): Storage {
  if (typeof window === "undefined") {
    throw new StorageError("Browser storage is not available on the server.");
  }
  try {
    return window.localStorage;
  } catch {
    throw new StorageError("Browser storage is blocked in this browser profile.");
  }
}

export function readJson<T>(key: string): T | null {
  const raw = getStorage().getItem(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    getStorage().setItem(key, JSON.stringify(value));
  } catch (error) {
    if (error instanceof StorageError) throw error;
    throw new StorageError("Browser storage is full or unavailable. Changes are kept only until you refresh.");
  }
}

export function removeKey(key: string): void {
  getStorage().removeItem(key);
}

export const STORAGE_KEYS = {
  database: "levik-admin:demo-db",
  session: "levik-admin:session",
} as const;
