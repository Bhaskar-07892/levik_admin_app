"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DataTable, type Column } from "@/components/data-table/data-table";
import { matches, TableToolbar } from "@/components/data-table/table-toolbar";
import { Field } from "@/components/forms/field";
import { SimpleSelect, toOptions } from "@/components/forms/simple-select";
import { PageHeader } from "@/components/shared/page-header";
import { DetailGrid } from "@/components/shared/section-card";
import { RoleBadge, StatusBadge } from "@/components/shared/status-badge";
import { StatusTabs } from "@/components/shared/status-tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { findUser } from "@/lib/mock-api/rules";
import { updateTicket } from "@/lib/mock-api/services";
import { useDb } from "@/lib/mock-api/store";
import { formatDateTime } from "@/lib/utils/format";
import { runAction } from "@/lib/utils/run-action";
import { TICKET_STATUSES, type SupportTicket, type TicketStatus } from "@/types";

type Tab = "All" | TicketStatus;

function TicketForm({ ticket, onClose }: { ticket: SupportTicket; onClose: () => void }) {
  const db = useDb();
  const user = findUser(db, ticket.userId);
  const [status, setStatus] = useState<string>(ticket.status);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="grid gap-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (status === ticket.status && !note.trim()) return setError("Change the status or add a note.");
        const ok = runAction(() => updateTicket(ticket.id, status as TicketStatus, note), `Ticket ${ticket.id} updated`);
        if (ok.ok) onClose();
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
                {user ? (
                  <Link href={user.href} className="text-primary hover:underline">
                    {user.name}
                  </Link>
                ) : (
                  ticket.userId
                )}
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
          <Textarea id="tk-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Visible to admins only (demo)" />
        </Field>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button type="submit">Save update</Button>
      </DialogFooter>
    </form>
  );
}

export function SupportView() {
  const db = useDb();
  const tickets = useMemo(() => [...db.tickets].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [db]);
  const [tab, setTab] = useState<Tab>("All");
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const open = tickets.find((t) => t.id === openId) ?? null;

  const filtered = tickets.filter(
    (t) =>
      (tab === "All" || t.status === tab) &&
      (priority === "all" || t.priority === priority) &&
      matches(search, t.id, t.subject, t.description, findUser(db, t.userId)?.name),
  );

  const columns: Column<SupportTicket>[] = [
    { id: "id", header: "Ticket", cell: (t) => <span className="font-mono text-xs">{t.id}</span>, sortValue: (t) => t.id },
    {
      id: "subject",
      header: "Subject",
      cell: (t) => (
        <div>
          <p className="max-w-sm truncate font-medium">{t.subject}</p>
          <p className="text-xs text-muted-foreground">{t.category}</p>
        </div>
      ),
      sortValue: (t) => t.subject,
    },
    {
      id: "user",
      header: "Raised by",
      cell: (t) => (
        <div className="flex items-center gap-2">
          <span>{findUser(db, t.userId)?.name ?? t.userId}</span>
          <RoleBadge role={t.userRole} />
        </div>
      ),
    },
    { id: "priority", header: "Priority", cell: (t) => <StatusBadge status={t.priority} />, sortValue: (t) => ["Low", "Medium", "High"].indexOf(t.priority) },
    { id: "status", header: "Status", cell: (t) => <StatusBadge status={t.status} />, sortValue: (t) => t.status },
    { id: "updated", header: "Updated", cell: (t) => <span className="whitespace-nowrap">{formatDateTime(t.updatedAt)}</span>, sortValue: (t) => t.updatedAt },
  ];

  return (
    <div>
      <PageHeader title="Support Tickets" description="Queries raised by plumbers and retailers from the mobile app. Update status and keep internal notes." />
      <div className="rounded-xl border border-border bg-card">
        <StatusTabs
          label="Ticket status"
          value={tab}
          onChange={setTab}
          tabs={(["All", ...TICKET_STATUSES] as Tab[]).map((value) => ({
            value,
            label: value,
            count: value === "All" ? tickets.length : tickets.filter((t) => t.status === value).length,
          }))}
        />
        <TableToolbar search={search} onSearchChange={setSearch} placeholder="Search tickets">
          <SimpleSelect value={priority} onValueChange={setPriority} options={toOptions(["High", "Medium", "Low"], "All priorities")} ariaLabel="Filter by priority" />
        </TableToolbar>
        <DataTable caption="Support tickets" data={filtered} columns={columns} getRowId={(t) => t.id} onRowClick={(t) => setOpenId(t.id)} initialSort={{ id: "updated", desc: true }} />
      </div>
      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent className="sm:max-w-xl">{open ? <TicketForm key={`${open.id}-${open.updatedAt}`} ticket={open} onClose={() => setOpenId(null)} /> : null}</DialogContent>
      </Dialog>
    </div>
  );
}
