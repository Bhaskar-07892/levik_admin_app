"use client";

import { FileText } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { DataTable, type Column } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { $api } from "@/lib/api/client";
import { API_URL } from "@/lib/api/auth";
import type { BillDto } from "@/lib/api/types";
import { formatDateTime, formatINR } from "@/lib/utils/format";

/** Bills a retailer's store issued to its buyers (plumber sales and walk-in customers). */
export function RelatedBills({ retailerId }: { retailerId: string }) {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const { data, isLoading } = $api.useQuery("get", "/api/v1/admin/bills", { params: { query: { retailerId, page, pageSize } } });
  const columns: Column<BillDto>[] = [
    { id: "number", header: "Bill", cell: (b) => <span className="font-mono text-xs">{b.billNumber}</span> },
    {
      id: "customer",
      header: "Billed to",
      cell: (b) => (
        <div>
          <p className="font-medium">{b.customerName}</p>
          <p className="text-xs text-muted-foreground">{b.customerMobile ?? "No mobile"}</p>
        </div>
      ),
    },
    { id: "items", header: "Items", cell: (b) => <span className="max-w-[240px] truncate">{b.lines.map((l) => `${l.quantity}× ${l.productName}`).join(", ")}</span> },
    {
      id: "source",
      header: "Sale",
      cell: (b) =>
        b.scanId ? (
          <Link href={`/scans/${b.scanId}`} className="font-mono text-xs text-primary hover:underline">
            {b.scanId}
          </Link>
        ) : (
          <span className="text-xs text-muted-foreground">Walk-in</span>
        ),
    },
    { id: "value", header: "Amount", align: "right", cell: (b) => <span className="font-medium tabular-nums">{formatINR(b.totalValue)}</span> },
    { id: "date", header: "Issued", cell: (b) => <span className="whitespace-nowrap">{formatDateTime(b.createdAt)}</span> },
    {
      id: "pdf",
      header: "",
      cell: (b) => (
        <Button variant="ghost" size="sm" onClick={() => window.open(`${API_URL}${b.pdfUrl}`, "_blank", "noopener")}>
          <FileText /> PDF
        </Button>
      ),
    },
  ];
  return (
    <DataTable
      caption="Customer bills"
      data={data?.items ?? []}
      columns={columns}
      getRowId={(b) => b.id}
      loading={isLoading}
      pagination={{ page, pageSize, total: data?.total ?? 0, onPageChange: setPage }}
      emptyTitle="No bills issued yet"
    />
  );
}
