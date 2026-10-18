"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { TableToolbar } from "@/components/data-table/table-toolbar";
import { SimpleSelect } from "@/components/forms/simple-select";
import { DemoNotice } from "@/components/shared/demo-notice";
import { PageHeader } from "@/components/shared/page-header";
import { StatusTabs } from "@/components/shared/status-tabs";
import { $api } from "@/lib/api/client";
import { useRetailerOptions, useSettings, useStatusCounts } from "@/lib/api/hooks";
import type { QueryOf } from "@/lib/api/types";
import { usePagedList } from "@/lib/hooks/use-paged-list";
import { INVOICE_STATUSES, type InvoiceStatus } from "@/types";
import { InvoicesTable } from "./invoices-table";

type Tab = "all" | InvoiceStatus;
const TAB_LABEL: Record<Tab, string> = {
  all: "All",
  Submitted: "Submitted",
  "Under Review": "Under review",
  Approved: "Approved",
  Rejected: "Rejected",
  "More Information Required": "Needs info",
};

export function InvoicesView() {
  const list = usePagedList<{ status: Tab; retailerId: string }>({ status: "all", retailerId: "all" });
  const { data, isFetching } = $api.useQuery(
    "get",
    "/api/v1/admin/invoices",
    { params: { query: list.query as QueryOf<"/api/v1/admin/invoices"> } },
    { placeholderData: keepPreviousData },
  );
  const { counts, total } = useStatusCounts("/api/v1/admin/invoices/status-counts");
  const retailers = useRetailerOptions();
  const { data: settings } = useSettings();

  return (
    <div>
      <PageHeader
        title="Invoice Management"
        description="Sales invoices uploaded by retailers. Review line items and the calculated incentive before approving."
      />
      <DemoNotice>
        Incentive rule: {settings?.retailerPointsPer100 ?? "—"} point per ₹100 of pre-GST value on active, reward-eligible products. Line items are entered by the
        retailer; check them against the uploaded document.
      </DemoNotice>
      <div className="rounded-xl border border-border bg-card">
        <StatusTabs
          label="Invoice status"
          value={list.filters.status}
          onChange={(value) => list.setFilter("status", value)}
          tabs={(["all", ...INVOICE_STATUSES] as Tab[]).map((value) => ({
            value,
            label: TAB_LABEL[value],
            count: value === "all" ? total : (counts[value] ?? 0),
          }))}
        />
        <TableToolbar search={list.search} onSearchChange={list.setSearch} placeholder="Search invoice no., retailer, buyer">
          <SimpleSelect
            value={list.filters.retailerId}
            onValueChange={(value) => list.setFilter("retailerId", value)}
            ariaLabel="Filter by retailer"
            options={[{ value: "all", label: "All retailers" }, ...retailers]}
          />
        </TableToolbar>
        <InvoicesTable
          rows={data?.items ?? []}
          loading={isFetching}
          pagination={{ page: list.page, pageSize: list.pageSize, total: data?.total ?? 0, onPageChange: list.setPage }}
        />
      </div>
    </div>
  );
}
