"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { DataTable, type Column } from "@/components/data-table/data-table";
import { TableToolbar } from "@/components/data-table/table-toolbar";
import { SimpleSelect, toOptions } from "@/components/forms/simple-select";
import { PageHeader } from "@/components/shared/page-header";
import { ProgressBar } from "@/components/shared/progress-bar";
import { StatusBadge } from "@/components/shared/status-badge";
import { $api } from "@/lib/api/client";
import { useNotifications } from "@/lib/api/hooks";
import type { QueryOf, RetailerListItem } from "@/lib/api/types";
import { usePagedList } from "@/lib/hooks/use-paged-list";
import { formatINR } from "@/lib/utils/format";
import { RETAILER_ACCOUNT_STATUSES, RETAILER_VERIFICATION_STATUSES } from "@/types";

export function RetailersView() {
  const list = usePagedList({ verificationStatus: "all", accountStatus: "all", state: "all" }, { sort: { id: "id", desc: false } });
  const { data, isFetching } = $api.useQuery(
    "get",
    "/api/v1/admin/retailers",
    { params: { query: list.query as QueryOf<"/api/v1/admin/retailers"> } },
    { placeholderData: keepPreviousData },
  );
  const { data: states = [] } = $api.useQuery("get", "/api/v1/admin/retailers/states", {}, { staleTime: 5 * 60_000 });
  const pending = useNotifications().data?.counts.pendingRetailers ?? 0;

  const columns: Column<RetailerListItem>[] = [
    { id: "id", header: "Retailer ID", cell: (r) => <span className="font-mono text-xs">{r.id}</span>, sortable: true },
    {
      id: "shopName",
      header: "Shop",
      cell: (r) => (
        <div>
          <p className="font-medium">{r.shopName}</p>
          <p className="text-xs text-muted-foreground">
            {r.ownerName} · {r.mobile}
          </p>
        </div>
      ),
      sortable: true,
    },
    {
      id: "city",
      header: "City / State",
      cell: (r) => (
        <div>
          <p>{r.city}</p>
          <p className="text-xs text-muted-foreground">{r.state}</p>
        </div>
      ),
    },
    { id: "gstin", header: "GSTIN", cell: (r) => <span className="font-mono text-xs">{r.gstin ?? "Not registered"}</span> },
    { id: "verification", header: "Verification", cell: (r) => <StatusBadge status={r.verificationStatus} /> },
    { id: "sales30d", header: "Sales · 30 days", align: "right", cell: (r) => formatINR(r.sales30d), sortable: true },
    {
      id: "achievementPct",
      header: "Target",
      cell: (r) => (
        <div className="w-28">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">{formatINR(r.monthlyTarget)}</span>
            <span className="font-medium tabular-nums">{r.achievementPct}%</span>
          </div>
          <ProgressBar value={r.achievementPct} className="mt-1" />
        </div>
      ),
      sortable: true,
    },
    { id: "account", header: "Account", cell: (r) => <StatusBadge status={r.accountStatus} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Retailers"
        description={`Shops selling Levik products. ${pending ? `${pending} application${pending > 1 ? "s" : ""} awaiting approval. ` : ""}Sales and target achievement use approved invoices from the last 30 days.`}
      />
      <div className="rounded-xl border border-border bg-card">
        <TableToolbar search={list.search} onSearchChange={list.setSearch} placeholder="Search shop, owner, GSTIN or city">
          <SimpleSelect
            value={list.filters.verificationStatus}
            onValueChange={(value) => list.setFilter("verificationStatus", value)}
            options={toOptions(RETAILER_VERIFICATION_STATUSES, "All verification")}
            ariaLabel="Filter by verification"
          />
          <SimpleSelect
            value={list.filters.accountStatus}
            onValueChange={(value) => list.setFilter("accountStatus", value)}
            options={toOptions(RETAILER_ACCOUNT_STATUSES, "All accounts")}
            ariaLabel="Filter by account status"
          />
          <SimpleSelect value={list.filters.state} onValueChange={(value) => list.setFilter("state", value)} options={toOptions(states as string[], "All states")} ariaLabel="Filter by state" />
        </TableToolbar>
        <DataTable
          caption="Retailers"
          data={data?.items ?? []}
          columns={columns}
          getRowId={(r) => r.id}
          rowHref={(r) => `/retailers/${r.id}`}
          loading={isFetching}
          serverSort={{ value: list.sort, onChange: list.setSort }}
          pagination={{ page: list.page, pageSize: list.pageSize, total: data?.total ?? 0, onPageChange: list.setPage }}
        />
      </div>
    </div>
  );
}
