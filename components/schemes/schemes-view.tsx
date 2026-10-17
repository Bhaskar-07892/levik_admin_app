"use client";

import { CalendarRange, Plus, Target, Trophy } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { matches } from "@/components/data-table/table-toolbar";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { ProgressBar } from "@/components/shared/progress-bar";
import { RoleBadge, StatusBadge } from "@/components/shared/status-badge";
import { StatusTabs } from "@/components/shared/status-tabs";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listSchemes } from "@/lib/mock-api/queries";
import { schemeParticipants } from "@/lib/mock-api/rules";
import { useDb } from "@/lib/mock-api/store";
import { formatDate, formatINR, formatPoints } from "@/lib/utils/format";
import { SCHEME_STATUSES, type SchemeStatus } from "@/types";

type Tab = "All" | SchemeStatus;

export function SchemesView() {
  const db = useDb();
  const schemes = listSchemes(db);
  const [tab, setTab] = useState<Tab>("All");
  const [search, setSearch] = useState("");
  const cards = useMemo(
    () =>
      schemes.map((scheme) => {
        const participants = schemeParticipants(db, scheme);
        const avg = participants.length ? Math.round(participants.reduce((s, p) => s + p.percent, 0) / participants.length) : 0;
        return { scheme, participants: participants.length, avg };
      }),
    [db, schemes],
  );
  const filtered = cards.filter(({ scheme }) => (tab === "All" || scheme.status === tab) && matches(search, scheme.id, scheme.name, scheme.description));

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
          value={tab}
          onChange={setTab}
          tabs={(["All", ...SCHEME_STATUSES] as Tab[]).map((value) => ({
            value,
            label: value,
            count: value === "All" ? schemes.length : schemes.filter((s) => s.status === value).length,
          }))}
        />
        <div className="border-b border-border p-4">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search schemes" aria-label="Search schemes" className="h-9 max-w-xs" />
        </div>
        {filtered.length === 0 ? (
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
                    <Trophy className="size-3.5 text-gold" /> {formatPoints(scheme.incentivePoints)} on achievement · {scheme.awardedUserIds.length} achieved
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
      </div>
    </div>
  );
}
