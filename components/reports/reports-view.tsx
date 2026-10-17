"use client";

import { Download } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { CHART_COLORS, TrendChart } from "@/components/charts/trend-chart";
import { PageHeader } from "@/components/shared/page-header";
import { PeriodFilter } from "@/components/shared/period-filter";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  getDashboardMetrics,
  PERIOD_LABELS,
  scansByStatus,
  topRetailers,
  topScannedProducts,
  type Period,
} from "@/lib/mock-api/queries";
import { schemeParticipants } from "@/lib/mock-api/rules";
import { useDb } from "@/lib/mock-api/store";
import { downloadCsv, formatCompactINR, formatINR, formatNumber } from "@/lib/utils/format";

function ExportButton({ name, rows, period }: { name: string; rows: Array<Record<string, string | number>>; period: Period }) {
  return (
    <Button variant="outline" size="sm" disabled={rows.length === 0} onClick={() => downloadCsv(`levik-${name}-${period}.csv`, rows)}>
      <Download /> CSV
    </Button>
  );
}

function SimpleTable({ headers, rows, empty }: { headers: Array<{ label: string; right?: boolean }>; rows: ReactNode[][]; empty: string }) {
  if (rows.length === 0) return <p className="px-5 py-8 text-center text-sm text-muted-foreground">{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/60">
            {headers.map((h) => (
              <TableHead key={h.label} className={`text-xs uppercase ${h.right ? "text-right" : ""}`}>
                {h.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((cells, i) => (
            <TableRow key={i}>
              {cells.map((cell, j) => (
                <TableCell key={j} className={headers[j]?.right ? "text-right tabular-nums" : ""}>
                  {cell}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function ReportsView() {
  const db = useDb();
  const [period, setPeriod] = useState<Period>("90d");
  const metrics = useMemo(() => getDashboardMetrics(db, period), [db, period]);
  const statusCounts = useMemo(() => scansByStatus(db, metrics.start), [db, metrics.start]);
  const retailers = useMemo(() => topRetailers(db, metrics.start), [db, metrics.start]);
  const products = useMemo(() => topScannedProducts(db, metrics.start), [db, metrics.start]);
  const schemes = useMemo(
    () =>
      db.schemes.map((scheme) => {
        const participants = schemeParticipants(db, scheme);
        const avg = participants.length ? Math.round(participants.reduce((s, p) => s + p.percent, 0) / participants.length) : 0;
        return { scheme, participants: participants.length, avg, achieved: scheme.awardedUserIds.length, bonus: scheme.awardedUserIds.length * scheme.incentivePoints };
      }),
    [db],
  );
  const label = PERIOD_LABELS[period];

  const salesRows = metrics.salesTrend.map((r) => ({ period: r.label, approved_invoices: r.invoices, verified_sales_inr: r.sales }));
  const pointsRows = metrics.pointsTrend.map((r) => ({ period: r.label, points_earned: r.earned, points_redeemed_net: r.redeemed }));

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Compact programme reports. Every table exports the currently filtered period as CSV."
        actions={<PeriodFilter value={period} onChange={setPeriod} />}
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          title="Verified sales by period"
          description={`${label} · ${formatINR(metrics.kpis.verifiedSales)} from approved invoices (pre-GST)`}
          actions={<ExportButton name="verified-sales" rows={salesRows} period={period} />}
        >
          <TrendChart data={metrics.salesTrend} xKey="label" series={[{ key: "sales", label: "Verified sales", color: CHART_COLORS.primary }]} valueFormatter={formatCompactINR} ariaLabel="Verified sales by period" />
        </SectionCard>
        <SectionCard
          title="Points issued and redeemed"
          description={`${label} · ${formatNumber(metrics.kpis.pointsIssued)} issued · ${formatNumber(metrics.kpis.pointsRedeemed)} redeemed (net)`}
          actions={<ExportButton name="points" rows={pointsRows} period={period} />}
        >
          <TrendChart
            data={metrics.pointsTrend}
            xKey="label"
            series={[
              { key: "earned", label: "Issued", color: CHART_COLORS.primary },
              { key: "redeemed", label: "Redeemed (net)", color: CHART_COLORS.gold },
            ]}
            ariaLabel="Points issued and redeemed"
          />
        </SectionCard>
        <SectionCard
          title="Scans by status"
          description={label}
          actions={<ExportButton name="scans-by-status" rows={statusCounts.map((s) => ({ status: s.status, scans: s.count }))} period={period} />}
          bodyClassName="p-0"
        >
          <SimpleTable
            headers={[{ label: "Status" }, { label: "Scans", right: true }, { label: "Share", right: true }]}
            empty="No scans in this period."
            rows={statusCounts.map((s) => {
              const total = statusCounts.reduce((sum, x) => sum + x.count, 0) || 1;
              return [<StatusBadge key="s" status={s.status} />, formatNumber(s.count), `${Math.round((s.count / total) * 100)}%`];
            })}
          />
        </SectionCard>
        <SectionCard
          title="Top-performing retailers"
          description={`${label} · approved invoice value`}
          actions={
            <ExportButton
              name="top-retailers"
              rows={retailers.map((r) => ({ retailer_id: r.id, retailer: r.name, city: r.city, approved_invoices: r.invoices, verified_sales_inr: r.sales, incentive_points: r.points }))}
              period={period}
            />
          }
          bodyClassName="p-0"
        >
          <SimpleTable
            headers={[{ label: "Retailer" }, { label: "Invoices", right: true }, { label: "Sales", right: true }, { label: "Incentive pts", right: true }]}
            empty="No approved invoices in this period."
            rows={retailers.map((r) => [
              <div key="r">
                <p className="font-medium">{r.name}</p>
                <p className="text-xs text-muted-foreground">{r.city}</p>
              </div>,
              r.invoices,
              formatINR(r.sales),
              formatNumber(r.points),
            ])}
          />
        </SectionCard>
        <SectionCard
          title="Top-scanned products"
          description={label}
          actions={
            <ExportButton
              name="top-products"
              rows={products.map((p) => ({ product_id: p.id, model: p.modelCode, product: p.name, category: p.category, scans: p.scans, approved: p.approved, points_awarded: p.points }))}
              period={period}
            />
          }
          bodyClassName="p-0"
        >
          <SimpleTable
            headers={[{ label: "Product" }, { label: "Scans", right: true }, { label: "Approved", right: true }, { label: "Points", right: true }]}
            empty="No scans in this period."
            rows={products.map((p) => [
              <div key="p">
                <p className="font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.category}</p>
              </div>,
              p.scans,
              p.approved,
              formatNumber(p.points),
            ])}
          />
        </SectionCard>
        <SectionCard
          title="Scheme performance"
          description="All schemes · current progress"
          actions={
            <ExportButton
              name="scheme-performance"
              rows={schemes.map((s) => ({
                scheme_id: s.scheme.id,
                scheme: s.scheme.name,
                role: s.scheme.role,
                status: s.scheme.status,
                participants: s.participants,
                achieved: s.achieved,
                avg_progress_pct: s.avg,
                bonus_points_issued: s.bonus,
              }))}
              period={period}
            />
          }
          bodyClassName="p-0"
        >
          <SimpleTable
            headers={[{ label: "Scheme" }, { label: "Status" }, { label: "Participants", right: true }, { label: "Achieved", right: true }, { label: "Avg %", right: true }]}
            empty="No schemes configured."
            rows={schemes.map((s) => [
              <div key="s">
                <p className="font-medium">{s.scheme.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{s.scheme.role}</p>
              </div>,
              <StatusBadge key="b" status={s.scheme.status} />,
              s.participants,
              s.achieved,
              `${s.avg}%`,
            ])}
          />
        </SectionCard>
      </div>
    </div>
  );
}
