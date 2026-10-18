"use client";

import { ArrowLeft, CheckCircle2, Flag, XCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ChecksList } from "@/components/shared/checks-list";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { QueryBoundary } from "@/components/shared/query-states";
import { ProductThumb } from "@/components/shared/product-thumb";
import { ReasonDialog } from "@/components/shared/reason-dialog";
import { SchemeImpactList } from "@/components/shared/scheme-impact-list";
import { DetailGrid, SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Timeline } from "@/components/shared/timeline";
import { UploadedFile } from "@/components/shared/uploaded-file";
import { Button } from "@/components/ui/button";
import { $api, api, call } from "@/lib/api/client";
import type { ScanReview } from "@/lib/api/types";
import { formatDateTime, formatNumber, formatPoints } from "@/lib/utils/format";
import { runAction } from "@/lib/utils/run-action";

export function ScanDetail({ id }: { id: string }) {
  const query = $api.useQuery("get", "/api/v1/admin/scans/{id}", { params: { path: { id } } });
  return (
    <QueryBoundary query={query} entity="Scan" backHref="/scans" backLabel="Back to scans">
      {(review) => <ScanReviewPage review={review} />}
    </QueryBoundary>
  );
}

function ScanReviewPage({ review }: { review: ScanReview }) {
  const { scan, checks, pointsCalculation, schemeImpacts: impacts, linkedInvoice, plumberPoints, timeline } = review;
  const { plumber, product, retailer } = scan;
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [flagOpen, setFlagOpen] = useState(false);

  const blocked = checks.some((c) => c.blocking && !c.passed);
  const points = pointsCalculation.pointsOnApproval;
  const balance = plumberPoints.available;
  const decidable = scan.status === "Pending" || scan.status === "Flagged";
  const bonus = pointsCalculation.schemeBonusUnlocked;

  return (
    <div>
      <Link href="/scans" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Product Scans
      </Link>
      <PageHeader
        title={`Scan ${scan.id}`}
        description={`Submitted ${formatDateTime(scan.scannedAt)} from ${scan.siteLocation}`}
        eyebrow={<StatusBadge status={scan.status} />}
        actions={
          decidable ? (
            <>
              <Button onClick={() => setApproveOpen(true)} disabled={blocked}>
                <CheckCircle2 /> Approve
              </Button>
              <Button variant="destructive" onClick={() => setRejectOpen(true)}>
                <XCircle /> Reject
              </Button>
              {scan.status === "Pending" ? (
                <Button variant="outline" onClick={() => setFlagOpen(true)}>
                  <Flag /> Flag for investigation
                </Button>
              ) : null}
            </>
          ) : null
        }
      />

      {scan.status === "Approved" ? (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm text-success">
          Approved by {scan.reviewedBy} on {formatDateTime(scan.reviewedAt)}. {formatPoints(scan.awardedPoints ?? 0)} credited in ledger entry{" "}
          <Link href={`/ledger?search=${scan.ledgerTxnId ?? ""}`} className="font-mono underline">
            {scan.ledgerTxnId}
          </Link>
          . Re-approval is blocked to prevent duplicate credits.
        </div>
      ) : null}
      {scan.status === "Rejected" ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50/70 p-4 text-sm text-destructive">
          Rejected by {scan.reviewedBy}: {scan.rejectionReason}. No points were credited.
        </div>
      ) : null}
      {scan.status === "Flagged" ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-sm text-warning">Flagged for investigation: {scan.flagReason}</div>
      ) : null}
      {decidable && blocked ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50/70 p-4 text-sm text-destructive">
          Approval is blocked by failed checks:{" "}
          {checks
            .filter((c) => c.blocking && !c.passed)
            .map((c) => `${c.label} (${c.detail})`)
            .join("; ")}
          . Reject or flag this scan instead.
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <div className="grid gap-6 md:grid-cols-2">
            <SectionCard
              title="Plumber"
              actions={
                <Link href={`/plumbers/${plumber.id}`} className="text-xs text-primary hover:underline">
                  View profile
                </Link>
              }
            >
              <DetailGrid
                columns={1}
                items={[
                  { label: "Name", value: `${plumber.name} (${plumber.id})` },
                  { label: "Mobile · City", value: `${plumber.mobile} · ${plumber.city}` },
                  {
                    label: "KYC / account",
                    value: (
                      <span className="flex gap-2">
                        <StatusBadge status={plumber.verificationStatus} />
                        <StatusBadge status={plumber.accountStatus} />
                      </span>
                    ),
                  },
                  { label: "Available balance", value: formatPoints(balance) },
                ]}
              />
            </SectionCard>
            <SectionCard
              title="Product"
              actions={
                <Link href={`/products/${product.id}`} className="text-xs text-primary hover:underline">
                  View product
                </Link>
              }
            >
              <div className="flex gap-4">
                <ProductThumb src={product.imageUrl} alt={product.name} className="size-20 shrink-0" sizes="80px" />
                <DetailGrid
                  columns={1}
                  items={[
                    { label: "Model", value: `${product.name}` },
                    { label: "Category", value: product.category },
                    { label: "Dimensions", value: product.dimensions ?? "Not published" },
                  ]}
                />
              </div>
            </SectionCard>
          </div>
          <SectionCard title="Submission & proof of sale">
            <DetailGrid
              columns={3}
              items={[
                { label: "Submitted code", value: <span className="font-mono break-all">{scan.productUnitSerial ?? scan.submittedCode}</span> },
                {
                  label: "QR label",
                  value: scan.labelVerified ? (
                    <span className="text-success">Signature verified</span>
                  ) : (
                    <span className="text-warning">Typed manually / unsigned</span>
                  ),
                },
                { label: "Installation site", value: scan.siteLocation || "—" },
                { label: "Scanned at", value: formatDateTime(scan.scannedAt) },
                {
                  label: "Retailer reference",
                  value: retailer ? (
                    <Link href={`/retailers/${retailer.id}`} className="text-primary hover:underline">
                      {retailer.shopName}
                    </Link>
                  ) : (
                    <span className="text-warning">Not supplied</span>
                  ),
                },
                {
                  label: "Invoice reference",
                  value: scan.invoiceNumber ? (
                    linkedInvoice ? (
                      <Link href={`/invoices/${linkedInvoice.id}`} className="font-mono text-primary hover:underline">
                        {scan.invoiceNumber}
                      </Link>
                    ) : (
                      <span className="font-mono">{scan.invoiceNumber}</span>
                    )
                  ) : (
                    "—"
                  ),
                },
                { label: "Linked invoice status", value: linkedInvoice ? <StatusBadge status={linkedInvoice.status} /> : "—" },
              ]}
            />
          </SectionCard>
          {scan.photoKey ? (
            <SectionCard title="Installation photo" description="Uploaded by the plumber with the scan">
              <UploadedFile fileKey={scan.photoKey} alt={`Installation photo for ${scan.id}`} />
            </SectionCard>
          ) : null}
          <SectionCard title="Verification checks" description="Evaluated by the API – blocking checks must pass before approval">
            <ChecksList checks={checks} />
          </SectionCard>
        </div>
        <div className="space-y-6">
          <SectionCard title="Points calculation">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Base points for model {product.modelCode}</dt>
                <dd className="font-medium tabular-nums">{formatNumber(pointsCalculation.basePoints)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Reward eligible</dt>
                <dd>{pointsCalculation.rewardEligible ? "Yes" : "No"}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-2 text-base">
                <dt className="font-medium">{scan.status === "Approved" ? "Points credited" : "Points on approval"}</dt>
                <dd className="font-semibold text-primary tabular-nums">{formatPoints(scan.awardedPoints ?? points)}</dd>
              </div>
              {decidable && bonus > 0 ? (
                <div className="flex justify-between text-[#8a6a2f]">
                  <dt>+ Scheme bonus unlocked</dt>
                  <dd className="font-semibold tabular-nums">{formatPoints(bonus)}</dd>
                </div>
              ) : null}
            </dl>
          </SectionCard>
          <SectionCard title="Scheme progress">
            <SchemeImpactList impacts={impacts} />
          </SectionCard>
          <SectionCard title="Verification history">
            <Timeline events={timeline} />
          </SectionCard>
        </div>
      </div>

      <ConfirmDialog
        open={approveOpen}
        onOpenChange={setApproveOpen}
        title="Approve scan and credit points?"
        description={
          <>
            {plumber.name} will be credited <strong>{formatPoints(points)}</strong>
            {bonus > 0 ? <> plus a <strong>{formatPoints(bonus)}</strong> scheme bonus</> : null}. A ledger transaction and audit entry will be created.
          </>
        }
        confirmLabel="Approve & credit"
        onConfirm={() =>
          runAction(
            () => call(api.POST("/api/v1/admin/scans/{id}/approve", { params: { path: { id: scan.id } }, body: {} })),
            (r) =>
              `Scan approved – ${formatPoints(r.points)} credited to ${plumber.name}` +
              (r.schemeAwards.length ? ` + ${r.schemeAwards.map((s) => `${formatPoints(s.incentivePoints)} bonus (${s.name})`).join(", ")}` : ""),
          )
        }
      />
      <ReasonDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title="Reject scan"
        description="No points will be credited. The reason is shown to the plumber in the app and recorded in the audit log."
        label="Rejection reason"
        placeholder="e.g. Serial code already credited on another installation"
        confirmLabel="Reject scan"
        destructive
        onSubmit={async (reason) =>
          (await runAction(() => call(api.POST("/api/v1/admin/scans/{id}/reject", { params: { path: { id: scan.id } }, body: { reason } })), "Scan rejected – no points credited")).ok
        }
      />
      <ReasonDialog
        open={flagOpen}
        onOpenChange={setFlagOpen}
        title="Flag for investigation"
        description="The scan stays uncredited until it is approved or rejected after investigation."
        label="What needs investigating?"
        confirmLabel="Flag scan"
        onSubmit={async (reason) =>
          (await runAction(() => call(api.POST("/api/v1/admin/scans/{id}/flag", { params: { path: { id: scan.id } }, body: { reason } })), "Scan flagged for investigation")).ok
        }
      />
    </div>
  );
}
