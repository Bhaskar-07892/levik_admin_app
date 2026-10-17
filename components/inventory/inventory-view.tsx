"use client";

import { AlertTriangle, Boxes, PackageX } from "lucide-react";
import { useMemo, useState } from "react";
import { DataTable, type Column } from "@/components/data-table/data-table";
import { matches, TableToolbar } from "@/components/data-table/table-toolbar";
import { Field } from "@/components/forms/field";
import { SimpleSelect, toOptions } from "@/components/forms/simple-select";
import { DemoNotice } from "@/components/shared/demo-notice";
import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { listInventory, type InventoryRow } from "@/lib/mock-api/queries";
import { updateInventory } from "@/lib/mock-api/services";
import { useDb } from "@/lib/mock-api/store";
import { formatDateTime } from "@/lib/utils/format";
import { runAction } from "@/lib/utils/run-action";
import { PRODUCT_CATEGORIES } from "@/types";

function UpdateStockForm({ item, onClose }: { item: InventoryRow; onClose: () => void }) {
  const [qty, setQty] = useState(String(item.quantity));
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="grid gap-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const value = Number(qty);
        if (qty.trim() === "" || !Number.isInteger(value) || value < 0) return setError("Enter a whole number of zero or more.");
        const ok = runAction(() => updateInventory(item.id, value, note), `Stock updated: ${item.product?.modelCode} at ${item.retailer?.shopName}`);
        if (ok.ok) onClose();
      }}
    >
      <DialogHeader>
        <DialogTitle>Update reported stock</DialogTitle>
        <DialogDescription>
          {item.product?.name} at {item.retailer?.shopName}. Retailer-reported quantity, not warehouse stock.
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
        <Button type="submit">Save quantity</Button>
      </DialogFooter>
    </form>
  );
}

export function InventoryView() {
  const db = useDb();
  const rows = useMemo(() => listInventory(db), [db]);
  const [search, setSearch] = useState("");
  const [retailer, setRetailer] = useState("all");
  const [category, setCategory] = useState("all");
  const [stock, setStock] = useState("all");
  const [editing, setEditing] = useState<InventoryRow | null>(null);

  const filtered = rows.filter(
    (r) =>
      matches(search, r.product?.name, r.product?.modelCode, r.retailer?.shopName) &&
      (retailer === "all" || r.retailerId === retailer) &&
      (category === "all" || r.product?.category === category) &&
      (stock === "all" || r.stockStatus === stock),
  );
  const retailersWithStock = db.retailers.filter((r) => rows.some((row) => row.retailerId === r.id));

  const columns: Column<InventoryRow>[] = [
    {
      id: "product",
      header: "Product",
      cell: (r) => (
        <div>
          <p className="font-medium">{r.product?.name}</p>
          <p className="text-xs text-muted-foreground">{r.product?.category}</p>
        </div>
      ),
      sortValue: (r) => r.product?.name ?? "",
    },
    { id: "code", header: "Model", cell: (r) => <span className="font-mono text-xs">{r.product?.modelCode}</span>, sortValue: (r) => r.product?.modelCode ?? "" },
    { id: "retailer", header: "Retailer", cell: (r) => r.retailer?.shopName, sortValue: (r) => r.retailer?.shopName ?? "" },
    { id: "qty", header: "Reported qty", align: "right", cell: (r) => <span className="font-semibold">{r.quantity}</span>, sortValue: (r) => r.quantity },
    { id: "status", header: "Stock status", cell: (r) => <StatusBadge status={r.stockStatus} />, sortValue: (r) => r.quantity },
    {
      id: "updated",
      header: "Last updated",
      cell: (r) => (
        <div>
          <p className="whitespace-nowrap">{formatDateTime(r.updatedAt)}</p>
          <p className="text-xs text-muted-foreground">{r.updatedBy}</p>
        </div>
      ),
      sortValue: (r) => r.updatedAt,
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
      <PageHeader title="Inventory" description="Stock levels reported by retailers for Levik products, with low-stock indicators." />
      <DemoNotice>
        Quantities are retailer-reported mock inventory, not live warehouse stock. Low-stock threshold: {db.settings.lowStockThreshold} units (change it in Settings).
      </DemoNotice>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <KpiCard label="Stock lines" value={String(rows.length)} hint={`${retailersWithStock.length} retailers reporting`} icon={Boxes} />
        <KpiCard label="Low stock" value={String(rows.filter((r) => r.stockStatus === "Low Stock").length)} icon={AlertTriangle} accent="warning" />
        <KpiCard label="Out of stock" value={String(rows.filter((r) => r.stockStatus === "Out of Stock").length)} icon={PackageX} accent="warning" />
      </div>
      <div className="rounded-xl border border-border bg-card">
        <TableToolbar search={search} onSearchChange={setSearch} placeholder="Search product, model or retailer">
          <SimpleSelect
            value={retailer}
            onValueChange={setRetailer}
            ariaLabel="Filter by retailer"
            options={[{ value: "all", label: "All retailers" }, ...retailersWithStock.map((r) => ({ value: r.id, label: r.shopName }))]}
          />
          <SimpleSelect value={category} onValueChange={setCategory} options={toOptions(PRODUCT_CATEGORIES, "All categories")} ariaLabel="Filter by category" />
          <SimpleSelect value={stock} onValueChange={setStock} options={toOptions(["In Stock", "Low Stock", "Out of Stock"], "All stock levels")} ariaLabel="Filter by stock status" />
        </TableToolbar>
        <DataTable caption="Retailer inventory" data={filtered} columns={columns} getRowId={(r) => r.id} initialSort={{ id: "qty", desc: false }} />
      </div>
      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-md">{editing ? <UpdateStockForm key={editing.id} item={editing} onClose={() => setEditing(null)} /> : null}</DialogContent>
      </Dialog>
    </div>
  );
}
