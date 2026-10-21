"use client";

import { QueryClient } from "@tanstack/react-query";
import createFetchClient, { type Middleware } from "openapi-fetch";
import createQueryClient from "openapi-react-query";
import { API_URL, getAccessToken, refreshAccessToken } from "./auth";
import { ApiError } from "./errors";
import type { paths } from "./schema";

/** Adds the bearer token and, on a 401, refreshes once and retries the request. */
async function authFetch(input: Request): Promise<Response> {
  const retry = input.clone();
  const send = (request: Request, token: string | null) => {
    if (token) request.headers.set("authorization", `Bearer ${token}`);
    return fetch(request);
  };

  let token = getAccessToken() ?? (await refreshAccessToken());
  const response = await send(input, token);
  if (response.status !== 401 || new URL(input.url).pathname.startsWith("/api/v1/auth/")) return response;

  token = await refreshAccessToken();
  return token ? send(retry, token) : response;
}

/** Turns every non-2xx response into an ApiError so queries and mutations fail the same way. */
const throwOnError: Middleware = {
  async onResponse({ response }) {
    if (!response.ok) throw await ApiError.fromResponse(response);
    return undefined;
  },
};

export const api = createFetchClient<paths>({ baseUrl: API_URL, fetch: authFetch });
api.use(throwOnError);

/** Typed TanStack Query hooks: `$api.useQuery("get", "/api/v1/admin/plumbers", { params: { query } })`. */
export const $api = createQueryClient(api);

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      refetchOnWindowFocus: true,
      retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 2,
    },
  },
});

/**
 * After any successful mutation, refetch the queries on screen. An approval changes balances, queue
 * counts, dashboards and scheme progress at once; only active queries refetch, so this stays cheap.
 */
export function refreshAfterMutation(): Promise<void> {
  return queryClient.invalidateQueries();
}

/** Unwraps an openapi-fetch result (errors were already thrown by the middleware). */
export async function call<T>(request: Promise<{ data?: T; error?: unknown }>): Promise<T> {
  const { data } = await request;
  return data as T;
}

async function fetchFile(path: string, query: Record<string, string | number | undefined> = {}): Promise<Response> {
  const url = new URL(`${API_URL}${path}`);
  for (const [key, value] of Object.entries(query)) if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
  const response = await authFetch(new Request(url));
  if (!response.ok) throw await ApiError.fromResponse(response);
  return response;
}

export type UploadPurpose = "product-image";

/** Multipart upload to POST /uploads. Returns the upload key (image ID) and a signed link to show it. */
export async function uploadFile(file: File, purpose: UploadPurpose): Promise<{ key: string; url: string }> {
  const form = new FormData();
  form.append("purpose", purpose);
  form.append("file", file, file.name);
  const response = await authFetch(new Request(`${API_URL}/api/v1/uploads`, { method: "POST", body: form }));
  if (!response.ok) throw await ApiError.fromResponse(response);
  return (await response.json()) as { key: string; url: string };
}

/** Fetches an authenticated file (upload, PDF) and returns a blob: URL. Revoke it with URL.revokeObjectURL when done. */
export async function fetchObjectUrl(path: string): Promise<{ url: string; type: string }> {
  const blob = await (await fetchFile(path)).blob();
  return { url: URL.createObjectURL(blob), type: blob.type };
}

/** Downloads an authenticated file (CSV/PDF) from the API. */
export async function downloadFile(path: string, query: Record<string, string | number | undefined>, fallbackName: string) {
  const response = await fetchFile(path, query);
  const blob = await response.blob();
  const name = /filename="([^"]+)"/.exec(response.headers.get("content-disposition") ?? "")?.[1] ?? fallbackName;
  const href = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement("a"), { href, download: name });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}
