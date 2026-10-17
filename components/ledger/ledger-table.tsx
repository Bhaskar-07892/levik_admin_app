"use client";

import Link from "next/link";
import { DataTable, type Column } from "@/components/data-table/data-table";
import { RoleBadge, StatusBadge } from "@/components/shared/status-badge";
import type { LedgerRow } from "@/lib/mock-api/queries";
import { formatDateTime, formatNumber } from "@/lib/utils/format";
import type { PointsTransaction } from "@/types";

export function relatedHref(related: PointsTransaction["related"]): string | undefined {
  if (!related) return undefined;
  const base = { scan: "/scans", invoice: "/invoices", redemption: "/redemptions", scheme: "/schemes" }[related.type];
  return `${base}/${related.id}`;
}

export function LedgerTable({
  rows,
  showUser = true,
  onOpen,
  pageSize = 10,
}: {
  rows: LedgerRow[];
  showUser?: boolean;
  onOpen?: (row: LedgerRow) => void;
  pageSize?: number;
}) {
  const columns: Column<LedgerRow>[] = [
    { id: "id", header: "Transaction", cell: (r) => <span className="font-mono text-xs">{r.id}</span>, sortValue: (r) => r.id },
    ...(showUser
      ? [
          {
            id: "user",
            header: "User",
            cell: (r: LedgerRow) => (
              <div className="flex items-center gap-2">
                <span className="font-medium">{r.userName}</span>
                <RoleBadge role={r.userRole} />
              </div>
            ),
            sortValue: (r: LedgerRow) => r.userName,
          },
        ]
      : []),
    { id: "source", header: "Source", cell: (r) => r.source, sortValue: (r) => r.source },
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
      sortValue: (r) => r.credit,
    },
    {
      id: "debit",
      header: "Debit",
      align: "right",
      cell: (r) => (r.debit ? <span className="font-medium text-destructive">−{formatNumber(r.debit)}</span> : <span className="text-muted-foreground">—</span>),
      sortValue: (r) => r.debit,
    },
    { id: "date", header: "Date", cell: (r) => <span className="whitespace-nowrap">{formatDateTime(r.createdAt)}</span>, sortValue: (r) => r.createdAt },
    { id: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
  ];
  return (
    <DataTable
      caption="Points ledger transactions"
      data={rows}
      columns={columns}
      getRowId={(r) => r.id}
      onRowClick={onOpen}
      pageSize={pageSize}
      initialSort={{ id: "date", desc: true }}
      emptyTitle="No ledger transactions"
      emptyDescription="Points credits and debits will appear here."
    />
  );
}
