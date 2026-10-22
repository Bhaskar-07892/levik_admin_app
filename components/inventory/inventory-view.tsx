"use client";

import { AlertTriangle, Boxes, PackageX } from "lucide-react";
import { keepPreviousData } from "@tanstack/react-query";
import { useState } from "react";
import { DataTable, type Column } from "@/components/data-table/data-table";
import { TableToolbar } from "@/components/data-table/table-toolbar";
import { Field } from "@/components/forms/field";
import { SimpleSelect, toOptions } from "@/components/forms/simple-select";
import { DemoNotice } from "@/components/shared/demo-notice";
import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { $api, api, call } from "@/lib/api/client";
import { useRetailerOptions } from "@/lib/api/hooks";
import type { InventoryItem as InventoryRow, QueryOf } from "@/lib/api/types";
import { usePagedList } from "@/lib/hooks/use-paged-list";
import { formatDateTime } from "@/lib/utils/format";
import { runAction } from "@/lib/utils/run-action";
import { PRODUCT_CATEGORIES } from "@/types";
import { StockMovementsTable } from "./stock-movements-table";
import { SectionCard } from "@/components/shared/section-card";

function UpdateStockForm({ item, onClose }: { item: InventoryRow; onClose: () => void }) {
  const [qty, setQty] = useState(String(item.quantity));
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  return (
    <form
      className="grid gap-4"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        const value = Number(qty);
        if (qty.trim() === "" || !Number.isInteger(value) || value < 0) return setError("Enter a whole number of zero or more.");
        setSubmitting(true);
        const result = await runAction(
          () => call(api.PATCH("/api/v1/admin/inventory/{id}", { params: { path: { id: item.id } }, body: { quantity: value, note: note.trim() || undefined } })),
          `Stock updated: ${item.modelCode} at ${item.retailerName}`,
        );
        setSubmitting(false);
        if (result.ok) onClose();
      }}
    >
      <DialogHeader>
        <DialogTitle>Correct stock count</DialogTitle>
        <DialogDescription>
          {item.productName} at {item.retailerName}. The difference is recorded in the stock history as a manual adjustment.
        </DialogDescription>
      </DialogHeader>
      <Field label="Reported quantity (units)" htmlFor="inv-qty" error={error ?? undefined}>
        <Input id="inv-qty" type="number" min={0} value={qty} onChange={(e) => setQty(e.target.value)} />
      </Field>
      <Field label="Note (optional)" htmlFor="inv-note">
        <Input id="inv-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Confirmed on call with retailer" />
      </Field>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          Save quantity
        </Button>
      </DialogFooter>
    </form>
  );
}

export function InventoryView() {
  const list = usePagedList({ retailerId: "all", category: "all", stockStatus: "all" });
  const { data, isFetching } = $api.useQuery(
    "get",
    "/api/v1/admin/inventory",
    { params: { query: list.query as QueryOf<"/api/v1/admin/inventory"> } },
    { placeholderData: keepPreviousData },
  );
  const { data: summary } = $api.useQuery("get", "/api/v1/admin/inventory/summary", {});
  const retailers = useRetailerOptions();
  const [editing, setEditing] = useState<InventoryRow | null>(null);

  const columns: Column<InventoryRow>[] = [
    {
      id: "product",
      header: "Product",
      cell: (r) => (
        <div>
          <p className="font-medium">{r.productName}</p>
          <p className="text-xs text-muted-foreground">{r.category}</p>
        </div>
      ),
    },
    { id: "code", header: "Model", cell: (r) => <span className="font-mono text-xs">{r.modelCode}</span> },
    { id: "retailer", header: "Retailer", cell: (r) => r.retailerName },
    { id: "qty", header: "Reported qty", align: "right", cell: (r) => <span className="font-semibold">{r.quantity}</span> },
    { id: "status", header: "Stock status", cell: (r) => <StatusBadge status={r.stockStatus} /> },
    {
      id: "updated",
      header: "Last updated",
      cell: (r) => (
        <div>
          <p className="whitespace-nowrap">{formatDateTime(r.updatedAt)}</p>
          <p className="text-xs text-muted-foreground">{r.updatedBy}</p>
        </div>
      ),
    },
    {
      id: "action",
      header: "",
      cell: (r) => (
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setEditing(r);
          }}
        >
          Update
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Inventory" description="Retailer stock of Levik products: delivered orders add stock, confirmed plumber sales and bills take it out, and every change is in the stock history." />
      <DemoNotice>
        Retailers can still correct a count by hand; each correction is logged. Low-stock threshold: {summary?.threshold ?? "—"} units (change it in Settings).
      </DemoNotice>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <KpiCard label="Stock lines" value={String(summary?.lines ?? "—")} hint={`${summary?.retailersReporting ?? 0} retailers reporting`} icon={Boxes} />
        <KpiCard label="Low stock" value={String(summary?.lowStock ?? "—")} icon={AlertTriangle} accent="warning" />
        <KpiCard label="Out of stock" value={String(summary?.outOfStock ?? "—")} icon={PackageX} accent="warning" />
      </div>
      <div className="rounded-xl border border-border bg-card">
        <TableToolbar search={list.search} onSearchChange={list.setSearch} placeholder="Search product, model or retailer">
          <SimpleSelect
            value={list.filters.retailerId}
            onValueChange={(value) => list.setFilter("retailerId", value)}
            ariaLabel="Filter by retailer"
            options={[{ value: "all", label: "All retailers" }, ...retailers]}
          />
          <SimpleSelect value={list.filters.category} onValueChange={(value) => list.setFilter("category", value)} options={toOptions(PRODUCT_CATEGORIES, "All categories")} ariaLabel="Filter by category" />
          <SimpleSelect value={list.filters.stockStatus} onValueChange={(value) => list.setFilter("stockStatus", value)} options={toOptions(["In Stock", "Low Stock", "Out of Stock"], "All stock levels")} ariaLabel="Filter by stock status" />
        </TableToolbar>
        <DataTable
          caption="Retailer inventory"
          data={data?.items ?? []}
          columns={columns}
          getRowId={(r) => r.id}
          loading={isFetching}
          pagination={{ page: list.page, pageSize: list.pageSize, total: data?.total ?? 0, onPageChange: list.setPage }}
        />
      </div>
      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-md">{editing ? <UpdateStockForm key={editing.id} item={editing} onClose={() => setEditing(null)} /> : null}</DialogContent>
      </Dialog>
      <SectionCard className="mt-6" title="Stock history" description="Every stock change across all retailers, newest first" bodyClassName="p-0">
        <StockMovementsTable showRetailer />
      </SectionCard>
    </div>
  );
}
