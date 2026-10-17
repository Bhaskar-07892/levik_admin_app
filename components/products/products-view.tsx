"use client";

import { LayoutGrid, List, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { DataTable, type Column } from "@/components/data-table/data-table";
import { matches, TableToolbar } from "@/components/data-table/table-toolbar";
import { SimpleSelect, toOptions } from "@/components/forms/simple-select";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { ProductThumb } from "@/components/shared/product-thumb";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { listProducts } from "@/lib/mock-api/queries";
import { useDb } from "@/lib/mock-api/store";
import { cn } from "@/lib/utils";
import { formatINR, formatNumber } from "@/lib/utils/format";
import { PRODUCT_CATEGORIES, type Product } from "@/types";
import { ProductFormDialog } from "./product-form-dialog";

export function ProductsView({ openNew = false }: { openNew?: boolean }) {
  const db = useDb();
  const router = useRouter();
  const products = listProducts(db);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [view, setView] = useState<"grid" | "table">("grid");
  const [formOpen, setFormOpen] = useState(openNew);

  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          matches(search, p.name, p.modelCode, p.sku, p.barcode, p.category) &&
          (category === "all" || p.category === category) &&
          (status === "all" || (status === "Active" ? p.isActive : !p.isActive)),
      ),
    [products, search, category, status],
  );

  const columns: Column<Product>[] = [
    {
      id: "product",
      header: "Product",
      cell: (p) => (
        <div className="flex items-center gap-3">
          <ProductThumb src={p.image} alt={p.name} className="size-11 shrink-0" sizes="44px" />
          <div>
            <p className="font-medium">{p.name}</p>
            <p className="text-xs text-muted-foreground">{p.category}</p>
          </div>
        </div>
      ),
      sortValue: (p) => p.name,
    },
    { id: "code", header: "Model", cell: (p) => <span className="font-mono text-xs">{p.modelCode}</span>, sortValue: (p) => p.modelCode },
    { id: "sku", header: "SKU / barcode", cell: (p) => <div className="font-mono text-xs"><p>{p.sku}</p><p className="text-muted-foreground">{p.barcode}</p></div> },
    { id: "dims", header: "Dimensions", cell: (p) => p.dimensions ?? <span className="text-muted-foreground">Not published</span> },
    { id: "mrp", header: "Demo MRP", align: "right", cell: (p) => formatINR(p.mrp), sortValue: (p) => p.mrp },
    { id: "points", header: "Scan pts", align: "right", cell: (p) => (p.rewardEligible ? formatNumber(p.plumberPoints) : "—"), sortValue: (p) => p.plumberPoints },
    { id: "status", header: "Status", cell: (p) => <StatusBadge status={p.isActive ? "Active" : "Inactive"} />, sortValue: (p) => String(p.isActive) },
  ];

  return (
    <div>
      <PageHeader
        title="Product Catalogue"
        description="Levik sanitaryware models from the Bathware Collection catalogue. Activate products and control reward eligibility."
        actions={
          <Button onClick={() => setFormOpen(true)}>
            <Plus /> Add product
          </Button>
        }
      />
      <div className="rounded-xl border border-border bg-card">
        <TableToolbar
          search={search}
          onSearchChange={setSearch}
          placeholder="Search name, model code, SKU"
          trailing={
            <div className="inline-flex rounded-lg border border-border p-0.5" role="radiogroup" aria-label="Layout">
              {(["grid", "table"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  role="radio"
                  aria-checked={view === mode}
                  aria-label={mode === "grid" ? "Grid view" : "Table view"}
                  onClick={() => setView(mode)}
                  className={cn("rounded-md p-1.5", view === mode ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground")}
                >
                  {mode === "grid" ? <LayoutGrid className="size-4" /> : <List className="size-4" />}
                </button>
              ))}
            </div>
          }
        >
          <SimpleSelect value={category} onValueChange={setCategory} options={toOptions(PRODUCT_CATEGORIES, "All categories")} ariaLabel="Filter by category" />
          <SimpleSelect value={status} onValueChange={setStatus} options={toOptions(["Active", "Inactive"], "All statuses")} ariaLabel="Filter by status" />
        </TableToolbar>
        {view === "table" ? (
          <DataTable caption="Products" data={filtered} columns={columns} getRowId={(p) => p.id} rowHref={(p) => `/products/${p.id}`} pageSize={12} />
        ) : filtered.length === 0 ? (
          <EmptyState title="No products match your filters" description="Try clearing the search or changing a filter." />
        ) : (
          <>
            <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {filtered.map((p) => (
                <Link
                  key={p.id}
                  href={`/products/${p.id}`}
                  className={cn(
                    "group overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none",
                    !p.isActive && "opacity-70",
                  )}
                >
                  <ProductThumb src={p.image} alt={p.name} className="aspect-[4/3] w-full rounded-none" sizes="(min-width: 1536px) 25vw, (min-width: 1024px) 33vw, 50vw" />
                  <div className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.category}</p>
                      </div>
                      <StatusBadge status={p.isActive ? "Active" : "Inactive"} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-mono">{p.sku}</span>
                      <span>{p.dimensions ?? "Dimensions not published"}</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-border pt-2 text-sm">
                      <span>{formatINR(p.mrp)}</span>
                      <span className={p.rewardEligible ? "font-medium text-[#8a6a2f]" : "text-muted-foreground"}>
                        {p.rewardEligible ? `${formatNumber(p.plumberPoints)} pts / scan` : "Not reward-eligible"}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">{filtered.length} products</p>
          </>
        )}
      </div>
      <ProductFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open && openNew) router.replace("/products");
        }}
        onCreated={(p) => router.push(`/products/${p.id}`)}
      />
    </div>
  );
}
