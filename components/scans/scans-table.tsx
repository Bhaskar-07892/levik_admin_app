"use client";

import { DataTable, type Column } from "@/components/data-table/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import type { ScanRow } from "@/lib/mock-api/queries";
import { formatDateTime, formatNumber } from "@/lib/utils/format";

export function ScansTable({ rows, showPlumber = true, pageSize = 10 }: { rows: ScanRow[]; showPlumber?: boolean; pageSize?: number }) {
  const columns: Column<ScanRow>[] = [
    { id: "id", header: "Scan ref", cell: (r) => <span className="font-mono text-xs">{r.id}</span>, sortValue: (r) => r.id },
    ...(showPlumber
      ? [
          {
            id: "plumber",
            header: "Plumber",
            cell: (r: ScanRow) => (
              <div>
                <p className="font-medium">{r.plumber?.name ?? r.plumberId}</p>
                <p className="text-xs text-muted-foreground">{r.plumber?.city}</p>
              </div>
            ),
            sortValue: (r: ScanRow) => r.plumber?.name ?? "",
          },
        ]
      : []),
    {
      id: "product",
      header: "Product model",
      cell: (r) => (
        <div>
          <p className="font-medium">{r.product?.modelCode}</p>
          <p className="max-w-[180px] truncate text-xs text-muted-foreground">{r.product?.category}</p>
        </div>
      ),
      sortValue: (r) => r.product?.modelCode ?? "",
    },
    { id: "date", header: "Scan date", cell: (r) => <span className="whitespace-nowrap">{formatDateTime(r.scannedAt)}</span>, sortValue: (r) => r.scannedAt },
    {
      id: "ref",
      header: "Retailer / invoice",
      cell: (r) =>
        r.retailer ? (
          <div>
            <p className="max-w-[200px] truncate">{r.retailer.shopName}</p>
            <p className="font-mono text-xs text-muted-foreground">{r.invoiceNumber ?? "No invoice no."}</p>
          </div>
        ) : (
          <span className="text-xs text-warning">No proof of sale</span>
        ),
    },
    {
      id: "points",
      header: "Expected pts",
      align: "right",
      cell: (r) => <span className="font-medium">{formatNumber(r.awardedPoints ?? r.expectedPoints)}</span>,
      sortValue: (r) => r.expectedPoints,
    },
    { id: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} />, sortValue: (r) => r.status },
  ];
  return (
    <DataTable
      caption="Product scans"
      data={rows}
      columns={columns}
      getRowId={(r) => r.id}
      rowHref={(r) => `/scans/${r.id}`}
      pageSize={pageSize}
      initialSort={{ id: "date", desc: true }}
      emptyTitle="No scans found"
    />
  );
}
