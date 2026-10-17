"use client";

import { Download } from "lucide-react";
import { useMemo, useState } from "react";
import { DataTable, type Column } from "@/components/data-table/data-table";
import { matches, TableToolbar } from "@/components/data-table/table-toolbar";
import { SimpleSelect, toOptions } from "@/components/forms/simple-select";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { listAuditLogs } from "@/lib/mock-api/queries";
import { useDb } from "@/lib/mock-api/store";
import { downloadCsv, formatDateTime } from "@/lib/utils/format";
import type { AuditLog } from "@/types";

export function AuditLogView() {
  const db = useDb();
  const logs = useMemo(() => listAuditLogs(db), [db]);
  const [search, setSearch] = useState("");
  const [entity, setEntity] = useState("all");
  const [admin, setAdmin] = useState("all");
  const entities = useMemo(() => [...new Set(logs.map((l) => l.entityType))].sort(), [logs]);
  const admins = useMemo(() => [...new Set(logs.map((l) => l.admin))].sort(), [logs]);

  const filtered = logs.filter(
    (l) => matches(search, l.action, l.entityId, l.summary, l.admin) && (entity === "all" || l.entityType === entity) && (admin === "all" || l.admin === admin),
  );

  const columns: Column<AuditLog>[] = [
    { id: "at", header: "Timestamp", cell: (l) => <span className="whitespace-nowrap">{formatDateTime(l.at)}</span>, sortValue: (l) => l.at },
    { id: "admin", header: "Admin", cell: (l) => l.admin, sortValue: (l) => l.admin },
    { id: "action", header: "Action", cell: (l) => <span className="font-medium">{l.action}</span>, sortValue: (l) => l.action },
    { id: "entity", header: "Entity", cell: (l) => l.entityType, sortValue: (l) => l.entityType },
    { id: "ref", header: "Reference", cell: (l) => <span className="font-mono text-xs">{l.entityId}</span>, sortValue: (l) => l.entityId },
    { id: "summary", header: "Reason / summary", cell: (l) => <span className="block max-w-md text-muted-foreground">{l.summary}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        description="Append-only record of significant admin actions. Entries cannot be edited or deleted from the application."
        actions={
          <Button
            variant="outline"
            onClick={() =>
              downloadCsv(
                "levik-audit-log.csv",
                filtered.map((l) => ({ timestamp: l.at, admin: l.admin, action: l.action, entity: l.entityType, reference: l.entityId, summary: l.summary })),
              )
            }
          >
            <Download /> Export CSV
          </Button>
        }
      />
      <div className="rounded-xl border border-border bg-card">
        <TableToolbar search={search} onSearchChange={setSearch} placeholder="Search action, reference, summary">
          <SimpleSelect value={entity} onValueChange={setEntity} options={toOptions(entities, "All entities")} ariaLabel="Filter by entity" />
          <SimpleSelect value={admin} onValueChange={setAdmin} options={toOptions(admins, "All admins")} ariaLabel="Filter by admin" />
        </TableToolbar>
        <DataTable caption="Audit log" data={filtered} columns={columns} getRowId={(l) => l.id} pageSize={15} initialSort={{ id: "at", desc: true }} />
      </div>
    </div>
  );
}
