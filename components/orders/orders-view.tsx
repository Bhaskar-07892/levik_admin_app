"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { TableToolbar } from "@/components/data-table/table-toolbar";
import { PageHeader } from "@/components/shared/page-header";
import { StatusTabs } from "@/components/shared/status-tabs";
import { $api } from "@/lib/api/client";
import { useStatusCounts } from "@/lib/api/hooks";
import type { QueryOf } from "@/lib/api/types";
import { usePagedList } from "@/lib/hooks/use-paged-list";
import { ORDER_STATUSES, type OrderStatus } from "@/types";
import { OrdersTable } from "./orders-table";

type Tab = "all" | OrderStatus;

export function OrdersView() {
  const list = usePagedList<{ status: Tab }>({ status: "all" });
  const { data, isFetching } = $api.useQuery(
    "get",
    "/api/v1/admin/orders",
    { params: { query: list.query as QueryOf<"/api/v1/admin/orders"> } },
    { placeholderData: keepPreviousData },
  );
  const { counts, total } = useStatusCounts("/api/v1/admin/orders/status-counts");

  return (
    <div>
      <PageHeader
        title="Orders"
        description="Stock orders placed by retailers from the app. Confirm, dispatch and mark delivered: delivery adds the stock to the retailer's inventory and issues the purchase invoice."
      />
      <div className="rounded-xl border border-border bg-card">
        <StatusTabs
          label="Order status"
          value={list.filters.status}
          onChange={(value) => list.setFilter("status", value)}
          tabs={(["all", ...ORDER_STATUSES] as Tab[]).map((value) => ({
            value,
            label: value === "all" ? "All" : value,
            count: value === "all" ? total : (counts[value] ?? 0),
          }))}
        />
        <TableToolbar search={list.search} onSearchChange={list.setSearch} placeholder="Search order, retailer or invoice number" />
        <OrdersTable
          rows={data?.items ?? []}
          loading={isFetching}
          pagination={{ page: list.page, pageSize: list.pageSize, total: data?.total ?? 0, onPageChange: list.setPage }}
        />
      </div>
    </div>
  );
}
