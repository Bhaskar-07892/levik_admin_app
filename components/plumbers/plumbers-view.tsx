"use client";

import { useMemo, useState } from "react";
import { DataTable, type Column } from "@/components/data-table/data-table";
import { matches, TableToolbar } from "@/components/data-table/table-toolbar";
import { SimpleSelect, toOptions } from "@/components/forms/simple-select";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { listPlumbers, type PlumberRow } from "@/lib/mock-api/queries";
import { useDb } from "@/lib/mock-api/store";
import { formatDate, formatNumber } from "@/lib/utils/format";
import { ACCOUNT_STATUSES, PLUMBER_VERIFICATION_STATUSES } from "@/types";

export function PlumbersView() {
  const db = useDb();
  const rows = useMemo(() => listPlumbers(db), [db]);
  const [search, setSearch] = useState("");
  const [verification, setVerification] = useState("all");
  const [account, setAccount] = useState("all");
  const [state, setState] = useState("all");
  const states = useMemo(() => [...new Set(db.plumbers.map((p) => p.state))].sort(), [db]);

  const filtered = rows.filter(
    (p) =>
      matches(search, p.id, p.name, p.mobile, p.city) &&
      (verification === "all" || p.verificationStatus === verification) &&
      (account === "all" || p.accountStatus === account) &&
      (state === "all" || p.state === state),
  );

  const columns: Column<PlumberRow>[] = [
    { id: "id", header: "Plumber ID", cell: (p) => <span className="font-mono text-xs">{p.id}</span>, sortValue: (p) => p.id },
    {
      id: "name",
      header: "Name",
      cell: (p) => (
        <div>
          <p className="font-medium">{p.name}</p>
          <p className="text-xs text-muted-foreground">{p.mobile}</p>
        </div>
      ),
      sortValue: (p) => p.name,
    },
    { id: "city", header: "City", cell: (p) => p.city, sortValue: (p) => p.city },
    { id: "state", header: "State", cell: (p) => p.state, sortValue: (p) => p.state },
    { id: "registered", header: "Registered", cell: (p) => formatDate(p.registeredAt), sortValue: (p) => p.registeredAt },
    { id: "verification", header: "Verification", cell: (p) => <StatusBadge status={p.verificationStatus} />, sortValue: (p) => p.verificationStatus },
    { id: "account", header: "Account", cell: (p) => <StatusBadge status={p.accountStatus} />, sortValue: (p) => p.accountStatus },
    { id: "lifetime", header: "Lifetime pts", align: "right", cell: (p) => formatNumber(p.points.lifetime), sortValue: (p) => p.points.lifetime },
    {
      id: "available",
      header: "Available pts",
      align: "right",
      cell: (p) => <span className="font-semibold text-primary">{formatNumber(p.points.available)}</span>,
      sortValue: (p) => p.points.available,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Plumbers"
        description="Registered plumbers, their KYC verification and account status, and points balances derived from the ledger."
      />
      <div className="rounded-xl border border-border bg-card">
        <TableToolbar search={search} onSearchChange={setSearch} placeholder="Search name, ID, mobile or city">
          <SimpleSelect value={verification} onValueChange={setVerification} options={toOptions(PLUMBER_VERIFICATION_STATUSES, "All verification")} ariaLabel="Filter by verification" />
          <SimpleSelect value={account} onValueChange={setAccount} options={toOptions(ACCOUNT_STATUSES, "All accounts")} ariaLabel="Filter by account status" />
          <SimpleSelect value={state} onValueChange={setState} options={toOptions(states, "All states")} ariaLabel="Filter by state" />
        </TableToolbar>
        <DataTable caption="Plumbers" data={filtered} columns={columns} getRowId={(p) => p.id} rowHref={(p) => `/plumbers/${p.id}`} initialSort={{ id: "id", desc: false }} />
      </div>
    </div>
  );
}
