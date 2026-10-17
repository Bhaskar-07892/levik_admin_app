"use client";

import { ArrowLeft, Ban, CheckCircle2, Coins, Pencil, RotateCcw, XCircle } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { InvoicesTable } from "@/components/invoices/invoices-table";
import { LedgerTable } from "@/components/ledger/ledger-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { NotFoundCard } from "@/components/shared/not-found-card";
import { PageHeader } from "@/components/shared/page-header";
import { PointsAdjustDialog } from "@/components/shared/points-adjust-dialog";
import { ProgressBar } from "@/components/shared/progress-bar";
import { ReasonDialog } from "@/components/shared/reason-dialog";
import { DetailGrid, SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { listInventory, listInvoices, listPointsTransactions } from "@/lib/mock-api/queries";
import { pointsSummary, retailerAchievement, retailerSales, schemeProgress } from "@/lib/mock-api/rules";
import { reviewRetailerApplication, setRetailerAccountStatus } from "@/lib/mock-api/services";
import { useDb } from "@/lib/mock-api/store";
import { formatDate, formatDateTime, formatINR, formatNumber, formatPoints } from "@/lib/utils/format";
import { runAction } from "@/lib/utils/run-action";
import { RetailerEditDialog } from "./retailer-edit-dialog";

export function RetailerDetail({ id }: { id: string }) {
  const db = useDb();
  const retailer = db.retailers.find((r) => r.id === id);
  const [editOpen, setEditOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const invoices = useMemo(() => listInvoices(db).filter((i) => i.retailerId === id), [db, id]);
  const ledger = useMemo(() => listPointsTransactions(db).filter((t) => t.userId === id), [db, id]);
  const inventory = useMemo(() => listInventory(db).filter((i) => i.retailerId === id), [db, id]);
  const schemes = useMemo(
    () =>
      db.schemes
        .filter((s) => s.role === "retailer" && (s.status === "Active" || s.status === "Scheduled"))
        .map((scheme) => ({ scheme, progress: schemeProgress(db, scheme, id), awarded: scheme.awardedUserIds.includes(id) })),
    [db, id],
  );

  if (!retailer) return <NotFoundCard entity="Retailer" backHref="/retailers" backLabel="Back to retailers" />;

  const points = pointsSummary(db, id);
  const sales = retailerSales(db, id);
  const achievement = retailerAchievement(db, retailer);
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
          <TabsTrigger value="invoices">Invoices ({invoices.length})</TabsTrigger>
          <TabsTrigger value="inventory">Inventory ({inventory.length})</TabsTrigger>
          <TabsTrigger value="schemes">Schemes ({schemes.length})</TabsTrigger>
          <TabsTrigger value="incentives">Incentive history ({ledger.length})</TabsTrigger>
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
                { label: "City / State", value: `${retailer.city}, ${retailer.state}` },
                { label: "GSTIN", value: <span className="font-mono">{retailer.gstin ?? "Not GST registered"}</span> },
                { label: "Distributor", value: retailer.distributor },
                { label: "Monthly target", value: formatINR(retailer.monthlyTarget) },
                { label: "Registered", value: formatDate(retailer.registeredAt) },
              ]}
            />
          </SectionCard>
        </TabsContent>
        <TabsContent value="invoices" className="mt-4">
          <div className="rounded-xl border border-border bg-card">
            <InvoicesTable rows={invoices} showRetailer={false} />
          </div>
        </TabsContent>
        <TabsContent value="inventory" className="mt-4">
          <SectionCard title="Retailer-reported stock" description="Mock data reported from the retailer app – not live warehouse stock" bodyClassName="p-0">
            {inventory.length === 0 ? (
              <EmptyState title="No stock reported" description="This retailer has not reported any inventory yet." />
            ) : (
              <ul className="divide-y divide-border">
                {inventory.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div>
                      <p className="text-sm font-medium">{item.product?.name}</p>
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
        </TabsContent>
        <TabsContent value="schemes" className="mt-4">
          <SectionCard title="Retailer schemes" description="Active and scheduled schemes this shop can participate in" bodyClassName="p-0">
            {schemes.length === 0 ? (
              <EmptyState title="No active schemes" />
            ) : (
              <ul className="divide-y divide-border">
                {schemes.map(({ scheme, progress, awarded }) => {
                  const pct = Math.min(100, Math.round((progress / scheme.targetValue) * 100));
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
            <LedgerTable rows={ledger} showUser={false} />
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
        onConfirm={() => runAction(() => reviewRetailerApplication(retailer.id, "Approved"), `${retailer.shopName} approved`)}
      />
      <ReasonDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title="Reject retailer application"
        description="The applicant will be notified with this reason (simulated)."
        confirmLabel="Reject application"
        destructive
        onSubmit={(reason) => runAction(() => reviewRetailerApplication(retailer.id, "Rejected", reason), "Application rejected").ok}
      />
      <ReasonDialog
        open={accountOpen}
        onOpenChange={setAccountOpen}
        title={retailer.accountStatus === "Active" ? "Suspend retailer account" : "Reactivate retailer account"}
        description={retailer.accountStatus === "Active" ? "Suspended retailers cannot have invoices approved." : "The retailer will be able to submit and earn again."}
        confirmLabel={retailer.accountStatus === "Active" ? "Suspend" : "Reactivate"}
        destructive={retailer.accountStatus === "Active"}
        onSubmit={(reason) =>
          runAction(
            () => setRetailerAccountStatus(retailer.id, retailer.accountStatus === "Active" ? "Suspended" : "Active", reason),
            retailer.accountStatus === "Active" ? "Retailer suspended" : "Retailer reactivated",
          ).ok
        }
      />
    </div>
  );
}
