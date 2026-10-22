"use client";

import Link from "next/link";
import { useState } from "react";
import { DataTable, type Column } from "@/components/data-table/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { $api } from "@/lib/api/client";
import type { StockMovementDto } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { formatDateTime, formatNumber } from "@/lib/utils/format";

const REASON_TONE = {
  "Opening stock": "neutral",
  "Order delivered": "success",
  "Plumber sale": "info",
  "Customer bill": "info",
  "Manual adjustment": "warning",
} as const;

function related(m: StockMovementDto) {
  if (!m.relatedType || !m.relatedId) return null;
  const href = m.relatedType === "order" ? `/orders/${m.relatedId}` : m.relatedType === "scan" ? `/scans/${m.relatedId}` : undefined;
  return href ? (
    <Link href={href} className="font-mono text-xs text-primary hover:underline">
      {m.relatedId}
    </Link>
  ) : (
    <span className="font-mono text-xs">{m.relatedId}</span>
  );
}

/** Stock history: every delivery, sale, bill and manual count, newest first. Each row shows the balance after it. */
export function StockMovementsTable({ retailerId, productId, showRetailer = false }: { retailerId?: string; productId?: string; showRetailer?: boolean }) {
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const { data, isLoading } = $api.useQuery("get", "/api/v1/admin/inventory/movements", { params: { query: { retailerId, productId, page, pageSize } } });
  const columns: Column<StockMovementDto>[] = [
    { id: "date", header: "When", cell: (m) => <span className="whitespace-nowrap">{formatDateTime(m.createdAt)}</span> },
    ...(showRetailer
      ? [{ id: "retailer", header: "Retailer", cell: (m: StockMovementDto) => <Link href={`/retailers/${m.retailerId}`} className="hover:underline">{m.retailerName}</Link> }]
      : []),
    {
      id: "product",
      header: "Product",
      cell: (m) => (
        <div>
          <p className="font-medium">{m.productName}</p>
          <p className="text-xs text-muted-foreground">Model {m.modelCode}</p>
        </div>
      ),
    },
    { id: "reason", header: "Reason", cell: (m) => <StatusBadge status={m.reason} tone={REASON_TONE[m.reason]} /> },
    {
      id: "delta",
      header: "Change",
      align: "right",
      cell: (m) => <span className={cn("font-semibold tabular-nums", m.delta > 0 ? "text-emerald-600" : "text-destructive")}>{m.delta > 0 ? `+${m.delta}` : m.delta}</span>,
    },
    { id: "balance", header: "Balance", align: "right", cell: (m) => <span className="tabular-nums">{formatNumber(m.balanceAfter)}</span> },
    {
      id: "ref",
      header: "Reference",
      cell: (m) => (
        <div>
          {related(m)}
          {m.note ? <p className="max-w-[220px] truncate text-xs text-muted-foreground">{m.note}</p> : null}
          <p className="text-[10px] text-muted-foreground">by {m.createdBy}</p>
        </div>
      ),
    },
  ];
  return (
    <DataTable
      caption="Stock history"
      data={data?.items ?? []}
      columns={columns}
      getRowId={(m) => m.id}
      loading={isLoading}
      pagination={{ page, pageSize, total: data?.total ?? 0, onPageChange: setPage }}
      emptyTitle="No stock changes yet"
    />
  );
}
