"use client";

import { useState } from "react";
import { DataTable, type Column, type ServerPagination } from "@/components/data-table/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { $api } from "@/lib/api/client";
import type { InvoiceListItem } from "@/lib/api/types";
import { formatDate, formatINR } from "@/lib/utils/format";

export function InvoicesTable({
  rows,
  showRetailer = true,
  pagination,
  loading,
}: {
  rows: InvoiceListItem[];
  showRetailer?: boolean;
  pagination?: ServerPagination;
  loading?: boolean;
}) {
  const columns: Column<InvoiceListItem>[] = [
    { id: "id", header: "Reference", cell: (r) => <span className="font-mono text-xs">{r.id}</span> },
    { id: "number", header: "Invoice no.", cell: (r) => <span className="font-medium">{r.invoiceNumber}</span> },
    ...(showRetailer
      ? [
          {
            id: "retailer",
            header: "Retailer",
            cell: (r: InvoiceListItem) => (
              <div>
                <p className="max-w-[200px] truncate">{r.retailerName}</p>
                <p className="text-xs text-muted-foreground">{r.retailerCity}</p>
              </div>
            ),
          },
        ]
      : []),
    { id: "invoiceDate", header: "Invoice date", cell: (r) => formatDate(r.invoiceDate) },
    { id: "submitted", header: "Submitted", cell: (r) => formatDate(r.submittedAt) },
    { id: "amount", header: "Amount", align: "right", cell: (r) => <span className="font-medium">{formatINR(r.amount)}</span> },
    { id: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
    { id: "reviewer", header: "Reviewer", cell: (r) => r.reviewer ?? <span className="text-muted-foreground">Unassigned</span> },
  ];
  return (
    <DataTable
      caption="Invoices"
      data={rows}
      columns={columns}
      getRowId={(r) => r.id}
      rowHref={(r) => `/invoices/${r.id}`}
      pagination={pagination}
      loading={loading}
      emptyTitle="No invoices found"
    />
  );
}

/** One retailer's invoices (detail-page tab), newest first. */
export function RelatedInvoices({ retailerId }: { retailerId: string }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = $api.useQuery("get", "/api/v1/admin/invoices", { params: { query: { retailerId, page, pageSize: 10 } } });
  return (
    <InvoicesTable
      rows={data?.items ?? []}
      showRetailer={false}
      loading={isLoading}
      pagination={{ page, pageSize: 10, total: data?.total ?? 0, onPageChange: setPage }}
    />
  );
}
