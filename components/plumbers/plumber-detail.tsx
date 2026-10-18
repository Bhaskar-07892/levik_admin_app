"use client";

import { ArrowLeft, BadgeCheck, Ban, Coins, Pencil, RotateCcw, ShieldX, UserCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { RelatedLedger } from "@/components/ledger/ledger-table";
import { RelatedRedemptions } from "@/components/redemptions/redemptions-table";
import { RelatedScans } from "@/components/scans/scans-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { PointsAdjustDialog } from "@/components/shared/points-adjust-dialog";
import { QueryBoundary } from "@/components/shared/query-states";
import { ReasonDialog } from "@/components/shared/reason-dialog";
import { DetailGrid, SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { $api, api, call } from "@/lib/api/client";
import type { PlumberDetail as Plumber } from "@/lib/api/types";
import { formatDate, formatNumber } from "@/lib/utils/format";
import { runAction } from "@/lib/utils/run-action";
import type { AccountStatus } from "@/types";
import { PlumberEditDialog } from "./plumber-edit-dialog";

export function PlumberDetail({ id }: { id: string }) {
  const query = $api.useQuery("get", "/api/v1/admin/plumbers/{id}", { params: { path: { id } } });
  return (
    <QueryBoundary query={query} entity="Plumber" backHref="/plumbers" backLabel="Back to plumbers">
      {(plumber) => <PlumberProfile plumber={plumber} />}
    </QueryBoundary>
  );
}

function PlumberProfile({ plumber }: { plumber: Plumber }) {
  const [editOpen, setEditOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [accountTarget, setAccountTarget] = useState<AccountStatus | null>(null);

  const { points, scanCounts } = plumber;
  const preferred = plumber.preferredRetailer;
  const setVerification = (status: "Verified" | "Rejected", note: string) =>
    call(api.POST("/api/v1/admin/plumbers/{id}/verification", { params: { path: { id: plumber.id } }, body: { status, note } }));

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
          { label: "Approved scans", value: `${scanCounts.approved} of ${scanCounts.total}` },
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
          <TabsTrigger value="scans">Scan history ({scanCounts.total})</TabsTrigger>
          <TabsTrigger value="ledger">Points ledger</TabsTrigger>
          <TabsTrigger value="redemptions">Redemptions</TabsTrigger>
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
            <SectionCard title="KYC verification" description="Aadhaar reference is stored masked; only the last 4 digits are kept">
              <DetailGrid
                columns={1}
                items={[
                  { label: "Status", value: <StatusBadge status={plumber.verificationStatus} /> },
                  { label: "Aadhaar reference", value: plumber.aadhaarMasked ? <span className="font-mono">{plumber.aadhaarMasked}</span> : "Not submitted" },
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
            <RelatedScans filter={{ plumberId: plumber.id }} showPlumber={false} />
          </div>
        </TabsContent>
        <TabsContent value="ledger" className="mt-4">
          <div className="rounded-xl border border-border bg-card">
            <RelatedLedger userId={plumber.id} />
          </div>
        </TabsContent>
        <TabsContent value="redemptions" className="mt-4">
          <div className="rounded-xl border border-border bg-card">
            <RelatedRedemptions filter={{ userId: plumber.id }} showUser={false} />
          </div>
        </TabsContent>
      </Tabs>

      <PlumberEditDialog plumber={plumber} open={editOpen} onOpenChange={setEditOpen} />
      <PointsAdjustDialog open={adjustOpen} onOpenChange={setAdjustOpen} userId={plumber.id} userName={plumber.name} available={points.available} />
      <ConfirmDialog
        open={verifyOpen}
        onOpenChange={setVerifyOpen}
        title="Mark KYC as verified?"
        description={`${plumber.name} will be able to earn points on approved scans. Confirm you have checked their Aadhaar document.`}
        confirmLabel="Verify plumber"
        onConfirm={() => runAction(() => setVerification("Verified", "KYC documents checked by admin"), `${plumber.name} marked as verified`)}
      />
      <ReasonDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title="Reject KYC verification"
        description="The plumber will not be able to earn points until re-verified."
        confirmLabel="Reject KYC"
        destructive
        onSubmit={async (reason) => (await runAction(() => setVerification("Rejected", reason), "KYC verification rejected")).ok}
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
        onSubmit={async (reason) =>
          (
            await runAction(
              () => call(api.POST("/api/v1/admin/plumbers/{id}/account-status", { params: { path: { id: plumber.id } }, body: { status: accountTarget ?? "Active", reason } })),
              `Account ${accountTarget === "Suspended" ? "suspended" : "reactivated"}`,
            )
          ).ok
        }
      />
    </div>
  );
}
