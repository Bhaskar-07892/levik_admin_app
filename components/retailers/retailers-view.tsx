"use client";

import { useMemo, useState } from "react";
import { DataTable, type Column } from "@/components/data-table/data-table";
import { matches, TableToolbar } from "@/components/data-table/table-toolbar";
import { SimpleSelect, toOptions } from "@/components/forms/simple-select";
import { PageHeader } from "@/components/shared/page-header";
import { ProgressBar } from "@/components/shared/progress-bar";
import { StatusBadge } from "@/components/shared/status-badge";
import { listRetailers, type RetailerRow } from "@/lib/mock-api/queries";
import { useDb } from "@/lib/mock-api/store";
import { formatINR } from "@/lib/utils/format";
import { RETAILER_ACCOUNT_STATUSES, RETAILER_VERIFICATION_STATUSES } from "@/types";

export function RetailersView() {
  const db = useDb();
  const rows = useMemo(() => listRetailers(db), [db]);
  const [search, setSearch] = useState("");
  const [verification, setVerification] = useState("all");
  const [account, setAccount] = useState("all");
  const [state, setState] = useState("all");
  const states = useMemo(() => [...new Set(db.retailers.map((r) => r.state))].sort(), [db]);
  const pending = rows.filter((r) => r.verificationStatus === "Pending").length;

  const filtered = rows.filter(
    (r) =>
      matches(search, r.id, r.shopName, r.ownerName, r.mobile, r.city, r.gstin) &&
      (verification === "all" || r.verificationStatus === verification) &&
      (account === "all" || r.accountStatus === account) &&
      (state === "all" || r.state === state),
  );

  const columns: Column<RetailerRow>[] = [
    { id: "id", header: "Retailer ID", cell: (r) => <span className="font-mono text-xs">{r.id}</span>, sortValue: (r) => r.id },
    {
      id: "shop",
      header: "Shop",
      cell: (r) => (
        <div>
          <p className="font-medium">{r.shopName}</p>
          <p className="text-xs text-muted-foreground">
            {r.ownerName} · {r.mobile}
          </p>
        </div>
      ),
      sortValue: (r) => r.shopName,
    },
    {
      id: "city",
      header: "City / State",
      cell: (r) => (
        <div>
          <p>{r.city}</p>
          <p className="text-xs text-muted-foreground">{r.state}</p>
        </div>
      ),
      sortValue: (r) => r.city,
    },
    { id: "gstin", header: "GSTIN", cell: (r) => <span className="font-mono text-xs">{r.gstin ?? "Not registered"}</span> },
    { id: "verification", header: "Verification", cell: (r) => <StatusBadge status={r.verificationStatus} />, sortValue: (r) => r.verificationStatus },
    { id: "sales", header: "Sales · 30 days", align: "right", cell: (r) => formatINR(r.sales30d), sortValue: (r) => r.sales30d },
    {
      id: "achievement",
      header: "Target",
      cell: (r) => (
        <div className="w-28">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">{formatINR(r.monthlyTarget)}</span>
            <span className="font-medium tabular-nums">{r.achievement}%</span>
          </div>
          <ProgressBar value={r.achievement} className="mt-1" />
        </div>
      ),
      sortValue: (r) => r.achievement,
    },
    { id: "account", header: "Account", cell: (r) => <StatusBadge status={r.accountStatus} />, sortValue: (r) => r.accountStatus },
  ];

  return (
    <div>
      <PageHeader
        title="Retailers"
        description={`Shops selling Levik products. ${pending ? `${pending} application${pending > 1 ? "s" : ""} awaiting approval. ` : ""}Sales and target achievement use approved invoices from the last 30 days.`}
      />
      <div className="rounded-xl border border-border bg-card">
        <TableToolbar search={search} onSearchChange={setSearch} placeholder="Search shop, owner, GSTIN or city">
          <SimpleSelect value={verification} onValueChange={setVerification} options={toOptions(RETAILER_VERIFICATION_STATUSES, "All verification")} ariaLabel="Filter by verification" />
          <SimpleSelect value={account} onValueChange={setAccount} options={toOptions(RETAILER_ACCOUNT_STATUSES, "All accounts")} ariaLabel="Filter by account status" />
          <SimpleSelect value={state} onValueChange={setState} options={toOptions(states, "All states")} ariaLabel="Filter by state" />
        </TableToolbar>
        <DataTable caption="Retailers" data={filtered} columns={columns} getRowId={(r) => r.id} rowHref={(r) => `/retailers/${r.id}`} initialSort={{ id: "id", desc: false }} />
      </div>
    </div>
  );
}
