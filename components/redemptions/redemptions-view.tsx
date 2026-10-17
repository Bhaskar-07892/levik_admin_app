"use client";

import { useMemo, useState } from "react";
import { matches, TableToolbar } from "@/components/data-table/table-toolbar";
import { SimpleSelect } from "@/components/forms/simple-select";
import { DemoNotice } from "@/components/shared/demo-notice";
import { PageHeader } from "@/components/shared/page-header";
import { StatusTabs } from "@/components/shared/status-tabs";
import { listRedemptions } from "@/lib/mock-api/queries";
import { useDb } from "@/lib/mock-api/store";
import { REDEMPTION_STATUSES, type RedemptionStatus } from "@/types";
import { RedemptionsTable } from "./redemptions-table";

type Tab = "All" | RedemptionStatus;

export function RedemptionsView() {
  const db = useDb();
  const rows = useMemo(() => listRedemptions(db), [db]);
  const [tab, setTab] = useState<Tab>("All");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");

  const filtered = rows.filter(
    (r) => (tab === "All" || r.status === tab) && (role === "all" || r.userRole === role) && matches(search, r.id, r.userName, r.reward?.name, r.fulfilmentRef),
  );

  return (
    <div>
      <PageHeader title="Redemptions" description="Reward requests from plumbers and retailers. Approve to deduct points, then track fulfilment through to delivery." />
      <DemoNotice>Points are deducted exactly once, at approval. Later status changes never deduct again; cancellations and failures after approval refund once. Courier and voucher references are mock values.</DemoNotice>
      <div className="rounded-xl border border-border bg-card">
        <StatusTabs
          label="Redemption status"
          value={tab}
          onChange={setTab}
          tabs={(["All", ...REDEMPTION_STATUSES] as Tab[]).map((value) => ({
            value,
            label: value,
            count: value === "All" ? rows.length : rows.filter((r) => r.status === value).length,
          }))}
        />
        <TableToolbar search={search} onSearchChange={setSearch} placeholder="Search reference, user or reward">
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
        </TableToolbar>
        <RedemptionsTable rows={filtered} />
      </div>
    </div>
  );
}
