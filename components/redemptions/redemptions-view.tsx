"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { TableToolbar } from "@/components/data-table/table-toolbar";
import { SimpleSelect } from "@/components/forms/simple-select";
import { DemoNotice } from "@/components/shared/demo-notice";
import { PageHeader } from "@/components/shared/page-header";
import { StatusTabs } from "@/components/shared/status-tabs";
import { $api } from "@/lib/api/client";
import { useStatusCounts } from "@/lib/api/hooks";
import type { QueryOf } from "@/lib/api/types";
import { usePagedList } from "@/lib/hooks/use-paged-list";
import { REDEMPTION_STATUSES, type RedemptionStatus } from "@/types";
import { RedemptionsTable } from "./redemptions-table";

type Tab = "all" | RedemptionStatus;

export function RedemptionsView() {
  const list = usePagedList<{ status: Tab; role: string }>({ status: "all", role: "all" });
  const { data, isFetching } = $api.useQuery(
    "get",
    "/api/v1/admin/redemptions",
    { params: { query: list.query as QueryOf<"/api/v1/admin/redemptions"> } },
    { placeholderData: keepPreviousData },
  );
  const { counts, total } = useStatusCounts("/api/v1/admin/redemptions/status-counts");

  return (
    <div>
      <PageHeader title="Redemptions" description="Reward requests from plumbers and retailers. Approve to deduct points, then track fulfilment through to delivery." />
      <DemoNotice>
        Points are deducted exactly once, at approval. Later status changes never deduct again; cancellations and failures after approval refund once and restore stock.
      </DemoNotice>
      <div className="rounded-xl border border-border bg-card">
        <StatusTabs
          label="Redemption status"
          value={list.filters.status}
          onChange={(value) => list.setFilter("status", value)}
          tabs={(["all", ...REDEMPTION_STATUSES] as Tab[]).map((value) => ({
            value,
            label: value === "all" ? "All" : value,
            count: value === "all" ? total : (counts[value] ?? 0),
          }))}
        />
        <TableToolbar search={list.search} onSearchChange={list.setSearch} placeholder="Search reference, user or reward">
          <SimpleSelect
            value={list.filters.role}
            onValueChange={(value) => list.setFilter("role", value)}
            ariaLabel="Filter by role"
            options={[
              { value: "all", label: "All roles" },
              { value: "plumber", label: "Plumbers" },
              { value: "retailer", label: "Retailers" },
            ]}
          />
        </TableToolbar>
        <RedemptionsTable
          rows={data?.items ?? []}
          loading={isFetching}
          pagination={{ page: list.page, pageSize: list.pageSize, total: data?.total ?? 0, onPageChange: list.setPage }}
        />
      </div>
    </div>
  );
}
