"use client";

import { ArrowLeft, Ban, CheckCircle2, PackageCheck, Truck, Workflow, XOctagon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { RewardIcon } from "@/components/rewards/reward-icon";
import { ChecksList } from "@/components/shared/checks-list";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { NotFoundCard } from "@/components/shared/not-found-card";
import { PageHeader } from "@/components/shared/page-header";
import { ReasonDialog } from "@/components/shared/reason-dialog";
import { DetailGrid, SectionCard } from "@/components/shared/section-card";
import { RoleBadge, StatusBadge } from "@/components/shared/status-badge";
import { Timeline } from "@/components/shared/timeline";
import { Button } from "@/components/ui/button";
import { findReward, findUser, hasBlockingFailure, nextRedemptionStatuses, pointsSummary, redemptionChecks } from "@/lib/mock-api/rules";
import { updateRedemptionStatus } from "@/lib/mock-api/services";
import { useDb } from "@/lib/mock-api/store";
import { cn } from "@/lib/utils";
import { formatDateTime, formatNumber, formatPoints } from "@/lib/utils/format";
import { runAction } from "@/lib/utils/run-action";
import type { RedemptionStatus } from "@/types";

const ACTION_META: Partial<Record<RedemptionStatus, { label: string; icon: typeof CheckCircle2; description: string }>> = {
  Approved: { label: "Approve & deduct points", icon: CheckCircle2, description: "Validates balance and stock, deducts points once and reduces reward stock by one." },
  Processing: { label: "Mark processing", icon: Workflow, description: "Creates a mock fulfilment reference. No points are deducted." },
  Dispatched: { label: "Mark dispatched", icon: Truck, description: "Assigns a mock courier tracking number. No points are deducted." },
  Delivered: { label: "Mark delivered", icon: PackageCheck, description: "Completes the redemption. Digital rewards receive a mock voucher code. No points are deducted." },
};

export function RedemptionDetail({ id }: { id: string }) {
  const db = useDb();
  const redemption = db.redemptions.find((r) => r.id === id);
  const [pending, setPending] = useState<RedemptionStatus | null>(null);
  const [cancelTarget, setCancelTarget] = useState<"Cancelled" | "Failed" | null>(null);
  const ledger = useMemo(() => db.ledger.filter((t) => t.related?.type === "redemption" && t.related.id === id), [db, id]);

  if (!redemption) return <NotFoundCard entity="Redemption" backHref="/redemptions" backLabel="Back to redemptions" />;

  const reward = findReward(db, redemption.rewardId);
  const user = findUser(db, redemption.userId);
  const balance = pointsSummary(db, redemption.userId).available;
  const checks = redemptionChecks(db, redemption);
  const blocked = hasBlockingFailure(checks);
  const next = nextRedemptionStatuses(redemption, reward);
  const forward = next.filter((s) => s !== "Cancelled" && s !== "Failed");
  const steps: RedemptionStatus[] = reward?.type === "Physical" ? ["Requested", "Approved", "Processing", "Dispatched", "Delivered"] : ["Requested", "Approved", "Processing", "Delivered"];
  const currentIndex = steps.indexOf(redemption.status);
  const terminalNegative = redemption.status === "Cancelled" || redemption.status === "Failed";

  return (
    <div>
      <Link href="/redemptions" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Redemptions
      </Link>
      <PageHeader
        title={`Redemption ${redemption.id}`}
        description={`${reward?.name ?? redemption.rewardId} for ${user?.name ?? redemption.userId} · requested ${formatDateTime(redemption.requestedAt)}`}
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
                user ? (
                  <Link href={user.href} className="text-xs text-primary hover:underline">
                    View profile
                  </Link>
                ) : null
              }
            >
              <DetailGrid
                columns={1}
                items={[
                  { label: "Name", value: `${user?.name ?? "Unknown"} (${redemption.userId})` },
                  { label: "Location", value: user?.subtitle },
                  { label: "Available balance", value: <span className="font-semibold text-primary">{formatPoints(balance)}</span> },
                  { label: "Delivery", value: redemption.deliveryAddress },
                ]}
              />
            </SectionCard>
            <SectionCard title="Reward">
              {reward ? (
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
              ) : (
                <p className="text-sm text-muted-foreground">Reward not found.</p>
              )}
            </SectionCard>
          </div>
          {redemption.status === "Requested" ? (
            <SectionCard title="Eligibility checks" description="All blocking checks must pass before approval">
              <ChecksList checks={checks} />
            </SectionCard>
          ) : null}
          <SectionCard title="Fulfilment references" description="Mock references – no courier or voucher provider is integrated">
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
              <Link href="/ledger" className="text-xs text-primary hover:underline">
                Open points ledger
              </Link>
            </div>
          </SectionCard>
          <SectionCard title="Status history">
            <Timeline events={redemption.history} />
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
            () => updateRedemptionStatus(redemption.id, pending),
            pending === "Approved" ? `Approved – ${formatPoints(redemption.pointsCost)} deducted, stock updated` : `Redemption marked ${pending.toLowerCase()}`,
          )
        }
      />
      <ReasonDialog
        open={cancelTarget !== null}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        title={cancelTarget === "Failed" ? "Mark fulfilment as failed" : "Cancel redemption"}
        description={redemption.debitTxnId ? `${formatPoints(redemption.pointsCost)} will be refunded once and reward stock restored.` : "No points have been deducted yet, so no refund is needed."}
        confirmLabel={cancelTarget === "Failed" ? "Mark failed" : "Cancel redemption"}
        destructive
        onSubmit={(reason) =>
          runAction(() => updateRedemptionStatus(redemption.id, cancelTarget ?? "Cancelled", reason), cancelTarget === "Failed" ? "Marked as failed" : "Redemption cancelled").ok
        }
      />
    </div>
  );
}
