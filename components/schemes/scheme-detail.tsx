"use client";

import { ArrowLeft, CircleStop, Pause, Pencil, Play } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { DataTable, type Column } from "@/components/data-table/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { ProgressBar } from "@/components/shared/progress-bar";
import { QueryBoundary } from "@/components/shared/query-states";
import { ReasonDialog } from "@/components/shared/reason-dialog";
import { DetailGrid, SectionCard } from "@/components/shared/section-card";
import { RoleBadge, StatusBadge } from "@/components/shared/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { $api, api, call } from "@/lib/api/client";
import type { SchemeParticipantDto as SchemeParticipant, SchemeWithSummary } from "@/lib/api/types";
import { formatDate, formatDateTime, formatINR, formatPoints } from "@/lib/utils/format";
import { runAction } from "@/lib/utils/run-action";

export function SchemeDetail({ id }: { id: string }) {
  const query = $api.useQuery("get", "/api/v1/admin/schemes/{id}", { params: { path: { id } } });
  return (
    <QueryBoundary query={query} entity="Scheme" backHref="/schemes" backLabel="Back to schemes">
      {(scheme) => <SchemePage scheme={scheme} />}
    </QueryBoundary>
  );
}

function SchemePage({ scheme }: { scheme: SchemeWithSummary }) {
  const [activateOpen, setActivateOpen] = useState(false);
  const [pauseOpen, setPauseOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const { data: participants = [], isLoading } = $api.useQuery("get", "/api/v1/admin/schemes/{id}/participants", { params: { path: { id: scheme.id } } });
  const params = { params: { path: { id: scheme.id } } };

  const isSales = scheme.targetType === "Sales Amount";
  const fmt = (v: number) => (isSales ? formatINR(v) : `${v} scans`);
  const editable = scheme.status === "Draft" || scheme.status === "Scheduled";
  const canActivate = ["Draft", "Scheduled", "Paused"].includes(scheme.status);
  const willSchedule = new Date(scheme.startDate) > new Date();
  const { averagePercent: avg, achievers, participants: participantCount, bonusPointsIssued } = scheme.summary;

  const columns: Column<SchemeParticipant>[] = [
    {
      id: "name",
      header: "Participant",
      cell: (p) => (
        <div>
          <Link href={`/${scheme.role === "plumber" ? "plumbers" : "retailers"}/${p.userId}`} onClick={(e) => e.stopPropagation()} className="font-medium hover:underline">
            {p.name}
          </Link>
          <p className="text-xs text-muted-foreground">{p.location}</p>
        </div>
      ),
      sortValue: (p) => p.name,
    },
    { id: "progress", header: "Progress", align: "right", cell: (p) => `${fmt(p.progress)} / ${fmt(scheme.targetValue)}`, sortValue: (p) => p.progress },
    {
      id: "bar",
      header: "Achievement",
      cell: (p) => (
        <div className="flex w-40 items-center gap-2">
          <ProgressBar value={p.percent} tone={p.awarded ? "gold" : undefined} />
          <span className="w-9 text-right text-xs tabular-nums">{p.percent}%</span>
        </div>
      ),
      sortValue: (p) => p.percent,
    },
    {
      id: "status",
      header: "Bonus",
      cell: (p) => (p.awarded ? <StatusBadge status="Achieved" /> : <span className="text-xs text-muted-foreground">{p.percent >= 100 ? "Credited on next approval" : "In progress"}</span>),
      sortValue: (p) => Number(p.awarded),
    },
  ];

  return (
    <div>
      <Link href="/schemes" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Schemes
      </Link>
      <PageHeader
        title={scheme.name}
        description={scheme.description}
        eyebrow={
          <div className="flex gap-2">
            <StatusBadge status={scheme.status} />
            <RoleBadge role={scheme.role} />
          </div>
        }
        actions={
          <>
            {editable ? (
              <Link href={`/schemes/${scheme.id}/edit`} className={buttonVariants({ variant: "outline" })}>
                <Pencil /> Edit
              </Link>
            ) : null}
            {canActivate ? (
              <Button onClick={() => setActivateOpen(true)}>
                <Play /> {scheme.status === "Paused" ? "Resume" : "Activate"}
              </Button>
            ) : null}
            {scheme.status === "Active" || scheme.status === "Scheduled" ? (
              <Button variant="outline" onClick={() => setPauseOpen(true)}>
                <Pause /> Pause
              </Button>
            ) : null}
            {scheme.status === "Active" || scheme.status === "Paused" ? (
              <Button variant="outline" onClick={() => setCompleteOpen(true)}>
                <CircleStop /> Mark completed
              </Button>
            ) : null}
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <SectionCard title="Configuration" className="lg:col-span-2">
          <DetailGrid
            columns={3}
            items={[
              { label: "Scheme ID", value: <span className="font-mono">{scheme.id}</span> },
              { label: "Eligible role", value: scheme.role === "plumber" ? "Plumbers" : "Retailers" },
              { label: "Period", value: `${formatDate(scheme.startDate)} – ${formatDate(scheme.endDate)}` },
              { label: "Target", value: isSales ? `${formatINR(scheme.targetValue)} eligible sales` : `${scheme.targetValue} approved scans` },
              { label: "Incentive", value: formatPoints(scheme.incentivePoints) },
              { label: "Last updated", value: formatDateTime(scheme.updatedAt) },
              { label: "Eligible categories", value: scheme.eligibleCategories.join(", ") },
            ]}
          />
        </SectionCard>
        <SectionCard title="Performance">
          <div className="space-y-4 text-sm">
            <div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Average progress</span>
                <span className="font-semibold tabular-nums">{avg}%</span>
              </div>
              <ProgressBar value={avg} className="mt-2" />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Eligible participants</span>
              <span className="font-semibold">{participantCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Achieved & credited</span>
              <span className="font-semibold">{achievers}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Bonus points issued</span>
              <span className="font-semibold">{formatPoints(bonusPointsIssued)}</span>
            </div>
          </div>
        </SectionCard>
      </div>
      <SectionCard
        className="mt-6"
        title="Eligible participants"
        description={`Verified, active ${scheme.role}s. Progress counts approved ${isSales ? "invoices (by invoice date)" : "scans (by scan date)"} within the scheme period.`}
        bodyClassName="p-0"
      >
        <DataTable
          caption="Scheme participants"
          data={participants}
          loading={isLoading}
          columns={columns}
          getRowId={(p) => p.userId}
          initialSort={{ id: "progress", desc: true }}
          emptyTitle="No eligible participants"
          emptyDescription={`There are no verified, active ${scheme.role}s yet.`}
        />
      </SectionCard>

      <ConfirmDialog
        open={activateOpen}
        onOpenChange={setActivateOpen}
        title={willSchedule ? "Schedule this scheme?" : "Activate this scheme?"}
        description={
          willSchedule
            ? `The start date is in the future, so the scheme will be marked Scheduled until ${formatDate(scheme.startDate)}.`
            : "The scheme goes live now. Bonus points are credited once per participant when an approval pushes them past the target."
        }
        confirmLabel={willSchedule ? "Schedule" : "Activate"}
        onConfirm={() => runAction(() => call(api.POST("/api/v1/admin/schemes/{id}/activate", params)), (s) => `${scheme.name} is now ${s.status}`)}
      />
      <ReasonDialog
        open={pauseOpen}
        onOpenChange={setPauseOpen}
        title="Pause scheme"
        description="Paused schemes do not award bonuses until resumed."
        confirmLabel="Pause scheme"
        onSubmit={async (reason) => (await runAction(() => call(api.POST("/api/v1/admin/schemes/{id}/pause", { ...params, body: { reason } })), "Scheme paused")).ok}
      />
      <ConfirmDialog
        open={completeOpen}
        onOpenChange={setCompleteOpen}
        title="Mark scheme as completed?"
        description="No further bonuses will be awarded. Bonuses already credited are unaffected."
        confirmLabel="Complete scheme"
        onConfirm={() => runAction(() => call(api.POST("/api/v1/admin/schemes/{id}/complete", params)), "Scheme completed")}
      />
    </div>
  );
}
