"use client";

import { useSyncExternalStore } from "react";
import { readJson, removeKey, STORAGE_KEYS, writeJson } from "./browser-storage";

/** Simulated demo session. This is NOT production authentication. */
export interface DemoSession {
  email: string;
  name: string;
  signedInAt: string;
}

export const DEMO_CREDENTIALS = {
  email: "admin@levik.demo",
  password: "LevikDemo@123",
} as const;

type SessionState = DemoSession | null | undefined; // undefined = not yet read (server / hydration)

const listeners = new Set<() => void>();
let cached: SessionState = undefined;

function read(): DemoSession | null {
  try {
    return readJson<DemoSession>(STORAGE_KEYS.session);
  } catch {
    return null;
  }
}

function emit() {
  for (const listener of listeners) listener();
}

export function signIn(email: string, password: string, name: string): DemoSession {
  if (email.trim().toLowerCase() !== DEMO_CREDENTIALS.email || password !== DEMO_CREDENTIALS.password) {
    throw new Error("Invalid email or password. Use the demo credentials shown on this page.");
  }
  const session: DemoSession = { email: DEMO_CREDENTIALS.email, name, signedInAt: new Date().toISOString() };
  try {
    writeJson(STORAGE_KEYS.session, session);
  } catch {
    // Session still works in memory for this tab.
  }
  cached = session;
  emit();
  return session;
}

export function signOut() {
  try {
    removeKey(STORAGE_KEYS.session);
  } catch {
    // ignore
  }
  cached = null;
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEYS.session) {
      cached = read();
      emit();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): SessionState {
  if (cached === undefined) cached = read();
  return cached;
}

/** Returns undefined until the client has read storage, then the session or null. */
export function useSession(): SessionState {
  return useSyncExternalStore(subscribe, getSnapshot, () => undefined);
}
