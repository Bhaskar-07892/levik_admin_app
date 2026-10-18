"use client";

import Link from "next/link";
import { keepPreviousData } from "@tanstack/react-query";
import { useState } from "react";
import { TableToolbar } from "@/components/data-table/table-toolbar";
import { SimpleSelect, toOptions } from "@/components/forms/simple-select";
import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { DetailGrid } from "@/components/shared/section-card";
import { RoleBadge, StatusBadge } from "@/components/shared/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { $api } from "@/lib/api/client";
import type { LedgerEntry, QueryOf } from "@/lib/api/types";
import { usePagedList } from "@/lib/hooks/use-paged-list";
import { formatDateTime, formatNumber } from "@/lib/utils/format";
import { POINTS_SOURCES } from "@/types";
import { ArrowDownLeft, ArrowUpRight, Scale } from "lucide-react";
import { LedgerTable, relatedHref, userHref } from "./ledger-table";

export function LedgerView({ initialSearch }: { initialSearch?: string }) {
  const list = usePagedList({ role: "all", source: "all", direction: "all" }, { initialSearch });
  const query = list.query as QueryOf<"/api/v1/admin/points/ledger">;
  const { data, isFetching } = $api.useQuery("get", "/api/v1/admin/points/ledger", { params: { query } }, { placeholderData: keepPreviousData });
  // Totals use the same filters, computed by the API over every matching row (not just this page).
  const totalsQuery = list.filterQuery as QueryOf<"/api/v1/admin/points/ledger/totals">;
  const { data: totals } = $api.useQuery("get", "/api/v1/admin/points/ledger/totals", { params: { query: totalsQuery } }, { placeholderData: keepPreviousData });
  const [selected, setSelected] = useState<LedgerEntry | null>(null);

  const credited = totals?.credited ?? 0;
  const debited = totals?.debited ?? 0;
  const related = selected ? relatedHref(selected.related) : undefined;

  return (
    <div>
      <PageHeader
        title="Points Ledger"
        description="Append-only record of every points credit and debit. All plumber and retailer balances are derived from these entries."
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <KpiCard label="Credited (filtered)" value={formatNumber(credited)} icon={ArrowDownLeft} accent="success" />
        <KpiCard label="Debited (filtered)" value={formatNumber(debited)} icon={ArrowUpRight} accent="warning" />
        <KpiCard label="Net outstanding" value={formatNumber(credited - debited)} hint={`${formatNumber(totals?.count ?? 0)} transactions`} icon={Scale} accent="gold" />
      </div>
      <div className="rounded-xl border border-border bg-card">
        <TableToolbar search={list.search} onSearchChange={list.setSearch} placeholder="Search transaction, user, reference">
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
          <SimpleSelect value={list.filters.source} onValueChange={(value) => list.setFilter("source", value)} options={toOptions(POINTS_SOURCES, "All sources")} ariaLabel="Filter by source" />
          <SimpleSelect
            value={list.filters.direction}
            onValueChange={(value) => list.setFilter("direction", value)}
            ariaLabel="Filter by transaction type"
            options={[
              { value: "all", label: "Credits & debits" },
              { value: "credit", label: "Credits only" },
              { value: "debit", label: "Debits only" },
            ]}
          />
        </TableToolbar>
        <LedgerTable
          rows={data?.items ?? []}
          onOpen={setSelected}
          loading={isFetching}
          pagination={{ page: list.page, pageSize: list.pageSize, total: data?.total ?? 0, onPageChange: list.setPage }}
        />
      </div>

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Transaction {selected?.id}</DialogTitle>
            <DialogDescription>{selected?.note}</DialogDescription>
          </DialogHeader>
          {selected ? (
            <>
              <DetailGrid
                items={[
                  {
                    label: "User",
                    value: (
                      <span className="flex items-center gap-2">
                        <Link href={userHref(selected)} className="text-primary hover:underline">
                          {selected.userName}
                        </Link>
                        <RoleBadge role={selected.userRole} />
                      </span>
                    ),
                  },
                  { label: "Source", value: selected.source },
                  { label: "Credit", value: selected.credit ? `+${formatNumber(selected.credit)} pts` : "—" },
                  { label: "Debit", value: selected.debit ? `−${formatNumber(selected.debit)} pts` : "—" },
                  { label: "Date", value: formatDateTime(selected.createdAt) },
                  { label: "Posted by", value: selected.createdBy },
                  { label: "Status", value: <StatusBadge status={selected.status} /> },
                  { label: "Related record", value: selected.related ? <span className="font-mono">{selected.related.id}</span> : "None (manual entry)" },
                ]}
              />
              <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
                <Link href={userHref(selected)} className={buttonVariants({ variant: "outline" })}>
                  Open {selected.userRole} profile
                </Link>
                {related ? (
                  <Link href={related} className={buttonVariants()}>
                    Open related {selected.related?.type}
                  </Link>
                ) : null}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
