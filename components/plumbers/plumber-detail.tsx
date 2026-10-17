"use client";

import { ArrowLeft, BadgeCheck, Ban, Coins, Pencil, RotateCcw, ShieldX, UserCheck } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { LedgerTable } from "@/components/ledger/ledger-table";
import { RedemptionsTable } from "@/components/redemptions/redemptions-table";
import { ScansTable } from "@/components/scans/scans-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { NotFoundCard } from "@/components/shared/not-found-card";
import { PageHeader } from "@/components/shared/page-header";
import { PointsAdjustDialog } from "@/components/shared/points-adjust-dialog";
import { ReasonDialog } from "@/components/shared/reason-dialog";
import { DetailGrid, SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { listPointsTransactions, listRedemptions, listScans } from "@/lib/mock-api/queries";
import { findRetailer, pointsSummary } from "@/lib/mock-api/rules";
import { setPlumberAccountStatus, setPlumberVerification } from "@/lib/mock-api/services";
import { useDb } from "@/lib/mock-api/store";
import { formatDate, formatNumber } from "@/lib/utils/format";
import { runAction } from "@/lib/utils/run-action";
import type { AccountStatus } from "@/types";
import { PlumberEditDialog } from "./plumber-edit-dialog";

export function PlumberDetail({ id }: { id: string }) {
  const db = useDb();
  const plumber = db.plumbers.find((p) => p.id === id);
  const [editOpen, setEditOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [accountTarget, setAccountTarget] = useState<AccountStatus | null>(null);

  const scans = useMemo(() => listScans(db).filter((s) => s.plumberId === id), [db, id]);
  const ledger = useMemo(() => listPointsTransactions(db).filter((t) => t.userId === id), [db, id]);
  const redemptions = useMemo(() => listRedemptions(db).filter((r) => r.userId === id), [db, id]);

  if (!plumber) return <NotFoundCard entity="Plumber" backHref="/plumbers" backLabel="Back to plumbers" />;

  const points = pointsSummary(db, id);
  const preferred = findRetailer(db, plumber.preferredRetailerId);
  const approvedScans = scans.filter((s) => s.status === "Approved").length;

  return (
    <div>
      <Link href="/plumbers" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Plumbers
      </Link>
      <PageHeader
        title={plumber.name}
        description={`${plumber.id} · ${plumber.city}, ${plumber.state} · Registered ${formatDate(plumber.registeredAt)}`}
        eyebrow={
          <div className="flex gap-2">
            <StatusBadge status={plumber.verificationStatus} />
            <StatusBadge status={plumber.accountStatus} />
          </div>
        }
        actions={
          <>
            {plumber.verificationStatus === "Pending" ? (
              <>
                <Button onClick={() => setVerifyOpen(true)}>
                  <BadgeCheck /> Verify KYC
                </Button>
                <Button variant="destructive" onClick={() => setRejectOpen(true)}>
                  <ShieldX /> Reject KYC
                </Button>
              </>
            ) : null}
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil /> Edit profile
            </Button>
            <Button variant="outline" onClick={() => setAdjustOpen(true)}>
              <Coins /> Adjust points
            </Button>
            {plumber.accountStatus === "Active" ? (
              <Button variant="destructive" onClick={() => setAccountTarget("Suspended")}>
                <Ban /> Suspend
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setAccountTarget("Active")}>
                <RotateCcw /> Reactivate
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Available points", value: formatNumber(points.available), strong: true },
          { label: "Lifetime earned", value: formatNumber(points.lifetime) },
          { label: "Redeemed (net)", value: formatNumber(points.redeemed) },
          { label: "Approved scans", value: `${approvedScans} of ${scans.length}` },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{stat.label}</p>
            <p className={`mt-1.5 text-2xl font-semibold tabular-nums ${stat.strong ? "text-primary" : ""}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="overview" className="mt-6">
        <TabsList className="overflow-x-auto">
          <TabsTrigger value="overview">Profile</TabsTrigger>
          <TabsTrigger value="scans">Scan history ({scans.length})</TabsTrigger>
          <TabsTrigger value="ledger">Points ledger ({ledger.length})</TabsTrigger>
          <TabsTrigger value="redemptions">Redemptions ({redemptions.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-3">
            <SectionCard title="Profile" className="lg:col-span-2">
              <DetailGrid
                items={[
                  { label: "Mobile", value: plumber.mobile },
                  { label: "Email", value: plumber.email ?? "—" },
                  { label: "City / State", value: `${plumber.city}, ${plumber.state}` },
                  { label: "Pincode", value: plumber.pincode },
                  { label: "Experience", value: `${plumber.experienceYears} years` },
                  { label: "Specialisation", value: plumber.specialization },
                  {
                    label: "Preferred retailer",
                    value: preferred ? (
                      <Link href={`/retailers/${preferred.id}`} className="text-primary hover:underline">
                        {preferred.shopName}
                      </Link>
                    ) : (
                      "—"
                    ),
                  },
                  { label: "Registered", value: formatDate(plumber.registeredAt) },
                ]}
              />
            </SectionCard>
            <SectionCard title="KYC verification" description="Simulated Aadhaar check – no real identity data is stored">
              <DetailGrid
                columns={1}
                items={[
                  { label: "Status", value: <StatusBadge status={plumber.verificationStatus} /> },
                  { label: "Aadhaar reference", value: <span className="font-mono">{plumber.aadhaarMasked}</span> },
                  { label: "Reviewer note", value: plumber.verificationNote ?? "—" },
                ]}
              />
              {plumber.verificationStatus === "Rejected" ? (
                <Button variant="outline" size="sm" className="mt-4" onClick={() => setVerifyOpen(true)}>
                  <UserCheck /> Re-verify after document review
                </Button>
              ) : null}
            </SectionCard>
          </div>
        </TabsContent>
        <TabsContent value="scans" className="mt-4">
          <div className="rounded-xl border border-border bg-card">
            <ScansTable rows={scans} showPlumber={false} />
          </div>
        </TabsContent>
        <TabsContent value="ledger" className="mt-4">
          <div className="rounded-xl border border-border bg-card">
            <LedgerTable rows={ledger} showUser={false} />
          </div>
        </TabsContent>
        <TabsContent value="redemptions" className="mt-4">
          <div className="rounded-xl border border-border bg-card">
            <RedemptionsTable rows={redemptions} showUser={false} />
          </div>
        </TabsContent>
      </Tabs>

      <PlumberEditDialog plumber={plumber} open={editOpen} onOpenChange={setEditOpen} />
      <PointsAdjustDialog open={adjustOpen} onOpenChange={setAdjustOpen} userId={plumber.id} userName={plumber.name} available={points.available} />
      <ConfirmDialog
        open={verifyOpen}
        onOpenChange={setVerifyOpen}
        title="Mark KYC as verified?"
        description={`${plumber.name} will be able to earn points on approved scans. This is a simulated verification.`}
        confirmLabel="Verify plumber"
        onConfirm={() => runAction(() => setPlumberVerification(plumber.id, "Verified", "KYC verified by admin (simulated)"), `${plumber.name} marked as verified`)}
      />
      <ReasonDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title="Reject KYC verification"
        description="The plumber will not be able to earn points until re-verified."
        confirmLabel="Reject KYC"
        destructive
        onSubmit={(reason) => runAction(() => setPlumberVerification(plumber.id, "Rejected", reason), "KYC verification rejected").ok}
      />
      <ReasonDialog
        open={accountTarget !== null}
        onOpenChange={(open) => !open && setAccountTarget(null)}
        title={accountTarget === "Suspended" ? "Suspend plumber account" : "Reactivate plumber account"}
        description={
          accountTarget === "Suspended"
            ? "Suspended plumbers cannot have scans approved or redemptions processed."
            : "The plumber will regain access to earning and redemption."
        }
        confirmLabel={accountTarget === "Suspended" ? "Suspend account" : "Reactivate account"}
        destructive={accountTarget === "Suspended"}
        onSubmit={(reason) =>
          runAction(() => setPlumberAccountStatus(plumber.id, accountTarget ?? "Active", reason), `Account ${accountTarget === "Suspended" ? "suspended" : "reactivated"}`).ok
        }
      />
    </div>
  );
}
