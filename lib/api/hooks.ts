"use client";

import { $api } from "./client";

/** Queries shared by the shell and several pages. */
export const useSettings = () => $api.useQuery("get", "/api/v1/admin/settings", {}, { staleTime: 60_000 });
export const useAdminProfile = () => $api.useQuery("get", "/api/v1/admin/me", {}, { staleTime: 60_000 });
export const useNotifications = () => $api.useQuery("get", "/api/v1/admin/notifications", {}, { refetchInterval: 60_000 });

type CountsPath =
  | "/api/v1/admin/scans/status-counts"
  | "/api/v1/admin/invoices/status-counts"
  | "/api/v1/admin/redemptions/status-counts"
  | "/api/v1/admin/schemes/status-counts"
  | "/api/v1/admin/support-tickets/status-counts"
  | "/api/v1/admin/orders/status-counts";

/** Per-status totals for the status tabs (independent of the current search/filters). */
export function useStatusCounts(path: CountsPath) {
  const query = $api.useQuery("get", path, {});
  const counts = (query.data ?? {}) as Record<string, number>;
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
  return { counts, total, isLoading: query.isLoading };
}

/** Retailer id → shop name options for filter dropdowns (the programme has a few hundred retailers at most). */
export function useRetailerOptions() {
  const { data } = $api.useQuery(
    "get",
    "/api/v1/admin/retailers",
    { params: { query: { pageSize: 100, sort: "shopName", order: "asc" } } },
    { staleTime: 5 * 60_000 },
  );
  return (data?.items ?? []).map((r) => ({ value: r.id, label: r.shopName }));
}

export function useProductOptions() {
  const { data } = $api.useQuery("get", "/api/v1/admin/products", { params: { query: { pageSize: 100 } } }, { staleTime: 5 * 60_000 });
  return data?.items ?? [];
}
