"use client";

import { useState } from "react";
import { DataTable, type Column, type ServerPagination } from "@/components/data-table/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { $api } from "@/lib/api/client";
import type { OrderDto } from "@/lib/api/types";
import { formatDateTime, formatINR, formatNumber } from "@/lib/utils/format";

export function OrdersTable({
  rows,
  showRetailer = true,
  pagination,
  loading,
}: {
  rows: OrderDto[];
  showRetailer?: boolean;
  pagination?: ServerPagination;
  loading?: boolean;
}) {
  const columns: Column<OrderDto>[] = [
    { id: "id", header: "Order", cell: (o) => <span className="font-mono text-xs">{o.id}</span> },
    ...(showRetailer
      ? [
          {
            id: "retailer",
            header: "Retailer",
            cell: (o: OrderDto) => (
              <div>
                <p className="font-medium">{o.retailerName}</p>
                <p className="text-xs text-muted-foreground">{o.retailerCity}</p>
              </div>
            ),
          },
        ]
      : []),
    {
      id: "items",
      header: "Items",
      cell: (o) => (
        <div>
          <p className="max-w-[240px] truncate">{o.lines.map((l) => `${l.quantity}× ${l.productName}`).join(", ")}</p>
          <p className="text-xs text-muted-foreground">{formatNumber(o.itemCount)} units</p>
        </div>
      ),
    },
    { id: "value", header: "Value", align: "right", cell: (o) => <span className="font-medium tabular-nums">{formatINR(o.totalValue)}</span> },
    { id: "placed", header: "Placed", cell: (o) => <span className="whitespace-nowrap">{formatDateTime(o.placedAt)}</span> },
    {
      id: "status",
      header: "Status",
      cell: (o) => (
        <div>
          <StatusBadge status={o.status} />
          {o.purchaseInvoiceNumber ? <p className="mt-1 font-mono text-[10px] text-muted-foreground">{o.purchaseInvoiceNumber}</p> : null}
        </div>
      ),
    },
  ];
  return (
    <DataTable
      caption="Retailer orders"
      data={rows}
      columns={columns}
      getRowId={(o) => o.id}
      rowHref={(o) => `/orders/${o.id}`}
      pagination={pagination}
      loading={loading}
      emptyTitle="No orders found"
    />
  );
}

/** One retailer's orders (retailer page tab), newest first. */
export function RelatedOrders({ retailerId }: { retailerId: string }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = $api.useQuery("get", "/api/v1/admin/orders", { params: { query: { retailerId, page, pageSize: 10 } } });
  return (
    <OrdersTable
      rows={data?.items ?? []}
      showRetailer={false}
      loading={isLoading}
      pagination={{ page, pageSize: 10, total: data?.total ?? 0, onPageChange: setPage }}
    />
  );
}
