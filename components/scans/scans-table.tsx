"use client";

import { DataTable, type Column, type ServerPagination } from "@/components/data-table/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { $api } from "@/lib/api/client";
import type { ScanDto } from "@/lib/api/types";
import { formatDateTime, formatNumber } from "@/lib/utils/format";
import { useState } from "react";

export function ScansTable({
  rows,
  showPlumber = true,
  pagination,
  loading,
}: {
  rows: ScanDto[];
  showPlumber?: boolean;
  pagination?: ServerPagination;
  loading?: boolean;
}) {
  const columns: Column<ScanDto>[] = [
    { id: "id", header: "Scan ref", cell: (r) => <span className="font-mono text-xs">{r.id}</span> },
    ...(showPlumber
      ? [
          {
            id: "plumber",
            header: "Plumber",
            cell: (r: ScanDto) => (
              <div>
                <p className="font-medium">{r.plumber.name}</p>
                <p className="text-xs text-muted-foreground">{r.plumber.city}</p>
              </div>
            ),
          },
        ]
      : []),
    {
      id: "product",
      header: "Product model",
      cell: (r) => (
        <div>
          <p className="font-medium">{r.product.modelCode}</p>
          <p className="max-w-[180px] truncate text-xs text-muted-foreground">{r.product.category}</p>
        </div>
      ),
    },
    { id: "date", header: "Scan date", cell: (r) => <span className="whitespace-nowrap">{formatDateTime(r.scannedAt)}</span> },
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
    },
    { id: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
  ];
  return (
    <DataTable
      caption="Product scans"
      data={rows}
      columns={columns}
      getRowId={(r) => r.id}
      rowHref={(r) => `/scans/${r.id}`}
      pagination={pagination}
      loading={loading}
      emptyTitle="No scans found"
    />
  );
}

/** Scans for one plumber, product or retailer (detail-page tabs), newest first. */
export function RelatedScans({ filter, showPlumber = true }: { filter: { plumberId?: string; productId?: string; retailerId?: string }; showPlumber?: boolean }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = $api.useQuery("get", "/api/v1/admin/scans", { params: { query: { ...filter, page, pageSize: 10 } } });
  return (
    <ScansTable
      rows={data?.items ?? []}
      showPlumber={showPlumber}
      loading={isLoading}
      pagination={{ page, pageSize: 10, total: data?.total ?? 0, onPageChange: setPage }}
    />
  );
}
