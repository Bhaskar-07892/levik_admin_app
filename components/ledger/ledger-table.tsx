"use client";

import Link from "next/link";
import { useState } from "react";
import { DataTable, type Column, type ServerPagination } from "@/components/data-table/data-table";
import { RoleBadge, StatusBadge } from "@/components/shared/status-badge";
import { $api } from "@/lib/api/client";
import type { LedgerEntry } from "@/lib/api/types";
import { formatDateTime, formatNumber } from "@/lib/utils/format";

export function relatedHref(related: LedgerEntry["related"]): string | undefined {
  if (!related) return undefined;
  const base = { scan: "/scans", invoice: "/invoices", redemption: "/redemptions", scheme: "/schemes" }[related.type];
  return `${base}/${related.id}`;
}

export function userHref(entry: Pick<LedgerEntry, "userId" | "userRole">): string {
  return `${entry.userRole === "plumber" ? "/plumbers" : "/retailers"}/${entry.userId}`;
}

export function LedgerTable({
  rows,
  showUser = true,
  onOpen,
  pagination,
  loading,
}: {
  rows: LedgerEntry[];
  showUser?: boolean;
  onOpen?: (row: LedgerEntry) => void;
  pagination?: ServerPagination;
  loading?: boolean;
}) {
  const columns: Column<LedgerEntry>[] = [
    { id: "id", header: "Transaction", cell: (r) => <span className="font-mono text-xs">{r.id}</span> },
    ...(showUser
      ? [
          {
            id: "user",
            header: "User",
            cell: (r: LedgerEntry) => (
              <div className="flex items-center gap-2">
                <span className="font-medium">{r.userName}</span>
                <RoleBadge role={r.userRole} />
              </div>
            ),
          },
        ]
      : []),
    { id: "source", header: "Source", cell: (r) => r.source },
    {
      id: "related",
      header: "Related",
      cell: (r) => {
        const href = relatedHref(r.related);
        return href ? (
          <Link href={href} onClick={(e) => e.stopPropagation()} className="font-mono text-xs text-primary hover:underline">
            {r.related!.id}
          </Link>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    {
      id: "credit",
      header: "Credit",
      align: "right",
      cell: (r) => (r.credit ? <span className="font-medium text-success">+{formatNumber(r.credit)}</span> : <span className="text-muted-foreground">—</span>),
    },
    {
      id: "debit",
      header: "Debit",
      align: "right",
      cell: (r) => (r.debit ? <span className="font-medium text-destructive">−{formatNumber(r.debit)}</span> : <span className="text-muted-foreground">—</span>),
    },
    { id: "date", header: "Date", cell: (r) => <span className="whitespace-nowrap">{formatDateTime(r.createdAt)}</span> },
    { id: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
  ];
  return (
    <DataTable
      caption="Points ledger transactions"
      data={rows}
      columns={columns}
      getRowId={(r) => r.id}
      onRowClick={onOpen}
      pagination={pagination}
      loading={loading}
      emptyTitle="No ledger transactions"
      emptyDescription="Points credits and debits will appear here."
    />
  );
}

/** One participant's ledger (detail-page tab), newest first. */
export function RelatedLedger({ userId }: { userId: string }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = $api.useQuery("get", "/api/v1/admin/points/ledger", { params: { query: { userId, page, pageSize: 10 } } });
  return (
    <LedgerTable
      rows={data?.items ?? []}
      showUser={false}
      loading={isLoading}
      pagination={{ page, pageSize: 10, total: data?.total ?? 0, onPageChange: setPage }}
    />
  );
}
