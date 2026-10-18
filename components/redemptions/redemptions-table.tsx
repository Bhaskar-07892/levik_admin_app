"use client";

import { useState } from "react";
import { DataTable, type Column, type ServerPagination } from "@/components/data-table/data-table";
import { RoleBadge, StatusBadge } from "@/components/shared/status-badge";
import { $api } from "@/lib/api/client";
import type { RedemptionDto } from "@/lib/api/types";
import { formatDateTime, formatNumber } from "@/lib/utils/format";

export function RedemptionsTable({
  rows,
  showUser = true,
  pagination,
  loading,
}: {
  rows: RedemptionDto[];
  showUser?: boolean;
  pagination?: ServerPagination;
  loading?: boolean;
}) {
  const columns: Column<RedemptionDto>[] = [
    { id: "id", header: "Reference", cell: (r) => <span className="font-mono text-xs">{r.id}</span> },
    ...(showUser
      ? [
          {
            id: "user",
            header: "User",
            cell: (r: RedemptionDto) => <span className="font-medium">{r.userName}</span>
          },
          { id: "role", header: "Role", cell: (r: RedemptionDto) => <RoleBadge role={r.userRole} /> },
        ]
      : []),
    {
      id: "reward",
      header: "Reward",
      cell: (r) => (
        <div>
          <p className="max-w-[220px] truncate font-medium">{r.reward.name}</p>
          <p className="text-xs text-muted-foreground">{r.reward.type}</p>
        </div>
      )
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
      )
    },
    { id: "date", header: "Requested", cell: (r) => <span className="whitespace-nowrap">{formatDateTime(r.requestedAt)}</span> },
    { id: "status", header: "Fulfilment", cell: (r) => <StatusBadge status={r.status} /> },
  ];
  return (
    <DataTable
      caption="Reward redemptions"
      data={rows}
      columns={columns}
      getRowId={(r) => r.id}
      rowHref={(r) => `/redemptions/${r.id}`}
      pagination={pagination}
      loading={loading}
      emptyTitle="No redemptions found"
    />
  );
}

/** Redemptions for one participant or reward (detail-page tabs), newest first. */
export function RelatedRedemptions({ filter, showUser = true }: { filter: { userId?: string; rewardId?: string }; showUser?: boolean }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = $api.useQuery("get", "/api/v1/admin/redemptions", { params: { query: { ...filter, page, pageSize: 10 } } });
  return (
    <RedemptionsTable
      rows={data?.items ?? []}
      showUser={showUser}
      loading={isLoading}
      pagination={{ page, pageSize: 10, total: data?.total ?? 0, onPageChange: setPage }}
    />
  );
}
