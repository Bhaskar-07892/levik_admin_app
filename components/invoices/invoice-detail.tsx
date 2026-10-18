"use client";

import { ArrowLeft, CheckCircle2, ClipboardCheck, MessageSquareWarning, XCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ChecksList } from "@/components/shared/checks-list";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { QueryBoundary } from "@/components/shared/query-states";
import { ReasonDialog } from "@/components/shared/reason-dialog";
import { SchemeImpactList } from "@/components/shared/scheme-impact-list";
import { DetailGrid, SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Timeline } from "@/components/shared/timeline";
import { UploadedFile } from "@/components/shared/uploaded-file";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { $api, api, call } from "@/lib/api/client";
import type { InvoiceReview } from "@/lib/api/types";
import { formatDate, formatDateTime, formatINR, formatNumber, formatPoints } from "@/lib/utils/format";
import { runAction } from "@/lib/utils/run-action";
import { InvoiceDocument } from "./invoice-document";

export function InvoiceDetail({ id }: { id: string }) {
  const query = $api.useQuery("get", "/api/v1/admin/invoices/{id}", { params: { path: { id } } });
  return (
    <QueryBoundary query={query} entity="Invoice" backHref="/invoices" backLabel="Back to invoices">
      {(review) => <InvoiceReviewPage review={review} />}
    </QueryBoundary>
  );
}

function InvoiceReviewPage({ review }: { review: InvoiceReview }) {
  const { invoice, incentive, totals, checks, schemeImpacts: impacts, timeline } = review;
  const { data: retailer } = $api.useQuery("get", "/api/v1/admin/retailers/{id}", { params: { path: { id: invoice.retailerId } } });
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  const blocked = checks.some((c) => c.blocking && !c.passed);
  const bonus = impacts.filter((i) => i.willAward).reduce((s, i) => s + i.incentivePoints, 0);
  const params = { params: { path: { id: invoice.id } } };
  const approve = () => call(api.POST("/api/v1/admin/invoices/{id}/approve", params));
  const startReview = () => call(api.POST("/api/v1/admin/invoices/{id}/start-review", params));
  const reject = (reason: string) => call(api.POST("/api/v1/admin/invoices/{id}/reject", { ...params, body: { reason } }));
  const requestInfo = (message: string) => call(api.POST("/api/v1/admin/invoices/{id}/request-info", { ...params, body: { message } }));
  const open = invoice.status !== "Approved" && invoice.status !== "Rejected";

  return (
    <div>
      <Link href="/invoices" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Invoice Management
      </Link>
      <PageHeader
        title={`Invoice ${invoice.invoiceNumber}`}
        description={`${invoice.id} · ${invoice.retailerName} · submitted ${formatDateTime(invoice.submittedAt)}`}
        eyebrow={<StatusBadge status={invoice.status} />}
        actions={
          open ? (
            <>
              {invoice.status === "Submitted" || invoice.status === "More Information Required" ? (
                <Button variant="outline" onClick={() => void runAction(() => startReview(), "Invoice moved to review")}>
                  <ClipboardCheck /> Start review
                </Button>
              ) : null}
              <Button onClick={() => setApproveOpen(true)} disabled={blocked}>
                <CheckCircle2 /> Approve
              </Button>
              <Button variant="outline" onClick={() => setInfoOpen(true)}>
                <MessageSquareWarning /> Request info
              </Button>
              <Button variant="destructive" onClick={() => setRejectOpen(true)}>
                <XCircle /> Reject
              </Button>
            </>
          ) : null
        }
      />

      {invoice.status === "Approved" ? (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm text-success">
          Approved by {invoice.reviewer} on {formatDateTime(invoice.reviewedAt)}. {formatPoints(invoice.incentivePoints ?? 0)} credited
          {invoice.ledgerTxnId ? (
            <>
              {" "}
              in{" "}
              <Link href={`/ledger?search=${invoice.ledgerTxnId}`} className="font-mono underline">
                {invoice.ledgerTxnId}
              </Link>
            </>
          ) : null}
          . Incentives are credited only once per invoice.
        </div>
      ) : null}
      {invoice.status === "Rejected" ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50/70 p-4 text-sm text-destructive">Rejected: {invoice.rejectionReason}</div>
      ) : null}
      {invoice.status === "More Information Required" ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-sm text-warning">Waiting on retailer: {invoice.infoRequest}</div>
      ) : null}
      {open && blocked ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50/70 p-4 text-sm text-destructive">
          Approval is blocked by failed checks:{" "}
          {checks
            .filter((c) => c.blocking && !c.passed)
            .map((c) => `${c.label} (${c.detail})`)
            .join("; ")}
          .
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <SectionCard title="Line items & eligible incentive" description="Review each line before approval" bodyClassName="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/60">
                    <TableHead className="text-xs uppercase">Product</TableHead>
                    <TableHead className="text-right text-xs uppercase">Qty</TableHead>
                    <TableHead className="text-right text-xs uppercase">Unit price</TableHead>
                    <TableHead className="text-right text-xs uppercase">Value</TableHead>
                    <TableHead className="text-xs uppercase">Eligibility</TableHead>
                    <TableHead className="text-right text-xs uppercase">Points</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incentive.lines.map((line) => (
                    <TableRow key={line.lineId}>
                      <TableCell>
                        <p className="font-medium">{line.productName}</p>
                        <p className="text-xs text-muted-foreground">{invoice.lines.find((l) => l.id === line.lineId)?.category}</p>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{line.quantity}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatINR(line.unitPrice)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatINR(line.value)}</TableCell>
                      <TableCell>{line.eligible ? <StatusBadge status="Eligible" tone="success" /> : <StatusBadge status={line.reason ?? "Ineligible"} tone="neutral" />}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{formatNumber(line.points)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={3}>Taxable value · GST {formatINR(totals.gst)} · Invoice total {formatINR(totals.total)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatINR(totals.subtotal)}</TableCell>
                    <TableCell>Eligible {formatINR(incentive.eligibleValue)}</TableCell>
                    <TableCell className="text-right font-semibold text-primary tabular-nums">{formatNumber(incentive.points)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </SectionCard>
          {invoice.documentKey ? (
            <SectionCard title="Invoice document" description="Uploaded by the retailer – compare it with the line items above">
              <UploadedFile fileKey={invoice.documentKey} alt={`Invoice ${invoice.invoiceNumber}`} />
            </SectionCard>
          ) : (
            <SectionCard title="Invoice document" description="No document uploaded – preview generated from the submitted line items">
              <InvoiceDocument review={review} retailer={retailer} />
            </SectionCard>
          )}
        </div>
        <div className="space-y-6">
          <SectionCard title="Incentive calculation">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Eligible value (pre-GST)</dt>
                <dd className="tabular-nums">{formatINR(incentive.eligibleValue)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Rate</dt>
                <dd>{incentive.rate} pt per ₹100</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-2 text-base">
                <dt className="font-medium">{invoice.status === "Approved" ? "Points credited" : "Points on approval"}</dt>
                <dd className="font-semibold text-primary tabular-nums">{formatPoints(invoice.incentivePoints ?? incentive.points)}</dd>
              </div>
              {open && bonus > 0 ? (
                <div className="flex justify-between text-[#8a6a2f]">
                  <dt>+ Scheme bonus unlocked</dt>
                  <dd className="font-semibold tabular-nums">{formatPoints(bonus)}</dd>
                </div>
              ) : null}
            </dl>
          </SectionCard>
          <SectionCard
            title="Retailer"
            actions={
              <Link href={`/retailers/${invoice.retailerId}`} className="text-xs text-primary hover:underline">
                View retailer
              </Link>
            }
          >
            <DetailGrid
              columns={1}
              items={[
                { label: "Shop", value: invoice.retailerName },
                { label: "GSTIN", value: <span className="font-mono">{retailer?.gstin ?? "Unregistered"}</span> },
                { label: "Buyer on invoice", value: invoice.buyerName },
                { label: "Invoice date", value: formatDate(invoice.invoiceDate) },
                { label: "Reviewer", value: invoice.reviewer ?? "Unassigned" },
              ]}
            />
          </SectionCard>
          <SectionCard title="Validation checks">
            <ChecksList checks={checks} />
          </SectionCard>
          <SectionCard title="Scheme progress">
            <SchemeImpactList impacts={impacts} />
          </SectionCard>
          <SectionCard title="Review history">
            <Timeline events={timeline} />
          </SectionCard>
        </div>
      </div>

      <ConfirmDialog
        open={approveOpen}
        onOpenChange={setApproveOpen}
        title="Approve invoice and credit incentive?"
        description={
          <>
            {invoice.retailerName} will be credited <strong>{formatPoints(incentive.points)}</strong>
            {bonus > 0 ? <> plus a <strong>{formatPoints(bonus)}</strong> scheme bonus</> : null}. Sales performance and dashboard metrics update immediately.
          </>
        }
        confirmLabel="Approve & credit"
        onConfirm={() =>
          runAction(
            approve,
            (r) =>
              `Invoice approved – ${formatPoints(r.points)} credited to ${invoice.retailerName}` +
              (r.schemeAwards.length ? ` + ${r.schemeAwards.map((s) => `${formatPoints(s.incentivePoints)} bonus (${s.name})`).join(", ")}` : ""),
          )
        }
      />
      <ReasonDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title="Reject invoice"
        description="No incentive will be credited for this invoice."
        label="Rejection reason"
        placeholder="e.g. Invoice number duplicates an earlier approved invoice"
        confirmLabel="Reject invoice"
        destructive
        onSubmit={async (reason) => (await runAction(() => reject(reason), "Invoice rejected")).ok}
      />
      <ReasonDialog
        open={infoOpen}
        onOpenChange={setInfoOpen}
        title="Request more information"
        description="The retailer sees this message in the app and can resubmit the invoice."
        label="Message to retailer"
        confirmLabel="Send request"
        onSubmit={async (message) => (await runAction(() => requestInfo(message), "Information requested from retailer")).ok}
      />
    </div>
  );
}
