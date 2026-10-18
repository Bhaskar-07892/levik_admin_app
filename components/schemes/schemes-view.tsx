"use client";

import { CalendarRange, Plus, Target, Trophy } from "lucide-react";
import Link from "next/link";
import { keepPreviousData } from "@tanstack/react-query";
import { PaginationBar } from "@/components/data-table/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { ProgressBar } from "@/components/shared/progress-bar";
import { RoleBadge, StatusBadge } from "@/components/shared/status-badge";
import { StatusTabs } from "@/components/shared/status-tabs";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { $api } from "@/lib/api/client";
import { useStatusCounts } from "@/lib/api/hooks";
import type { QueryOf } from "@/lib/api/types";
import { usePagedList } from "@/lib/hooks/use-paged-list";
import { formatDate, formatINR, formatPoints } from "@/lib/utils/format";
import { SCHEME_STATUSES, type SchemeStatus } from "@/types";

type Tab = "all" | SchemeStatus;

export function SchemesView() {
  const list = usePagedList<{ status: Tab }>({ status: "all" }, { pageSize: 12 });
  const { data, isFetching } = $api.useQuery(
    "get",
    "/api/v1/admin/schemes",
    { params: { query: list.query as QueryOf<"/api/v1/admin/schemes"> } },
    { placeholderData: keepPreviousData },
  );
  const { counts, total } = useStatusCounts("/api/v1/admin/schemes/status-counts");
  const filtered = (data?.items ?? []).map((scheme) => ({ scheme, participants: scheme.summary.participants, avg: scheme.summary.averagePercent }));

  return (
    <div>
      <PageHeader
        title="Schemes"
        description="Target-based sales schemes for retailers and installation campaigns for plumbers."
        actions={
          <Link href="/schemes/new" className={buttonVariants()}>
            <Plus /> Create scheme
          </Link>
        }
      />
      <div className="rounded-xl border border-border bg-card">
        <StatusTabs
          label="Scheme status"
          value={list.filters.status}
          onChange={(value) => list.setFilter("status", value)}
          tabs={(["all", ...SCHEME_STATUSES] as Tab[]).map((value) => ({
            value,
            label: value === "all" ? "All" : value,
            count: value === "all" ? total : (counts[value] ?? 0),
          }))}
        />
        <div className="border-b border-border p-4">
          <Input value={list.search} onChange={(e) => list.setSearch(e.target.value)} placeholder="Search schemes" aria-label="Search schemes" className="h-9 max-w-xs" />
        </div>
        {filtered.length === 0 && !isFetching ? (
          <EmptyState title="No schemes in this view" description="Create a scheme or choose another status." />
        ) : (
          <div className="grid gap-4 p-4 md:grid-cols-2 2xl:grid-cols-3">
            {filtered.map(({ scheme, participants, avg }) => (
              <Link
                key={scheme.id}
                href={`/schemes/${scheme.id}`}
                className="flex flex-col rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-[11px] text-muted-foreground">{scheme.id}</p>
                    <p className="mt-0.5 font-semibold">{scheme.name}</p>
                  </div>
                  <StatusBadge status={scheme.status} />
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{scheme.description}</p>
                <div className="mt-4 grid gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <CalendarRange className="size-3.5" /> {formatDate(scheme.startDate)} – {formatDate(scheme.endDate)}
                  </span>
                  <span className="flex items-center gap-2">
                    <Target className="size-3.5" />
                    {scheme.targetType === "Sales Amount" ? `${formatINR(scheme.targetValue)} eligible sales` : `${scheme.targetValue} approved scans`}
                  </span>
                  <span className="flex items-center gap-2">
                    <Trophy className="size-3.5 text-gold" /> {formatPoints(scheme.incentivePoints)} on achievement · {scheme.summary.achievers} achieved
                  </span>
                </div>
                <div className="mt-auto pt-4">
                  <div className="flex items-center justify-between text-xs">
                    <RoleBadge role={scheme.role} />
                    <span className="text-muted-foreground">
                      {participants} participants · avg {avg}%
                    </span>
                  </div>
                  <ProgressBar value={avg} className="mt-2" />
                </div>
              </Link>
            ))}
          </div>
        )}
        <PaginationBar page={list.page} pageSize={list.pageSize} total={data?.total ?? 0} onPageChange={list.setPage} loading={isFetching && !data} />
      </div>
    </div>
  );
}
