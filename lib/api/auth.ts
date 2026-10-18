"use client";

import { useSyncExternalStore } from "react";
import { ApiError } from "./errors";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4100").replace(/\/$/, "");

/**
 * Admin session backed by the Levik API.
 *
 * - The short-lived access token (15 min) lives only in memory.
 * - The rotating refresh token is kept in localStorage so a reload keeps you signed in. Refreshes are
 *   serialised across tabs with the Web Locks API: two tabs rotating the same token at once would
 *   trip the API's reuse detection and sign every session out.
 */
export interface SessionUser {
  id: string;
  role: string;
  name?: string;
}

export type SessionState =
  | { status: "loading" }
  | { status: "anonymous" }
  | { status: "authenticated"; user: SessionUser };

interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
}

const REFRESH_KEY = "levik-admin:refresh-token";
const LOCK_NAME = "levik-admin:refresh";

let accessToken: string | null = null;
let state: SessionState = { status: "loading" };
let bootstrapped = false;
let inflightRefresh: Promise<string | null> | null = null;
const listeners = new Set<() => void>();

function setState(next: SessionState) {
  state = next;
  for (const listener of listeners) listener();
}

function readRefreshToken(): string | null {
  try {
    return window.localStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

function writeRefreshToken(token: string | null) {
  try {
    if (token) window.localStorage.setItem(REFRESH_KEY, token);
    else window.localStorage.removeItem(REFRESH_KEY);
  } catch {
    // Storage blocked: the session still works in this tab until the access token expires.
  }
}

function accept(tokens: TokenResponse) {
  accessToken = tokens.accessToken;
  writeRefreshToken(tokens.refreshToken);
  setState({ status: "authenticated", user: tokens.user });
}

function clearLocal() {
  accessToken = null;
  writeRefreshToken(null);
  setState({ status: "anonymous" });
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw await ApiError.fromResponse(response);
  return (response.status === 204 ? undefined : await response.json()) as T;
}

async function withRefreshLock<T>(work: () => Promise<T>): Promise<T> {
  if (typeof navigator !== "undefined" && navigator.locks) return navigator.locks.request(LOCK_NAME, work);
  return work();
}

/** Exchanges the stored refresh token for a new token pair. Returns the access token, or null if signed out. */
export function refreshAccessToken(): Promise<string | null> {
  inflightRefresh ??= withRefreshLock(async () => {
    // Re-read inside the lock: another tab may already have rotated the token.
    const refreshToken = readRefreshToken();
    if (!refreshToken) {
      clearLocal();
      return null;
    }
    try {
      const tokens = await postJson<TokenResponse>("/api/v1/auth/refresh", { refreshToken });
      if (tokens.user.role !== "admin") throw new ApiError(403, "FORBIDDEN", "This portal is for Levik admins only.");
      accept(tokens);
      return tokens.accessToken;
    } catch (error) {
      // Network failure: keep the refresh token and retry later. Rejected token: sign out.
      if (error instanceof ApiError) clearLocal();
      else if (state.status === "loading") setState({ status: "anonymous" });
      return null;
    }
  }).finally(() => {
    inflightRefresh = null;
  });
  return inflightRefresh;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export async function signIn(email: string, password: string): Promise<SessionUser> {
  const tokens = await postJson<TokenResponse>("/api/v1/auth/admin/login", { email, password });
  accept(tokens);
  return tokens.user;
}

export async function signOut(): Promise<void> {
  const refreshToken = readRefreshToken();
  clearLocal();
  if (refreshToken) {
    // Best effort: the server revokes the refresh token; the access token expires on its own.
    await postJson("/api/v1/auth/logout", { refreshToken }).catch(() => undefined);
  }
}

/** Updates the cached display name after the admin edits their profile. */
export function updateSessionUser(patch: Partial<SessionUser>) {
  if (state.status === "authenticated") setState({ status: "authenticated", user: { ...state.user, ...patch } });
}

/** Keys left behind by the localStorage demo build (mock database and fake session). */
const LEGACY_KEYS = ["levik-admin:demo-db", "levik-admin:session"];

function bootstrap() {
  if (bootstrapped) return;
  bootstrapped = true;
  try {
    for (const key of LEGACY_KEYS) window.localStorage.removeItem(key);
  } catch {
    // Storage blocked: nothing to clean up.
  }
  if (readRefreshToken()) void refreshAccessToken();
  else setState({ status: "anonymous" });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  bootstrap();
  const onStorage = (event: StorageEvent) => {
    // Signed out in another tab.
    if (event.key === REFRESH_KEY && event.newValue === null && state.status === "authenticated") {
      accessToken = null;
      setState({ status: "anonymous" });
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const LOADING: SessionState = { status: "loading" };

export function useSession(): SessionState {
  return useSyncExternalStore(subscribe, () => state, () => LOADING);
}
