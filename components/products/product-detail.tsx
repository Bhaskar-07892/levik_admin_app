"use client";

import { ArrowLeft, Pencil, Power, PowerOff } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ScansTable } from "@/components/scans/scans-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { NotFoundCard } from "@/components/shared/not-found-card";
import { PageHeader } from "@/components/shared/page-header";
import { ProductThumb } from "@/components/shared/product-thumb";
import { DetailGrid, SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { listInventory, listScans } from "@/lib/mock-api/queries";
import { setProductActive } from "@/lib/mock-api/services";
import { useDb } from "@/lib/mock-api/store";
import { formatDateTime, formatINR, formatNumber } from "@/lib/utils/format";
import { runAction } from "@/lib/utils/run-action";
import { ProductFormDialog } from "./product-form-dialog";

export function ProductDetail({ id }: { id: string }) {
  const db = useDb();
  const product = db.products.find((p) => p.id === id);
  const [editOpen, setEditOpen] = useState(false);
  const [toggleOpen, setToggleOpen] = useState(false);
  const scans = useMemo(() => listScans(db).filter((s) => s.productId === id), [db, id]);
  const stock = useMemo(() => listInventory(db).filter((i) => i.productId === id), [db, id]);

  if (!product) return <NotFoundCard entity="Product" backHref="/products" backLabel="Back to catalogue" />;

  return (
    <div>
      <Link href="/products" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Product Catalogue
      </Link>
      <PageHeader
        title={product.name}
        description={`${product.category} · Model ${product.modelCode} · ${product.sku}`}
        eyebrow={<StatusBadge status={product.isActive ? "Active" : "Inactive"} />}
        actions={
          <>
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil /> Edit
            </Button>
            <Button variant={product.isActive ? "destructive" : "default"} onClick={() => setToggleOpen(true)}>
              {product.isActive ? <PowerOff /> : <Power />} {product.isActive ? "Deactivate" : "Activate"}
            </Button>
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
        <ProductThumb src={product.image} alt={product.name} className="aspect-square w-full rounded-xl border border-border" sizes="380px" />
        <div className="space-y-6">
          <SectionCard title="Product information">
            <p className="mb-5 text-sm text-muted-foreground">{product.description}</p>
            <DetailGrid
              items={[
                { label: "Model code", value: <span className="font-mono">{product.modelCode}</span> },
                { label: "Category", value: product.category },
                { label: "Dimensions", value: product.dimensions ?? "Not published in catalogue" },
                { label: "Features", value: product.features.length ? product.features.join(" · ") : "—" },
                { label: "SKU", value: <span className="font-mono">{product.sku}</span> },
                { label: "Barcode reference", value: <span className="font-mono">{product.barcode}</span> },
                { label: "Demo MRP", value: formatINR(product.mrp) },
                { label: "Reward eligibility", value: product.rewardEligible ? `${formatNumber(product.plumberPoints)} pts per approved scan` : "Not reward-eligible" },
                { label: "Last updated", value: formatDateTime(product.updatedAt) },
              ]}
            />
          </SectionCard>
          <SectionCard title="Retailer-reported stock" description="Mock inventory reported by retailers" bodyClassName="p-0">
            {stock.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted-foreground">No retailer has reported stock for this model.</p>
            ) : (
              <ul className="divide-y divide-border">
                {stock.map((s) => (
                  <li key={s.id} className="flex items-center justify-between px-5 py-3 text-sm">
                    <Link href={`/retailers/${s.retailerId}`} className="hover:underline">
                      {s.retailer?.shopName}
                    </Link>
                    <span className="flex items-center gap-3">
                      <span className="tabular-nums">{s.quantity} units</span>
                      <StatusBadge status={s.stockStatus} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>
      <SectionCard title="Scans of this model" className="mt-6" bodyClassName="p-0">
        <ScansTable rows={scans} pageSize={5} />
      </SectionCard>
      <ProductFormDialog product={product} open={editOpen} onOpenChange={setEditOpen} />
      <ConfirmDialog
        open={toggleOpen}
        onOpenChange={setToggleOpen}
        title={product.isActive ? "Deactivate product?" : "Activate product?"}
        description={
          product.isActive
            ? "Inactive products stop earning scan points and invoice incentives. Existing approved transactions are unaffected."
            : "The product becomes visible and eligible for rewards again."
        }
        confirmLabel={product.isActive ? "Deactivate" : "Activate"}
        destructive={product.isActive}
        onConfirm={() => runAction(() => setProductActive(product.id, !product.isActive), product.isActive ? "Product deactivated" : "Product activated")}
      />
    </div>
  );
}
