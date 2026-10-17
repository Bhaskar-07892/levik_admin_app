"use client";

import { DataTable, type Column } from "@/components/data-table/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import type { InvoiceRow } from "@/lib/mock-api/queries";
import { formatDate, formatINR } from "@/lib/utils/format";

export function InvoicesTable({ rows, showRetailer = true, pageSize = 10 }: { rows: InvoiceRow[]; showRetailer?: boolean; pageSize?: number }) {
  const columns: Column<InvoiceRow>[] = [
    { id: "id", header: "Reference", cell: (r) => <span className="font-mono text-xs">{r.id}</span>, sortValue: (r) => r.id },
    { id: "number", header: "Invoice no.", cell: (r) => <span className="font-medium">{r.invoiceNumber}</span>, sortValue: (r) => r.invoiceNumber },
    ...(showRetailer
      ? [
          {
            id: "retailer",
            header: "Retailer",
            cell: (r: InvoiceRow) => (
              <div>
                <p className="max-w-[200px] truncate">{r.retailer?.shopName}</p>
                <p className="text-xs text-muted-foreground">{r.retailer?.city}</p>
              </div>
            ),
            sortValue: (r: InvoiceRow) => r.retailer?.shopName ?? "",
          },
        ]
      : []),
    { id: "invoiceDate", header: "Invoice date", cell: (r) => formatDate(r.invoiceDate), sortValue: (r) => r.invoiceDate },
    { id: "submitted", header: "Submitted", cell: (r) => formatDate(r.submittedAt), sortValue: (r) => r.submittedAt },
    { id: "amount", header: "Amount", align: "right", cell: (r) => <span className="font-medium">{formatINR(r.amount)}</span>, sortValue: (r) => r.amount },
    { id: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} />, sortValue: (r) => r.status },
    { id: "reviewer", header: "Reviewer", cell: (r) => r.reviewer ?? <span className="text-muted-foreground">Unassigned</span>, sortValue: (r) => r.reviewer ?? "" },
  ];
  return (
    <DataTable
      caption="Invoices"
      data={rows}
      columns={columns}
      getRowId={(r) => r.id}
      rowHref={(r) => `/invoices/${r.id}`}
      pageSize={pageSize}
      initialSort={{ id: "submitted", desc: true }}
      emptyTitle="No invoices found"
    />
  );
}
