"use client";

import { ArrowLeft, Ban, CheckCircle2, FileText, PackageCheck, Truck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { ProductThumb } from "@/components/shared/product-thumb";
import { QueryBoundary } from "@/components/shared/query-states";
import { ReasonDialog } from "@/components/shared/reason-dialog";
import { DetailGrid, SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Timeline } from "@/components/shared/timeline";
import { Button } from "@/components/ui/button";
import { $api, api, call } from "@/lib/api/client";
import { API_URL } from "@/lib/api/auth";
import type { OrderDto } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { formatDateTime, formatINR, formatNumber } from "@/lib/utils/format";
import { runAction } from "@/lib/utils/run-action";
import type { OrderStatus } from "@/types";

type Forward = "Confirmed" | "Dispatched" | "Delivered";

const ACTIONS: Record<Forward, { label: string; icon: typeof CheckCircle2; description: string }> = {
  Confirmed: { label: "Confirm order", icon: CheckCircle2, description: "Accepts the order. The retailer can no longer cancel it from the app." },
  Dispatched: { label: "Mark dispatched", icon: Truck, description: "Records that the goods have left for the retailer." },
  Delivered: {
    label: "Mark delivered",
    icon: PackageCheck,
    description: "Adds every line to the retailer's stock and issues the purchase invoice. This cannot be undone.",
  },
};

const STEPS: OrderStatus[] = ["Placed", "Confirmed", "Dispatched", "Delivered"];

export function OrderDetail({ id }: { id: string }) {
  const query = $api.useQuery("get", "/api/v1/admin/orders/{id}", { params: { path: { id } } });
  return (
    <QueryBoundary query={query} entity="Order" backHref="/orders" backLabel="Back to orders">
      {(order) => <OrderPage order={order} />}
    </QueryBoundary>
  );
}

function OrderPage({ order }: { order: OrderDto }) {
  const [pending, setPending] = useState<Forward | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const timeline = $api.useQuery("get", "/api/v1/admin/orders/{id}/timeline", { params: { path: { id: order.id } } });
  const forward = order.nextStatuses.filter((s): s is Forward => s !== "Cancelled" && s !== "Placed");
  const current = STEPS.indexOf(order.status);

  const move = (status: Forward | "Cancelled", reason?: string) =>
    runAction(
      () => call(api.POST("/api/v1/admin/orders/{id}/status", { params: { path: { id: order.id } }, body: { status, reason } })),
      (o) => (o.status === "Delivered" ? `Delivered · stock added · ${o.purchaseInvoiceNumber}` : `Order ${o.status.toLowerCase()}`),
    );

  return (
    <div>
      <Link href="/orders" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Orders
      </Link>
      <PageHeader
        title={`Order ${order.id}`}
        description={`${order.retailerName} · ${order.retailerCity} · placed ${formatDateTime(order.placedAt)}`}
        eyebrow={<StatusBadge status={order.status} />}
        actions={
          <>
            {order.purchaseInvoiceUrl ? (
              <Button variant="outline" onClick={() => window.open(`${API_URL}${order.purchaseInvoiceUrl}`, "_blank", "noopener")}>
                <FileText /> Purchase invoice
              </Button>
            ) : null}
            {forward.map((status) => {
              const meta = ACTIONS[status];
              return (
                <Button key={status} onClick={() => setPending(status)}>
                  <meta.icon /> {meta.label}
                </Button>
              );
            })}
            {order.nextStatuses.includes("Cancelled") ? (
              <Button variant="destructive" onClick={() => setCancelOpen(true)}>
                <Ban /> Cancel order
              </Button>
            ) : null}
          </>
        }
      />

      <SectionCard className="mb-6" title="Progress">
        {order.status === "Cancelled" ? (
          <p className="text-sm text-muted-foreground">
            Cancelled {formatDateTime(order.cancelledAt)}
            {order.cancelReason ? `: ${order.cancelReason}` : ""}. No stock was added.
          </p>
        ) : (
          <ol className="grid gap-3 sm:grid-cols-4">
            {STEPS.map((step, index) => (
              <li key={step} className="flex items-center gap-2 sm:flex-col sm:items-start">
                <div className={cn("h-1.5 w-12 rounded-full sm:w-full", index <= current ? "bg-primary" : "bg-muted")} />
                <span className={cn("text-xs", index <= current ? "font-medium text-foreground" : "text-muted-foreground")}>{step}</span>
              </li>
            ))}
          </ol>
        )}
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-3">
        <SectionCard className="xl:col-span-2" title="Items" description="Priced at the catalogue price when the order was placed" bodyClassName="p-0">
          <ul className="divide-y divide-border">
            {order.lines.map((line) => (
              <li key={line.productId} className="flex items-center gap-4 px-5 py-3">
                <ProductThumb src={line.imageUrl} alt={line.productName} className="size-12 shrink-0" sizes="48px" />
                <div className="min-w-0 flex-1">
                  <Link href={`/products/${line.productId}`} className="font-medium hover:underline">
                    {line.productName}
                  </Link>
                  <p className="text-xs text-muted-foreground">Model {line.modelCode}</p>
                </div>
                <p className="text-sm tabular-nums text-muted-foreground">
                  {formatNumber(line.quantity)} × {formatINR(line.unitPrice)}
                </p>
                <p className="w-28 text-right font-medium tabular-nums">{formatINR(line.value)}</p>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-border px-5 py-3">
            <span className="text-sm text-muted-foreground">{formatNumber(order.itemCount)} units</span>
            <span className="text-lg font-semibold tabular-nums">{formatINR(order.totalValue)}</span>
          </div>
        </SectionCard>
        <div className="space-y-6">
          <SectionCard
            title="Retailer"
            actions={
              <Link href={`/retailers/${order.retailerId}`} className="text-xs text-primary hover:underline">
                View retailer
              </Link>
            }
          >
            <DetailGrid
              columns={1}
              items={[
                { label: "Shop", value: `${order.retailerName} (${order.retailerId})` },
                { label: "City", value: order.retailerCity || "—" },
                { label: "Note from retailer", value: order.note ?? "—" },
                { label: "Purchase invoice", value: order.purchaseInvoiceNumber ?? "Issued on delivery" },
              ]}
            />
          </SectionCard>
          <SectionCard title="History">{timeline.data ? <Timeline events={timeline.data} /> : null}</SectionCard>
        </div>
      </div>

      {pending ? (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && setPending(null)}
          title={`${ACTIONS[pending].label}?`}
          description={ACTIONS[pending].description}
          confirmLabel={ACTIONS[pending].label}
          onConfirm={async () => {
            const result = await move(pending);
            if (result.ok) setPending(null);
          }}
        />
      ) : null}
      <ReasonDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel this order?"
        description="The retailer sees the reason in the app. No stock is added for cancelled orders."
        confirmLabel="Cancel order"
        destructive
        onSubmit={async (reason) => (await move("Cancelled", reason)).ok}
      />
    </div>
  );
}
