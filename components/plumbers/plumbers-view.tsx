"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { DataTable, type Column } from "@/components/data-table/data-table";
import { TableToolbar } from "@/components/data-table/table-toolbar";
import { SimpleSelect, toOptions } from "@/components/forms/simple-select";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { $api } from "@/lib/api/client";
import type { PlumberListItem, QueryOf } from "@/lib/api/types";
import { usePagedList } from "@/lib/hooks/use-paged-list";
import { formatDate, formatNumber } from "@/lib/utils/format";
import { ACCOUNT_STATUSES, PLUMBER_VERIFICATION_STATUSES } from "@/types";

export function PlumbersView() {
  const list = usePagedList({ verificationStatus: "all", accountStatus: "all", state: "all" }, { sort: { id: "id", desc: false } });
  const { data, isFetching } = $api.useQuery(
    "get",
    "/api/v1/admin/plumbers",
    { params: { query: list.query as QueryOf<"/api/v1/admin/plumbers"> } },
    { placeholderData: keepPreviousData },
  );
  const { data: states = [] } = $api.useQuery("get", "/api/v1/admin/plumbers/states", {}, { staleTime: 5 * 60_000 });

  const columns: Column<PlumberListItem>[] = [
    { id: "id", header: "Plumber ID", cell: (p) => <span className="font-mono text-xs">{p.id}</span>, sortable: true },
    {
      id: "name",
      header: "Name",
      cell: (p) => (
        <div>
          <p className="font-medium">{p.name}</p>
          <p className="text-xs text-muted-foreground">{p.mobile}</p>
        </div>
      ),
      sortable: true,
    },
    { id: "city", header: "City", cell: (p) => p.city },
    { id: "state", header: "State", cell: (p) => p.state },
    { id: "registeredAt", header: "Registered", cell: (p) => formatDate(p.registeredAt), sortable: true },
    { id: "verification", header: "Verification", cell: (p) => <StatusBadge status={p.verificationStatus} /> },
    { id: "account", header: "Account", cell: (p) => <StatusBadge status={p.accountStatus} /> },
    { id: "lifetime", header: "Lifetime pts", align: "right", cell: (p) => formatNumber(p.lifetimePoints) },
    {
      id: "availablePoints",
      header: "Available pts",
      align: "right",
      cell: (p) => <span className="font-semibold text-primary">{formatNumber(p.availablePoints)}</span>,
      sortable: true,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Plumbers"
        description="Registered plumbers, their KYC verification and account status, and points balances derived from the ledger."
      />
      <div className="rounded-xl border border-border bg-card">
        <TableToolbar search={list.search} onSearchChange={list.setSearch} placeholder="Search name, ID, mobile or city">
          <SimpleSelect
            value={list.filters.verificationStatus}
            onValueChange={(value) => list.setFilter("verificationStatus", value)}
            options={toOptions(PLUMBER_VERIFICATION_STATUSES, "All verification")}
            ariaLabel="Filter by verification"
          />
          <SimpleSelect
            value={list.filters.accountStatus}
            onValueChange={(value) => list.setFilter("accountStatus", value)}
            options={toOptions(ACCOUNT_STATUSES, "All accounts")}
            ariaLabel="Filter by account status"
          />
          <SimpleSelect value={list.filters.state} onValueChange={(value) => list.setFilter("state", value)} options={toOptions(states as string[], "All states")} ariaLabel="Filter by state" />
        </TableToolbar>
        <DataTable
          caption="Plumbers"
          data={data?.items ?? []}
          columns={columns}
          getRowId={(p) => p.id}
          rowHref={(p) => `/plumbers/${p.id}`}
          loading={isFetching}
          serverSort={{ value: list.sort, onChange: list.setSort }}
          pagination={{ page: list.page, pageSize: list.pageSize, total: data?.total ?? 0, onPageChange: list.setPage }}
        />
      </div>
    </div>
  );
}
