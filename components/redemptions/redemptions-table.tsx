"use client";

import { DataTable, type Column } from "@/components/data-table/data-table";
import { RoleBadge, StatusBadge } from "@/components/shared/status-badge";
import type { RedemptionRow } from "@/lib/mock-api/queries";
import { formatDateTime, formatNumber } from "@/lib/utils/format";

export function RedemptionsTable({ rows, showUser = true, pageSize = 10 }: { rows: RedemptionRow[]; showUser?: boolean; pageSize?: number }) {
  const columns: Column<RedemptionRow>[] = [
    { id: "id", header: "Reference", cell: (r) => <span className="font-mono text-xs">{r.id}</span>, sortValue: (r) => r.id },
    ...(showUser
      ? [
          {
            id: "user",
            header: "User",
            cell: (r: RedemptionRow) => <span className="font-medium">{r.userName}</span>,
            sortValue: (r: RedemptionRow) => r.userName,
          },
          { id: "role", header: "Role", cell: (r: RedemptionRow) => <RoleBadge role={r.userRole} />, sortValue: (r: RedemptionRow) => r.userRole },
        ]
      : []),
    {
      id: "reward",
      header: "Reward",
      cell: (r) => (
        <div>
          <p className="max-w-[220px] truncate font-medium">{r.reward?.name}</p>
          <p className="text-xs text-muted-foreground">{r.reward?.type}</p>
        </div>
      ),
      sortValue: (r) => r.reward?.name ?? "",
    },
    {
      id: "points",
      header: "Points",
      align: "right",
      cell: (r) => (
        <span className={r.debitTxnId && !r.reversalTxnId ? "font-medium" : "text-muted-foreground"}>
          {formatNumber(r.pointsCost)}
          {!r.debitTxnId ? <span className="block text-[10px] text-muted-foreground">not yet deducted</span> : null}
          {r.reversalTxnId ? <span className="block text-[10px] text-muted-foreground">refunded</span> : null}
        </span>
      ),
      sortValue: (r) => r.pointsCost,
    },
    { id: "date", header: "Requested", cell: (r) => <span className="whitespace-nowrap">{formatDateTime(r.requestedAt)}</span>, sortValue: (r) => r.requestedAt },
    { id: "status", header: "Fulfilment", cell: (r) => <StatusBadge status={r.status} />, sortValue: (r) => r.status },
  ];
  return (
    <DataTable
      caption="Reward redemptions"
      data={rows}
      columns={columns}
      getRowId={(r) => r.id}
      rowHref={(r) => `/redemptions/${r.id}`}
      pageSize={pageSize}
      initialSort={{ id: "date", desc: true }}
      emptyTitle="No redemptions found"
    />
  );
}
