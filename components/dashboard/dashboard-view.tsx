"use client";

import {
  BadgeCheck,
  Coins,
  FileClock,
  Gift,
  Megaphone,
  PackagePlus,
  ScanLine,
  Store,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CHART_COLORS, TrendChart } from "@/components/charts/trend-chart";
import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { PeriodFilter } from "@/components/shared/period-filter";
import { ProgressBar } from "@/components/shared/progress-bar";
import { SectionCard } from "@/components/shared/section-card";
import { RoleBadge, StatusBadge } from "@/components/shared/status-badge";
import { buttonVariants } from "@/components/ui/button";
import {
  getDashboardMetrics,
  listInvoices,
  listRedemptions,
  listScans,
  PERIOD_LABELS,
  type Period,
} from "@/lib/mock-api/queries";
import { isSchemeLive, schemeParticipants } from "@/lib/mock-api/rules";
import { useDb } from "@/lib/mock-api/store";
import { cn } from "@/lib/utils";
import { formatCompactINR, formatDate, formatINR, formatNumber, formatPoints } from "@/lib/utils/format";

export function DashboardView() {
  const db = useDb();
  const [period, setPeriod] = useState<Period>("30d");
  const metrics = useMemo(() => getDashboardMetrics(db, period), [db, period]);
  const { kpis } = metrics;

  const recentScans = useMemo(() => listScans(db).slice(0, 5), [db]);
  const pendingInvoices = useMemo(
    () => listInvoices(db).filter((i) => i.status === "Submitted" || i.status === "Under Review").slice(0, 5),
    [db],
  );
  const recentRedemptions = useMemo(() => listRedemptions(db).slice(0, 5), [db]);
  const liveSchemes = useMemo(
    () =>
      db.schemes
        .filter((s) => isSchemeLive(s) || s.status === "Scheduled")
        .map((scheme) => {
          const participants = schemeParticipants(db, scheme);
          const avg = participants.length ? Math.round(participants.reduce((s, p) => s + p.percent, 0) / participants.length) : 0;
          const leader = participants[0];
          return { scheme, participants, avg, leader, achievers: scheme.awardedUserIds.length };
        }),
    [db],
  );

  return (
    <div>
      <PageHeader
        title="Programme overview"
        description={`Live view of the ${db.settings.programmeName}. Figures are calculated from the current demo records.`}
        actions={<PeriodFilter value={period} onChange={setPeriod} />}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total plumbers" value={formatNumber(kpis.totalPlumbers)} hint={`${kpis.verifiedPlumbers} KYC verified`} icon={Users} href="/plumbers" />
        <KpiCard
          label="Verified plumbers"
          value={formatNumber(kpis.verifiedPlumbers)}
          hint={`${Math.round((kpis.verifiedPlumbers / Math.max(1, kpis.totalPlumbers)) * 100)}% of network`}
          icon={BadgeCheck}
          accent="success"
          href="/plumbers"
        />
        <KpiCard label="Active retailers" value={formatNumber(kpis.activeRetailers)} hint="Approved and active shops" icon={Store} href="/retailers" />
        <KpiCard label="Product scans" value={formatNumber(kpis.productScans)} hint={`${kpis.pendingScans} pending verification`} icon={ScanLine} href="/scans" />
        <KpiCard label="Pending invoices" value={formatNumber(kpis.pendingInvoices)} hint="Submitted or under review" icon={FileClock} accent="warning" href="/invoices" />
        <KpiCard label="Active schemes" value={formatNumber(kpis.activeSchemes)} hint="Live today" icon={Megaphone} href="/schemes" />
        <KpiCard label="Points issued" value={formatNumber(kpis.pointsIssued)} hint={`${formatNumber(kpis.pointsRedeemed)} redeemed · ${PERIOD_LABELS[period].toLowerCase()}`} icon={Coins} accent="gold" href="/ledger" />
        <KpiCard label="Pending redemptions" value={formatNumber(kpis.pendingRedemptions)} hint="Awaiting approval" icon={Gift} accent="gold" href="/redemptions" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <SectionCard
          className="xl:col-span-2"
          title="Verified sales trend"
          description={`Approved invoice value (pre-GST) · ${PERIOD_LABELS[period]} · total ${formatINR(kpis.verifiedSales)}`}
        >
          <TrendChart
            data={metrics.salesTrend}
            xKey="label"
            series={[{ key: "sales", label: "Verified sales", color: CHART_COLORS.primary }]}
            valueFormatter={formatCompactINR}
            ariaLabel="Verified sales trend chart"
          />
        </SectionCard>
        <SectionCard title="Quick actions" description="Jump into the most common workflows">
          <div className="grid gap-2">
            {[
              { href: "/scans", label: "Verify product scans", detail: `${kpis.pendingScans} pending`, icon: ScanLine },
              { href: "/invoices", label: "Review invoices", detail: `${kpis.pendingInvoices} in queue`, icon: FileClock },
              { href: "/redemptions", label: "Process redemptions", detail: `${kpis.pendingRedemptions} requested`, icon: Gift },
              { href: "/products?new=1", label: "Add a product", detail: "Extend the catalogue", icon: PackagePlus },
              { href: "/schemes/new", label: "Create a scheme", detail: "Retailer or plumber", icon: Megaphone },
            ].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 transition-colors hover:border-brand-slate/50 hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
              >
                <span className="flex size-8 items-center justify-center rounded-md bg-secondary text-primary">
                  <action.icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{action.label}</span>
                  <span className="block text-xs text-muted-foreground">{action.detail}</span>
                </span>
              </Link>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <SectionCard title="Product scan trend" description={`Scans by verification status · ${PERIOD_LABELS[period]}`}>
          <TrendChart
            data={metrics.scanTrend}
            xKey="label"
            series={[
              { key: "Approved", label: "Approved", color: CHART_COLORS.primary, stackId: "s" },
              { key: "Pending", label: "Pending", color: CHART_COLORS.gold, stackId: "s" },
              { key: "Flagged", label: "Flagged", color: CHART_COLORS.warning, stackId: "s" },
              { key: "Rejected", label: "Rejected", color: CHART_COLORS.danger, stackId: "s" },
            ]}
            ariaLabel="Product scan trend chart"
          />
        </SectionCard>
        <SectionCard title="Points earned vs redeemed" description={`Ledger activity · ${PERIOD_LABELS[period]}`}>
          <TrendChart
            data={metrics.pointsTrend}
            xKey="label"
            series={[
              { key: "earned", label: "Earned", color: CHART_COLORS.primary },
              { key: "redeemed", label: "Redeemed (net)", color: CHART_COLORS.gold },
            ]}
            ariaLabel="Points earned versus redeemed chart"
          />
        </SectionCard>
      </div>

      <SectionCard
        className="mt-6"
        title="Scheme performance"
        description="Live and upcoming schemes with participant progress"
        actions={
          <Link href="/schemes" className={buttonVariants({ variant: "outline", size: "sm" })}>
            All schemes
          </Link>
        }
        bodyClassName="p-0"
      >
        <div className="divide-y divide-border">
          {liveSchemes.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">No live or scheduled schemes.</p>
          ) : (
            liveSchemes.map(({ scheme, participants, avg, leader, achievers }) => (
              <Link key={scheme.id} href={`/schemes/${scheme.id}`} className="grid gap-3 px-5 py-4 hover:bg-muted/40 md:grid-cols-[1.4fr_1fr_1fr] md:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{scheme.name}</span>
                    <StatusBadge status={scheme.status} />
                    <RoleBadge role={scheme.role} />
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatDate(scheme.startDate)} – {formatDate(scheme.endDate)} · Target{" "}
                    {scheme.targetType === "Sales Amount" ? formatINR(scheme.targetValue) : `${scheme.targetValue} approved scans`} ·{" "}
                    {formatPoints(scheme.incentivePoints)}
                  </p>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Avg. progress</span>
                    <span className="tabular-nums">{avg}%</span>
                  </div>
                  <ProgressBar value={avg} className="mt-1.5" />
                </div>
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{participants.length}</span> participants ·{" "}
                  <span className="font-medium text-foreground">{achievers}</span> achieved
                  {leader ? (
                    <span className="block truncate">
                      Leader: {leader.name} ({leader.percent}%)
                    </span>
                  ) : null}
                </div>
              </Link>
            ))
          )}
        </div>
      </SectionCard>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <SectionCard
          title="Recent product scans"
          actions={<Link href="/scans" className={buttonVariants({ variant: "ghost", size: "sm" })}>View all</Link>}
          bodyClassName="p-0"
        >
          <ul className="divide-y divide-border">
            {recentScans.map((scan) => (
              <li key={scan.id}>
                <Link href={`/scans/${scan.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-muted/40">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{scan.plumber?.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {scan.product?.modelCode} · {formatDate(scan.scannedAt)}
                    </span>
                  </span>
                  <StatusBadge status={scan.status} />
                </Link>
              </li>
            ))}
          </ul>
        </SectionCard>
        <SectionCard
          title="Pending invoice queue"
          actions={<Link href="/invoices" className={buttonVariants({ variant: "ghost", size: "sm" })}>View all</Link>}
          bodyClassName="p-0"
        >
          {pendingInvoices.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">No invoices waiting for review.</p>
          ) : (
            <ul className="divide-y divide-border">
              {pendingInvoices.map((invoice) => (
                <li key={invoice.id}>
                  <Link href={`/invoices/${invoice.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-muted/40">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{invoice.retailer?.shopName}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {invoice.invoiceNumber} · {formatINR(invoice.amount)}
                      </span>
                    </span>
                    <StatusBadge status={invoice.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
        <SectionCard
          title="Recent reward redemptions"
          actions={<Link href="/redemptions" className={buttonVariants({ variant: "ghost", size: "sm" })}>View all</Link>}
          bodyClassName="p-0"
        >
          <ul className="divide-y divide-border">
            {recentRedemptions.map((r) => (
              <li key={r.id}>
                <Link href={`/redemptions/${r.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-muted/40">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{r.reward?.name}</span>
                    <span className={cn("block truncate text-xs text-muted-foreground")}>
                      {r.userName} · {formatPoints(r.pointsCost)}
                    </span>
                  </span>
                  <StatusBadge status={r.status} />
                </Link>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}
