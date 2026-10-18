"use client";

import { ArrowLeft, Ban, CheckCircle2, PackageCheck, Truck, Workflow, XOctagon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { RewardIcon } from "@/components/rewards/reward-icon";
import { ChecksList } from "@/components/shared/checks-list";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Field } from "@/components/forms/field";
import { PageHeader } from "@/components/shared/page-header";
import { QueryBoundary } from "@/components/shared/query-states";
import { ReasonDialog } from "@/components/shared/reason-dialog";
import { DetailGrid, SectionCard } from "@/components/shared/section-card";
import { RoleBadge, StatusBadge } from "@/components/shared/status-badge";
import { Timeline } from "@/components/shared/timeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { userHref } from "@/components/ledger/ledger-table";
import { $api, api, call } from "@/lib/api/client";
import type { RedemptionReview } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { formatDateTime, formatNumber, formatPoints } from "@/lib/utils/format";
import { runAction } from "@/lib/utils/run-action";
import type { RedemptionStatus } from "@/types";

const ACTION_META: Partial<Record<RedemptionStatus, { label: string; icon: typeof CheckCircle2; description: string }>> = {
  Approved: { label: "Approve & deduct points", icon: CheckCircle2, description: "Validates balance and stock, deducts points once and reduces reward stock by one." },
  Processing: { label: "Mark processing", icon: Workflow, description: "Creates a fulfilment reference. No points are deducted." },
  Dispatched: { label: "Mark dispatched", icon: Truck, description: "Records the courier and tracking number. No points are deducted." },
  Delivered: { label: "Mark delivered", icon: PackageCheck, description: "Completes the redemption. For digital rewards, record the voucher code sent to the user. No points are deducted." },
};

export function RedemptionDetail({ id }: { id: string }) {
  const query = $api.useQuery("get", "/api/v1/admin/redemptions/{id}", { params: { path: { id } } });
  return (
    <QueryBoundary query={query} entity="Redemption" backHref="/redemptions" backLabel="Back to redemptions">
      {(review) => <RedemptionReviewPage review={review} />}
    </QueryBoundary>
  );
}

type Transition = "Processing" | "Dispatched" | "Delivered" | "Cancelled" | "Failed";

function RedemptionReviewPage({ review }: { review: RedemptionReview }) {
  const { redemption, checks, userPoints, ledgerEntries: ledger, timeline, nextStatuses: next } = review;
  const { reward } = redemption;
  const [pending, setPending] = useState<RedemptionStatus | null>(null);
  const [cancelTarget, setCancelTarget] = useState<"Cancelled" | "Failed" | null>(null);
  const [courierName, setCourierName] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [voucherCode, setVoucherCode] = useState("");
  const balance = userPoints.available;
  const blocked = checks.some((c) => c.blocking && !c.passed);
  const profileHref = userHref(redemption);

  const perform = (status: RedemptionStatus, reason?: string) =>
    status === "Approved"
      ? call(api.POST("/api/v1/admin/redemptions/{id}/approve", { params: { path: { id: redemption.id } } }))
      : call(
          api.POST("/api/v1/admin/redemptions/{id}/status", {
            params: { path: { id: redemption.id } },
            body: {
              status: status as Transition,
              reason,
              courierName: courierName.trim() || undefined,
              trackingNumber: trackingNumber.trim() || undefined,
              voucherCode: voucherCode.trim() || undefined,
            },
          }),
        );
  const forward = next.filter((s) => s !== "Cancelled" && s !== "Failed");
  const steps: RedemptionStatus[] = reward.type === "Physical" ? ["Requested", "Approved", "Processing", "Dispatched", "Delivered"] : ["Requested", "Approved", "Processing", "Delivered"];
  const currentIndex = steps.indexOf(redemption.status);
  const terminalNegative = redemption.status === "Cancelled" || redemption.status === "Failed";

  return (
    <div>
      <Link href="/redemptions" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Redemptions
      </Link>
      <PageHeader
        title={`Redemption ${redemption.id}`}
        description={`${reward.name} for ${redemption.userName} · requested ${formatDateTime(redemption.requestedAt)}`}
        eyebrow={
          <div className="flex gap-2">
            <StatusBadge status={redemption.status} />
            <RoleBadge role={redemption.userRole} />
          </div>
        }
        actions={
          <>
            {forward.map((status) => {
              const meta = ACTION_META[status]!;
              return (
                <Button key={status} onClick={() => setPending(status)} disabled={status === "Approved" && blocked}>
                  <meta.icon /> {meta.label}
                </Button>
              );
            })}
            {next.includes("Failed") ? (
              <Button variant="outline" onClick={() => setCancelTarget("Failed")}>
                <XOctagon /> Mark failed
              </Button>
            ) : null}
            {next.includes("Cancelled") ? (
              <Button variant="destructive" onClick={() => setCancelTarget("Cancelled")}>
                <Ban /> Cancel
              </Button>
            ) : null}
          </>
        }
      />

      <SectionCard className="mb-6" title="Fulfilment progress">
        {terminalNegative ? (
          <p className="text-sm text-muted-foreground">
            This redemption was <strong>{redemption.status.toLowerCase()}</strong>
            {redemption.cancelReason ? `: ${redemption.cancelReason}` : ""}.{" "}
            {redemption.reversalTxnId ? `${formatPoints(redemption.pointsCost)} were refunded in ${redemption.reversalTxnId}.` : "No points had been deducted."}
          </p>
        ) : (
          <ol className="grid gap-3 sm:grid-cols-5">
            {steps.map((step, index) => {
              const done = index <= currentIndex;
              return (
                <li key={step} className="flex items-center gap-2 sm:flex-col sm:items-start">
                  <div className={cn("h-1.5 w-12 rounded-full sm:w-full", done ? "bg-primary" : "bg-muted")} />
                  <span className={cn("text-xs", done ? "font-medium text-foreground" : "text-muted-foreground")}>{step}</span>
                </li>
              );
            })}
          </ol>
        )}
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <div className="grid gap-6 md:grid-cols-2">
            <SectionCard
              title="Requested by"
              actions={
                <Link href={profileHref} className="text-xs text-primary hover:underline">
                  View profile
                </Link>
              }
            >
              <DetailGrid
                columns={1}
                items={[
                  { label: "Name", value: `${redemption.userName} (${redemption.userId})` },
                  { label: "Available balance", value: <span className="font-semibold text-primary">{formatPoints(balance)}</span> },
                  { label: "Delivery", value: redemption.deliveryAddress },
                ]}
              />
            </SectionCard>
            <SectionCard title="Reward">
              <div className="flex gap-4">
                <RewardIcon category={reward.category} className="size-14 shrink-0" />
                <DetailGrid
                  columns={1}
                  items={[
                    { label: "Reward", value: reward.name },
                    { label: "Type", value: `${reward.category} · ${reward.type}` },
                    { label: "Points", value: formatPoints(redemption.pointsCost) },
                    { label: "Current stock", value: `${reward.stock} units` },
                  ]}
                />
              </div>
            </SectionCard>
          </div>
          {redemption.status === "Requested" ? (
            <SectionCard title="Eligibility checks" description="All blocking checks must pass before approval">
              <ChecksList checks={checks} />
            </SectionCard>
          ) : null}
          <SectionCard title="Fulfilment references" description="Recorded by admins – courier and voucher providers are not integrated yet">
            <DetailGrid
              columns={3}
              items={[
                { label: "Fulfilment ref", value: redemption.fulfilmentRef ? <span className="font-mono">{redemption.fulfilmentRef}</span> : "—" },
                { label: "Courier", value: redemption.courierName ?? "—" },
                { label: "Tracking no.", value: redemption.trackingNumber ? <span className="font-mono">{redemption.trackingNumber}</span> : "—" },
                { label: "Voucher code", value: redemption.voucherCode ? <span className="font-mono">{redemption.voucherCode}</span> : "—" },
                { label: "Points debit", value: redemption.debitTxnId ? <span className="font-mono">{redemption.debitTxnId}</span> : "Not yet deducted" },
                { label: "Refund", value: redemption.reversalTxnId ? <span className="font-mono">{redemption.reversalTxnId}</span> : "—" },
              ]}
            />
          </SectionCard>
        </div>
        <div className="space-y-6">
          <SectionCard title="Ledger entries" description="Every points movement for this redemption" bodyClassName="p-0">
            {ledger.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted-foreground">No points have moved yet. Points are deducted on approval.</p>
            ) : (
              <ul className="divide-y divide-border">
                {ledger.map((t) => (
                  <li key={t.id} className="flex items-center justify-between px-5 py-3 text-sm">
                    <span>
                      <span className="block font-mono text-xs">{t.id}</span>
                      <span className="block text-xs text-muted-foreground">
                        {t.source} · {formatDateTime(t.createdAt)}
                      </span>
                    </span>
                    <span className={cn("font-semibold tabular-nums", t.credit ? "text-success" : "text-destructive")}>
                      {t.credit ? `+${formatNumber(t.credit)}` : `−${formatNumber(t.debit)}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="border-t border-border px-5 py-3">
              <Link href={`/ledger?search=${redemption.id}`} className="text-xs text-primary hover:underline">
                Open points ledger
              </Link>
            </div>
          </SectionCard>
          <SectionCard title="Status history">
            <Timeline events={timeline} />
          </SectionCard>
        </div>
      </div>

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
        title={pending ? `${ACTION_META[pending]?.label}?` : ""}
        description={pending ? ACTION_META[pending]?.description : ""}
        confirmLabel={pending ? (ACTION_META[pending]?.label ?? "Confirm") : "Confirm"}
        onConfirm={() =>
          pending &&
          runAction(
            () => perform(pending),
            pending === "Approved" ? `Approved – ${formatPoints(redemption.pointsCost)} deducted, stock updated` : `Redemption marked ${pending.toLowerCase()}`,
          )
        }
      >
        {pending === "Dispatched" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Courier (optional)" htmlFor="rd-courier">
              <Input id="rd-courier" value={courierName} onChange={(e) => setCourierName(e.target.value)} placeholder="e.g. Blue Dart" />
            </Field>
            <Field label="Tracking number (optional)" htmlFor="rd-tracking">
              <Input id="rd-tracking" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} />
            </Field>
          </div>
        ) : null}
        {pending === "Delivered" && reward.type === "Digital" ? (
          <Field label="Voucher code (optional)" htmlFor="rd-voucher">
            <Input id="rd-voucher" value={voucherCode} onChange={(e) => setVoucherCode(e.target.value)} className="font-mono" />
          </Field>
        ) : null}
      </ConfirmDialog>
      <ReasonDialog
        open={cancelTarget !== null}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        title={cancelTarget === "Failed" ? "Mark fulfilment as failed" : "Cancel redemption"}
        description={redemption.debitTxnId ? `${formatPoints(redemption.pointsCost)} will be refunded once and reward stock restored.` : "No points have been deducted yet, so no refund is needed."}
        confirmLabel={cancelTarget === "Failed" ? "Mark failed" : "Cancel redemption"}
        destructive
        onSubmit={async (reason) =>
          (await runAction(() => perform(cancelTarget ?? "Cancelled", reason), cancelTarget === "Failed" ? "Marked as failed" : "Redemption cancelled")).ok
        }
      />
    </div>
  );
}
