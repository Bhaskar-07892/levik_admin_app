"use client";

import { ArrowLeft, Ban, CheckCircle2, Coins, Pencil, RotateCcw, XCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { RelatedInvoices } from "@/components/invoices/invoices-table";
import { RelatedLedger } from "@/components/ledger/ledger-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { PointsAdjustDialog } from "@/components/shared/points-adjust-dialog";
import { ProgressBar } from "@/components/shared/progress-bar";
import { QueryBoundary } from "@/components/shared/query-states";
import { ReasonDialog } from "@/components/shared/reason-dialog";
import { DetailGrid, SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { SignedPhoto } from "@/components/shared/signed-photo";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { $api, api, call } from "@/lib/api/client";
import type { RetailerDetail as Retailer } from "@/lib/api/types";
import { formatDate, formatDateTime, formatINR, formatNumber, formatPoints } from "@/lib/utils/format";
import { runAction } from "@/lib/utils/run-action";
import { RetailerEditDialog } from "./retailer-edit-dialog";
import { RelatedBills } from "@/components/bills/bills-table";
import { StockMovementsTable } from "@/components/inventory/stock-movements-table";
import { RelatedOrders } from "@/components/orders/orders-table";
import { API_URL } from "@/lib/api/auth";

export function RetailerDetail({ id }: { id: string }) {
  const query = $api.useQuery("get", "/api/v1/admin/retailers/{id}", { params: { path: { id } } });
  return (
    <QueryBoundary query={query} entity="Retailer" backHref="/retailers" backLabel="Back to retailers">
      {(retailer) => <RetailerProfile retailer={retailer} />}
    </QueryBoundary>
  );
}

function RetailerProfile({ retailer }: { retailer: Retailer }) {
  const id = retailer.id;
  const [editOpen, setEditOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const { data: inventoryPage } = $api.useQuery("get", "/api/v1/admin/inventory", { params: { query: { retailerId: id, pageSize: 100 } } });
  const { data: schemes = [] } = $api.useQuery("get", "/api/v1/admin/schemes/progress", { params: { query: { userId: id } } });
  const inventory = inventoryPage?.items ?? [];

  const { points, sales30d: sales, achievementPct: achievement } = retailer;
  const review = (decision: "Approved" | "Rejected", reason?: string) =>
    call(api.POST("/api/v1/admin/retailers/{id}/review", { params: { path: { id } }, body: { decision, reason } }));
  const isPending = retailer.verificationStatus === "Pending";

  return (
    <div>
      <Link href="/retailers" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Retailers
      </Link>
      <PageHeader
        title={retailer.shopName}
        description={`${retailer.id} · ${retailer.ownerName} · ${retailer.city}, ${retailer.state}`}
        eyebrow={
          <div className="flex gap-2">
            <StatusBadge status={retailer.verificationStatus} />
            <StatusBadge status={retailer.accountStatus} />
          </div>
        }
        actions={
          <>
            {isPending ? (
              <>
                <Button onClick={() => setApproveOpen(true)}>
                  <CheckCircle2 /> Approve application
                </Button>
                <Button variant="destructive" onClick={() => setRejectOpen(true)}>
                  <XCircle /> Reject
                </Button>
              </>
            ) : null}
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil /> Edit shop
            </Button>
            {!isPending ? (
              <Button variant="outline" onClick={() => setAdjustOpen(true)}>
                <Coins /> Adjust points
              </Button>
            ) : null}
            {retailer.verificationStatus === "Approved" ? (
              retailer.accountStatus === "Active" ? (
                <Button variant="destructive" onClick={() => setAccountOpen(true)}>
                  <Ban /> Suspend
                </Button>
              ) : (
                <Button variant="outline" onClick={() => setAccountOpen(true)}>
                  <RotateCcw /> Reactivate
                </Button>
              )
            ) : null}
          </>
        }
      />

      {isPending ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-sm text-warning">
          New retailer application received {formatDate(retailer.registeredAt)}. Verify the GSTIN and shop details, then approve or reject.
        </div>
      ) : null}
      {retailer.rejectionReason ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50/70 p-4 text-sm text-destructive">Rejected: {retailer.rejectionReason}</div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Incentive balance</p>
          <p className="mt-1.5 text-2xl font-semibold text-primary tabular-nums">{formatNumber(points.available)}</p>
          <p className="text-xs text-muted-foreground">{formatNumber(points.lifetime)} lifetime pts</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Sales · 30 days</p>
          <p className="mt-1.5 text-2xl font-semibold tabular-nums">{formatINR(sales)}</p>
          <p className="text-xs text-muted-foreground">Approved invoices, pre-GST</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 sm:col-span-2">
          <div className="flex items-baseline justify-between">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Monthly target achievement</p>
            <p className="text-sm font-semibold tabular-nums">{achievement}%</p>
          </div>
          <ProgressBar value={achievement} className="mt-3 h-2" />
          <p className="mt-2 text-xs text-muted-foreground">
            {formatINR(sales)} of {formatINR(retailer.monthlyTarget)} target
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="mt-6">
        <TabsList className="overflow-x-auto">
          <TabsTrigger value="overview">Shop details</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="bills">Bills</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="inventory">Inventory ({inventoryPage?.total ?? 0})</TabsTrigger>
          <TabsTrigger value="schemes">Schemes ({schemes.length})</TabsTrigger>
          <TabsTrigger value="incentives">Incentive history</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4">
          <SectionCard title="Shop information">
            <DetailGrid
              columns={3}
              items={[
                { label: "Owner", value: retailer.ownerName },
                { label: "Mobile", value: retailer.mobile },
                { label: "Email", value: retailer.email ?? "—" },
                { label: "Address", value: retailer.address },
                { label: "City / State / Pincode", value: [retailer.city, retailer.state, retailer.pincode].filter(Boolean).join(", ") },
                { label: "PAN", value: <span className="font-mono">{retailer.pan ?? "—"}</span> },
                {
                  label: "GST certificate",
                  value: retailer.gstCertificateUrl ? (
                    <a href={`${API_URL}${retailer.gstCertificateUrl}`} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                      Open document
                    </a>
                  ) : (
                    "Not uploaded"
                  ),
                },
                {
                  label: "Shop location",
                  value:
                    retailer.latitude != null && retailer.longitude != null ? (
                      <a href={`https://www.google.com/maps?q=${retailer.latitude},${retailer.longitude}`} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                        View on map
                      </a>
                    ) : (
                      "Not shared"
                    ),
                },
                { label: "GSTIN", value: <span className="font-mono">{retailer.gstin ?? "Not GST registered"}</span> },
                { label: "Distributor", value: retailer.distributor },
                { label: "Monthly target", value: formatINR(retailer.monthlyTarget) },
                { label: "Registered", value: formatDate(retailer.registeredAt) },
              ]}
            />
          </SectionCard>
          <SectionCard title="Photos" description="Set by the retailer in the app. Plumbers see the shop photo when choosing a dealer." className="mt-6">
            <div className="flex flex-wrap gap-6">
              <figure className="space-y-2">
                <SignedPhoto url={retailer.shopPhotoUrl} alt={`${retailer.shopName} shop front`} className="aspect-[4/3] w-72" emptyLabel="No shop photo yet" />
                <figcaption className="text-xs text-muted-foreground">Shop front</figcaption>
              </figure>
              <figure className="space-y-2">
                <SignedPhoto url={retailer.photoUrl} alt={`${retailer.ownerName} profile photo`} className="aspect-square w-40" />
                <figcaption className="text-xs text-muted-foreground">Owner</figcaption>
              </figure>
            </div>
          </SectionCard>
        </TabsContent>
        <TabsContent value="orders" className="mt-4">
          <div className="rounded-xl border border-border bg-card">
            <RelatedOrders retailerId={id} />
          </div>
        </TabsContent>
        <TabsContent value="bills" className="mt-4">
          <div className="rounded-xl border border-border bg-card">
            <RelatedBills retailerId={id} />
          </div>
        </TabsContent>
        <TabsContent value="invoices" className="mt-4">
          <div className="rounded-xl border border-border bg-card">
            <RelatedInvoices retailerId={id} />
          </div>
        </TabsContent>
        <TabsContent value="inventory" className="mt-4">
          <SectionCard
            title="Current stock"
            description="Delivered orders add stock; confirmed plumber sales and bills take it out. The retailer can also correct a count."
            bodyClassName="p-0"
          >
            {inventory.length === 0 ? (
              <EmptyState title="No stock reported" description="This retailer has not reported any inventory yet." />
            ) : (
              <ul className="divide-y divide-border">
                {inventory.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div>
                      <p className="text-sm font-medium">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">Updated {formatDateTime(item.updatedAt)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold tabular-nums">{item.quantity} units</span>
                      <StatusBadge status={item.stockStatus} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
          <SectionCard className="mt-6" title="Stock history" description="Every change, with the balance after it" bodyClassName="p-0">
            <StockMovementsTable retailerId={id} />
          </SectionCard>
        </TabsContent>
        <TabsContent value="schemes" className="mt-4">
          <SectionCard title="Retailer schemes" description="Live schemes for retailers and this shop's progress" bodyClassName="p-0">
            {schemes.length === 0 ? (
              <EmptyState title="No active schemes" />
            ) : (
              <ul className="divide-y divide-border">
                {schemes.map((scheme) => {
                  const { progress, awarded } = scheme;
                  const pct = Math.min(100, scheme.percent);
                  return (
                    <li key={scheme.id}>
                      <Link href={`/schemes/${scheme.id}`} className="grid gap-2 px-5 py-4 hover:bg-muted/40 md:grid-cols-[1.5fr_1fr] md:items-center">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{scheme.name}</span>
                            <StatusBadge status={scheme.status} />
                            {awarded ? <StatusBadge status="Achieved" /> : null}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(scheme.startDate)} – {formatDate(scheme.endDate)} · Bonus {formatPoints(scheme.incentivePoints)}
                          </p>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs">
                            <span>
                              {formatINR(progress)} / {formatINR(scheme.targetValue)}
                            </span>
                            <span className="tabular-nums">{pct}%</span>
                          </div>
                          <ProgressBar value={pct} className="mt-1" tone={awarded ? "gold" : undefined} />
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>
        </TabsContent>
        <TabsContent value="incentives" className="mt-4">
          <div className="rounded-xl border border-border bg-card">
            <RelatedLedger userId={id} />
          </div>
        </TabsContent>
      </Tabs>

      <RetailerEditDialog retailer={retailer} open={editOpen} onOpenChange={setEditOpen} />
      <PointsAdjustDialog open={adjustOpen} onOpenChange={setAdjustOpen} userId={retailer.id} userName={retailer.shopName} available={points.available} />
      <ConfirmDialog
        open={approveOpen}
        onOpenChange={setApproveOpen}
        title="Approve retailer application?"
        description={`${retailer.shopName} will be able to submit invoices and join retailer schemes.`}
        confirmLabel="Approve retailer"
        onConfirm={() => runAction(() => review("Approved"), `${retailer.shopName} approved`)}
      />
      <ReasonDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title="Reject retailer application"
        description="The applicant sees this reason in the retailer app."
        confirmLabel="Reject application"
        destructive
        onSubmit={async (reason) => (await runAction(() => review("Rejected", reason), "Application rejected")).ok}
      />
      <ReasonDialog
        open={accountOpen}
        onOpenChange={setAccountOpen}
        title={retailer.accountStatus === "Active" ? "Suspend retailer account" : "Reactivate retailer account"}
        description={retailer.accountStatus === "Active" ? "Suspended retailers cannot have invoices approved." : "The retailer will be able to submit and earn again."}
        confirmLabel={retailer.accountStatus === "Active" ? "Suspend" : "Reactivate"}
        destructive={retailer.accountStatus === "Active"}
        onSubmit={async (reason) =>
          (
            await runAction(
              () =>
                call(
                  api.POST("/api/v1/admin/retailers/{id}/account-status", {
                    params: { path: { id } },
                    body: { status: retailer.accountStatus === "Active" ? "Suspended" : "Active", reason },
                  }),
                ),
              retailer.accountStatus === "Active" ? "Retailer suspended" : "Retailer reactivated",
            )
          ).ok
        }
      />
    </div>
  );
}
