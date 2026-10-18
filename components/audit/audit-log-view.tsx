"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DataTable, type Column } from "@/components/data-table/data-table";
import { TableToolbar } from "@/components/data-table/table-toolbar";
import { SimpleSelect, toOptions } from "@/components/forms/simple-select";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { $api, downloadFile } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import type { AuditLogDto, QueryOf } from "@/lib/api/types";
import { usePagedList } from "@/lib/hooks/use-paged-list";
import { formatDateTime } from "@/lib/utils/format";

export function AuditLogView() {
  const list = usePagedList({ entityType: "all", admin: "all" }, { pageSize: 25 });
  const { data, isFetching } = $api.useQuery(
    "get",
    "/api/v1/admin/audit-logs",
    { params: { query: list.query as QueryOf<"/api/v1/admin/audit-logs"> } },
    { placeholderData: keepPreviousData },
  );
  const { data: options } = $api.useQuery("get", "/api/v1/admin/audit-logs/filter-options", {}, { staleTime: 5 * 60_000 });
  const [exporting, setExporting] = useState(false);

  const exportCsv = async () => {
    setExporting(true);
    try {
      await downloadFile("/api/v1/admin/audit-logs/export.csv", list.filterQuery, "levik-audit-log.csv");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setExporting(false);
    }
  };

  const columns: Column<AuditLogDto>[] = [
    { id: "at", header: "Timestamp", cell: (l) => <span className="whitespace-nowrap">{formatDateTime(l.at)}</span> },
    { id: "admin", header: "Admin", cell: (l) => l.admin },
    { id: "action", header: "Action", cell: (l) => <span className="font-medium">{l.action}</span> },
    { id: "entity", header: "Entity", cell: (l) => l.entityType },
    { id: "ref", header: "Reference", cell: (l) => <span className="font-mono text-xs">{l.entityId}</span> },
    { id: "summary", header: "Reason / summary", cell: (l) => <span className="block max-w-md text-muted-foreground">{l.summary}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        description="Append-only record of significant admin actions. Entries cannot be edited or deleted – the database rejects any change."
        actions={
          <Button variant="outline" onClick={() => void exportCsv()} disabled={exporting}>
            <Download /> Export CSV
          </Button>
        }
      />
      <div className="rounded-xl border border-border bg-card">
        <TableToolbar search={list.search} onSearchChange={list.setSearch} placeholder="Search action, reference, summary">
          <SimpleSelect
            value={list.filters.entityType}
            onValueChange={(value) => list.setFilter("entityType", value)}
            options={toOptions(options?.entityTypes ?? [], "All entities")}
            ariaLabel="Filter by entity"
          />
          <SimpleSelect value={list.filters.admin} onValueChange={(value) => list.setFilter("admin", value)} options={toOptions(options?.admins ?? [], "All admins")} ariaLabel="Filter by admin" />
        </TableToolbar>
        <DataTable
          caption="Audit log"
          data={data?.items ?? []}
          columns={columns}
          getRowId={(l) => l.id}
          loading={isFetching}
          pagination={{ page: list.page, pageSize: list.pageSize, total: data?.total ?? 0, onPageChange: list.setPage }}
        />
      </div>
    </div>
  );
}
