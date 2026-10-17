"use client";

import { useMemo, useState } from "react";
import { matches, TableToolbar } from "@/components/data-table/table-toolbar";
import { SimpleSelect } from "@/components/forms/simple-select";
import { DemoNotice } from "@/components/shared/demo-notice";
import { PageHeader } from "@/components/shared/page-header";
import { StatusTabs } from "@/components/shared/status-tabs";
import { listScans } from "@/lib/mock-api/queries";
import { useDb } from "@/lib/mock-api/store";
import { SCAN_STATUSES, type ScanStatus } from "@/types";
import { ScansTable } from "./scans-table";

type Tab = "All" | ScanStatus;

export function ScansView() {
  const db = useDb();
  const scans = useMemo(() => listScans(db), [db]);
  const [tab, setTab] = useState<Tab>("Pending");
  const [search, setSearch] = useState("");
  const [retailer, setRetailer] = useState("all");

  const filtered = scans.filter(
    (s) =>
      (tab === "All" || s.status === tab) &&
      (retailer === "all" || (retailer === "none" ? !s.retailerId : s.retailerId === retailer)) &&
      matches(search, s.id, s.submittedCode, s.plumber?.name, s.product?.modelCode, s.product?.name, s.invoiceNumber, s.retailer?.shopName),
  );

  return (
    <div>
      <PageHeader
        title="Product Scans"
        description="Plumber product scans awaiting verification. A scan alone is not proof of sale: approve only when the retailer or invoice reference checks out."
      />
      <DemoNotice>Points shown are sample programme values. Approving a scan credits the plumber once and writes a ledger and audit entry.</DemoNotice>
      <div className="rounded-xl border border-border bg-card">
        <StatusTabs
          label="Scan status"
          value={tab}
          onChange={setTab}
          tabs={(["All", ...SCAN_STATUSES] as Tab[]).map((value) => ({
            value,
            label: value,
            count: value === "All" ? scans.length : scans.filter((s) => s.status === value).length,
          }))}
        />
        <TableToolbar search={search} onSearchChange={setSearch} placeholder="Search scan ref, serial, plumber, model">
          <SimpleSelect
            value={retailer}
            onValueChange={setRetailer}
            ariaLabel="Filter by retailer"
            options={[
              { value: "all", label: "All retailers" },
              { value: "none", label: "No retailer reference" },
              ...db.retailers.map((r) => ({ value: r.id, label: r.shopName })),
            ]}
          />
        </TableToolbar>
        <ScansTable rows={filtered} />
      </div>
    </div>
  );
}
