"use client";

import { useMemo, useState } from "react";
import { matches, TableToolbar } from "@/components/data-table/table-toolbar";
import { SimpleSelect } from "@/components/forms/simple-select";
import { DemoNotice } from "@/components/shared/demo-notice";
import { PageHeader } from "@/components/shared/page-header";
import { StatusTabs } from "@/components/shared/status-tabs";
import { listInvoices } from "@/lib/mock-api/queries";
import { useDb } from "@/lib/mock-api/store";
import { INVOICE_STATUSES, type InvoiceStatus } from "@/types";
import { InvoicesTable } from "./invoices-table";

type Tab = "All" | InvoiceStatus;
const TAB_LABEL: Record<Tab, string> = {
  All: "All",
  Submitted: "Submitted",
  "Under Review": "Under review",
  Approved: "Approved",
  Rejected: "Rejected",
  "More Information Required": "Needs info",
};

export function InvoicesView() {
  const db = useDb();
  const invoices = useMemo(() => listInvoices(db), [db]);
  const [tab, setTab] = useState<Tab>("All");
  const [search, setSearch] = useState("");
  const [retailer, setRetailer] = useState("all");

  const filtered = invoices.filter(
    (i) =>
      (tab === "All" || i.status === tab) &&
      (retailer === "all" || i.retailerId === retailer) &&
      matches(search, i.id, i.invoiceNumber, i.retailer?.shopName, i.buyerName, i.reviewer),
  );

  return (
    <div>
      <PageHeader
        title="Invoice Management"
        description="Sales invoices uploaded by retailers. Review line items and the calculated incentive before approving."
      />
      <DemoNotice>
        Incentive rule (sample): {db.settings.retailerPointsPer100} point per ₹100 of pre-GST value on active, reward-eligible products. Invoice documents are mock previews – no OCR is performed.
      </DemoNotice>
      <div className="rounded-xl border border-border bg-card">
        <StatusTabs
          label="Invoice status"
          value={tab}
          onChange={setTab}
          tabs={(["All", ...INVOICE_STATUSES] as Tab[]).map((value) => ({
            value,
            label: TAB_LABEL[value],
            count: value === "All" ? invoices.length : invoices.filter((i) => i.status === value).length,
          }))}
        />
        <TableToolbar search={search} onSearchChange={setSearch} placeholder="Search invoice no., retailer, buyer">
          <SimpleSelect
            value={retailer}
            onValueChange={setRetailer}
            ariaLabel="Filter by retailer"
            options={[{ value: "all", label: "All retailers" }, ...db.retailers.map((r) => ({ value: r.id, label: r.shopName }))]}
          />
        </TableToolbar>
        <InvoicesTable rows={filtered} />
      </div>
    </div>
  );
}
