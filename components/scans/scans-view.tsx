"use client";

import { TableToolbar } from "@/components/data-table/table-toolbar";
import { SimpleSelect } from "@/components/forms/simple-select";
import { DemoNotice } from "@/components/shared/demo-notice";
import { PageHeader } from "@/components/shared/page-header";
import { StatusTabs } from "@/components/shared/status-tabs";
import { keepPreviousData } from "@tanstack/react-query";
import { $api } from "@/lib/api/client";
import { useRetailerOptions, useStatusCounts } from "@/lib/api/hooks";
import type { QueryOf } from "@/lib/api/types";
import { usePagedList } from "@/lib/hooks/use-paged-list";
import { SCAN_STATUSES, type ScanStatus } from "@/types";
import { ScansTable } from "./scans-table";

type Tab = "all" | ScanStatus;

export function ScansView() {
  const list = usePagedList<{ status: Tab; retailerId: string }>({ status: "Pending", retailerId: "all" });
  const { data, isFetching } = $api.useQuery(
    "get",
    "/api/v1/admin/scans",
    { params: { query: list.query as QueryOf<"/api/v1/admin/scans"> } },
    { placeholderData: keepPreviousData },
  );
  const { counts, total } = useStatusCounts("/api/v1/admin/scans/status-counts");
  const retailers = useRetailerOptions();

  return (
    <div>
      <PageHeader
        title="Product Scans"
        description="Plumber product scans awaiting verification. A scan alone is not proof of sale: approve only when the retailer or invoice reference checks out."
      />
      <DemoNotice>Approving a scan claims the product&apos;s QR label, credits the plumber exactly once and writes a ledger and audit entry.</DemoNotice>
      <div className="rounded-xl border border-border bg-card">
        <StatusTabs
          label="Scan status"
          value={list.filters.status}
          onChange={(value) => list.setFilter("status", value)}
          tabs={(["all", ...SCAN_STATUSES] as Tab[]).map((value) => ({
            value,
            label: value === "all" ? "All" : value,
            count: value === "all" ? total : (counts[value] ?? 0),
          }))}
        />
        <TableToolbar search={list.search} onSearchChange={list.setSearch} placeholder="Search scan ref, serial, plumber, model">
          <SimpleSelect
            value={list.filters.retailerId}
            onValueChange={(value) => list.setFilter("retailerId", value)}
            ariaLabel="Filter by retailer"
            options={[{ value: "all", label: "All retailers" }, { value: "none", label: "No retailer reference" }, ...retailers]}
          />
        </TableToolbar>
        <ScansTable
          rows={data?.items ?? []}
          loading={isFetching}
          pagination={{ page: list.page, pageSize: list.pageSize, total: data?.total ?? 0, onPageChange: list.setPage }}
        />
      </div>
    </div>
  );
}
