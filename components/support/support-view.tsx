"use client";

import Link from "next/link";
import { keepPreviousData } from "@tanstack/react-query";
import { useState } from "react";
import { DataTable, type Column } from "@/components/data-table/data-table";
import { TableToolbar } from "@/components/data-table/table-toolbar";
import { userHref } from "@/components/ledger/ledger-table";
import { Field } from "@/components/forms/field";
import { SimpleSelect, toOptions } from "@/components/forms/simple-select";
import { PageHeader } from "@/components/shared/page-header";
import { DetailGrid } from "@/components/shared/section-card";
import { RoleBadge, StatusBadge } from "@/components/shared/status-badge";
import { StatusTabs } from "@/components/shared/status-tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { $api, api, call } from "@/lib/api/client";
import { useStatusCounts } from "@/lib/api/hooks";
import type { QueryOf, TicketDto as SupportTicket } from "@/lib/api/types";
import { usePagedList } from "@/lib/hooks/use-paged-list";
import { formatDateTime } from "@/lib/utils/format";
import { runAction } from "@/lib/utils/run-action";
import { TICKET_STATUSES, type TicketStatus } from "@/types";

type Tab = "all" | TicketStatus;

function TicketForm({ ticket, onClose }: { ticket: SupportTicket; onClose: () => void }) {
  const [status, setStatus] = useState<string>(ticket.status);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  return (
    <form
      className="grid gap-4"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        if (status === ticket.status && !note.trim()) return setError("Change the status or add a note.");
        setSubmitting(true);
        const result = await runAction(
          () =>
            call(
              api.PATCH("/api/v1/admin/support-tickets/{id}", {
                params: { path: { id: ticket.id } },
                body: { status: status as TicketStatus, note: note.trim() || undefined },
              }),
            ),
          `Ticket ${ticket.id} updated`,
        );
        setSubmitting(false);
        if (result.ok) onClose();
      }}
    >
      <DialogHeader>
        <DialogTitle>{ticket.subject}</DialogTitle>
        <DialogDescription>
          {ticket.id} · opened {formatDateTime(ticket.createdAt)}
        </DialogDescription>
      </DialogHeader>
      <DetailGrid
        items={[
          {
            label: "Raised by",
            value: (
              <span className="flex items-center gap-2">
                <Link href={userHref(ticket)} className="text-primary hover:underline">
                  {ticket.userName}
                </Link>
                <RoleBadge role={ticket.userRole} />
              </span>
            ),
          },
          { label: "Category · priority", value: `${ticket.category} · ${ticket.priority}` },
        ]}
      />
      <p className="rounded-lg bg-muted px-3 py-2 text-sm">{ticket.description}</p>
      {ticket.notes.length ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Internal notes</p>
          {ticket.notes.map((n, i) => (
            <div key={i} className="rounded-lg border border-border px-3 py-2 text-sm">
              <p>{n.text}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {n.by} · {formatDateTime(n.at)}
              </p>
            </div>
          ))}
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
        <Field label="Status" htmlFor="tk-status">
          <SimpleSelect id="tk-status" value={status} onValueChange={setStatus} options={toOptions(TICKET_STATUSES)} />
        </Field>
        <Field label="Add internal note" htmlFor="tk-note" error={error ?? undefined}>
          <Textarea id="tk-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Visible to admins only" />
        </Field>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button type="submit" disabled={submitting}>
          Save update
        </Button>
      </DialogFooter>
    </form>
  );
}

export function SupportView() {
  const list = usePagedList<{ status: Tab; priority: string }>({ status: "all", priority: "all" });
  const { data, isFetching } = $api.useQuery(
    "get",
    "/api/v1/admin/support-tickets",
    { params: { query: list.query as QueryOf<"/api/v1/admin/support-tickets"> } },
    { placeholderData: keepPreviousData },
  );
  const { counts, total } = useStatusCounts("/api/v1/admin/support-tickets/status-counts");
  const [openId, setOpenId] = useState<string | null>(null);
  const { data: open } = $api.useQuery("get", "/api/v1/admin/support-tickets/{id}", { params: { path: { id: openId ?? "" } } }, { enabled: openId !== null });

  const columns: Column<SupportTicket>[] = [
    { id: "id", header: "Ticket", cell: (t) => <span className="font-mono text-xs">{t.id}</span> },
    {
      id: "subject",
      header: "Subject",
      cell: (t) => (
        <div>
          <p className="max-w-sm truncate font-medium">{t.subject}</p>
          <p className="text-xs text-muted-foreground">{t.category}</p>
        </div>
      ),
    },
    {
      id: "user",
      header: "Raised by",
      cell: (t) => (
        <div className="flex items-center gap-2">
          <span>{t.userName}</span>
          <RoleBadge role={t.userRole} />
        </div>
      ),
    },
    { id: "priority", header: "Priority", cell: (t) => <StatusBadge status={t.priority} /> },
    { id: "status", header: "Status", cell: (t) => <StatusBadge status={t.status} /> },
    { id: "updated", header: "Updated", cell: (t) => <span className="whitespace-nowrap">{formatDateTime(t.updatedAt)}</span> },
  ];

  return (
    <div>
      <PageHeader title="Support Tickets" description="Queries raised by plumbers and retailers from the mobile app. Update status and keep internal notes." />
      <div className="rounded-xl border border-border bg-card">
        <StatusTabs
          label="Ticket status"
          value={list.filters.status}
          onChange={(value) => list.setFilter("status", value)}
          tabs={(["all", ...TICKET_STATUSES] as Tab[]).map((value) => ({
            value,
            label: value === "all" ? "All" : value,
            count: value === "all" ? total : (counts[value] ?? 0),
          }))}
        />
        <TableToolbar search={list.search} onSearchChange={list.setSearch} placeholder="Search tickets">
          <SimpleSelect value={list.filters.priority} onValueChange={(value) => list.setFilter("priority", value)} options={toOptions(["High", "Medium", "Low"], "All priorities")} ariaLabel="Filter by priority" />
        </TableToolbar>
        <DataTable
          caption="Support tickets"
          data={data?.items ?? []}
          columns={columns}
          getRowId={(t) => t.id}
          onRowClick={(t) => setOpenId(t.id)}
          loading={isFetching}
          pagination={{ page: list.page, pageSize: list.pageSize, total: data?.total ?? 0, onPageChange: list.setPage }}
        />
      </div>
      <Dialog open={openId !== null} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent className="sm:max-w-xl">
          {open && open.id === openId ? (
            <TicketForm key={`${open.id}-${open.updatedAt}`} ticket={open} onClose={() => setOpenId(null)} />
          ) : (
            <div className="space-y-3" aria-busy="true">
              <DialogTitle className="sr-only">Loading ticket</DialogTitle>
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-24 w-full" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
