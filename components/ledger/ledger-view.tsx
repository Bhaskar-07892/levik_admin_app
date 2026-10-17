"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { matches, TableToolbar } from "@/components/data-table/table-toolbar";
import { SimpleSelect, toOptions } from "@/components/forms/simple-select";
import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { DetailGrid } from "@/components/shared/section-card";
import { RoleBadge, StatusBadge } from "@/components/shared/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { listPointsTransactions, type LedgerRow } from "@/lib/mock-api/queries";
import { findUser } from "@/lib/mock-api/rules";
import { useDb } from "@/lib/mock-api/store";
import { formatDateTime, formatNumber } from "@/lib/utils/format";
import { POINTS_SOURCES } from "@/types";
import { ArrowDownLeft, ArrowUpRight, Scale } from "lucide-react";
import { LedgerTable, relatedHref } from "./ledger-table";

export function LedgerView() {
  const db = useDb();
  const rows = useMemo(() => listPointsTransactions(db), [db]);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [source, setSource] = useState("all");
  const [direction, setDirection] = useState("all");
  const [selected, setSelected] = useState<LedgerRow | null>(null);

  const filtered = rows.filter(
    (t) =>
      matches(search, t.id, t.userName, t.userId, t.note, t.related?.id) &&
      (role === "all" || t.userRole === role) &&
      (source === "all" || t.source === source) &&
      (direction === "all" || (direction === "credit" ? t.credit > 0 : t.debit > 0)),
  );
  const credited = filtered.reduce((s, t) => s + t.credit, 0);
  const debited = filtered.reduce((s, t) => s + t.debit, 0);
  const user = selected ? findUser(db, selected.userId) : undefined;
  const related = selected ? relatedHref(selected.related) : undefined;

  return (
    <div>
      <PageHeader
        title="Points Ledger"
        description="Append-only record of every points credit and debit. All plumber and retailer balances are derived from these entries."
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <KpiCard label="Credited (filtered)" value={formatNumber(credited)} icon={ArrowDownLeft} accent="success" />
        <KpiCard label="Debited (filtered)" value={formatNumber(debited)} icon={ArrowUpRight} accent="warning" />
        <KpiCard label="Net outstanding" value={formatNumber(credited - debited)} hint={`${filtered.length} transactions`} icon={Scale} accent="gold" />
      </div>
      <div className="rounded-xl border border-border bg-card">
        <TableToolbar search={search} onSearchChange={setSearch} placeholder="Search transaction, user, reference">
          <SimpleSelect
            value={role}
            onValueChange={setRole}
            ariaLabel="Filter by role"
            options={[
              { value: "all", label: "All roles" },
              { value: "plumber", label: "Plumbers" },
              { value: "retailer", label: "Retailers" },
            ]}
          />
          <SimpleSelect value={source} onValueChange={setSource} options={toOptions(POINTS_SOURCES, "All sources")} ariaLabel="Filter by source" />
          <SimpleSelect
            value={direction}
            onValueChange={setDirection}
            ariaLabel="Filter by transaction type"
            options={[
              { value: "all", label: "Credits & debits" },
              { value: "credit", label: "Credits only" },
              { value: "debit", label: "Debits only" },
            ]}
          />
        </TableToolbar>
        <LedgerTable rows={filtered} onOpen={setSelected} pageSize={12} />
      </div>

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Transaction {selected?.id}</DialogTitle>
            <DialogDescription>{selected?.note}</DialogDescription>
          </DialogHeader>
          {selected ? (
            <>
              <DetailGrid
                items={[
                  {
                    label: "User",
                    value: (
                      <span className="flex items-center gap-2">
                        {user ? (
                          <Link href={user.href} className="text-primary hover:underline">
                            {selected.userName}
                          </Link>
                        ) : (
                          selected.userName
                        )}
                        <RoleBadge role={selected.userRole} />
                      </span>
                    ),
                  },
                  { label: "Source", value: selected.source },
                  { label: "Credit", value: selected.credit ? `+${formatNumber(selected.credit)} pts` : "—" },
                  { label: "Debit", value: selected.debit ? `−${formatNumber(selected.debit)} pts` : "—" },
                  { label: "Date", value: formatDateTime(selected.createdAt) },
                  { label: "Posted by", value: selected.createdBy },
                  { label: "Status", value: <StatusBadge status={selected.status} /> },
                  { label: "Related record", value: selected.related ? <span className="font-mono">{selected.related.id}</span> : "None (manual entry)" },
                ]}
              />
              <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
                {user ? (
                  <Link href={user.href} className={buttonVariants({ variant: "outline" })}>
                    Open {selected.userRole} profile
                  </Link>
                ) : null}
                {related ? (
                  <Link href={related} className={buttonVariants()}>
                    Open related {selected.related?.type}
                  </Link>
                ) : null}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
