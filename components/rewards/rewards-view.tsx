"use client";

import { History, MoreHorizontal, PackagePlus, Pencil, Plus, Power, PowerOff } from "lucide-react";
import { keepPreviousData } from "@tanstack/react-query";
import { useState } from "react";
import { DataTable, type Column } from "@/components/data-table/data-table";
import { TableToolbar } from "@/components/data-table/table-toolbar";
import { Field } from "@/components/forms/field";
import { SimpleSelect, toOptions } from "@/components/forms/simple-select";
import { RelatedRedemptions } from "@/components/redemptions/redemptions-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DemoNotice } from "@/components/shared/demo-notice";
import { PageHeader } from "@/components/shared/page-header";
import { RoleBadge, StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { $api, api, call } from "@/lib/api/client";
import type { RewardDto as Reward } from "@/lib/api/types";
import { usePagedList } from "@/lib/hooks/use-paged-list";
import { formatNumber } from "@/lib/utils/format";
import { runAction } from "@/lib/utils/run-action";
import { REWARD_CATEGORIES, type RewardCategory } from "@/types";
import { RewardFormDialog } from "./reward-form-dialog";
import { RewardIcon } from "./reward-icon";

function StockDialog({ reward, onOpenChange }: { reward: Reward | null; onOpenChange: (open: boolean) => void }) {
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  return (
    <Dialog
      open={reward !== null}
      onOpenChange={(open) => {
        if (!open) {
          setDelta("");
          setReason("");
          setError(null);
        }
        onOpenChange(open);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <form
          className="grid gap-4"
          noValidate
          onSubmit={async (e) => {
            e.preventDefault();
            if (!reward) return;
            const value = Number(delta);
            if (!Number.isInteger(value) || value === 0) return setError("Enter a non-zero whole number, e.g. 10 or -2.");
            setError(null);
            setSubmitting(true);
            const result = await runAction(
              () => call(api.POST("/api/v1/admin/rewards/{id}/stock-adjustments", { params: { path: { id: reward.id } }, body: { delta: value, reason: reason.trim() } })),
              `Stock updated for ${reward.name}`,
            );
            setSubmitting(false);
            if (result.ok) {
              setDelta("");
              setReason("");
              onOpenChange(false);
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>Adjust stock</DialogTitle>
            <DialogDescription>
              {reward?.name} · current stock {reward?.stock}. Stock cannot go below zero.
            </DialogDescription>
          </DialogHeader>
          <Field label="Change (+ to add, − to remove)" htmlFor="stock-delta" error={error ?? undefined}>
            <Input id="stock-delta" value={delta} onChange={(e) => setDelta(e.target.value)} placeholder="e.g. 10" inputMode="numeric" />
          </Field>
          <Field label="Reason" htmlFor="stock-reason" hint="Recorded in the audit log (min. 5 characters)">
            <Textarea id="stock-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. New consignment received" />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              Update stock
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RewardsView() {
  const list = usePagedList({ category: "all", status: "all" });
  const { category, status } = list.filters;
  const { data, isFetching } = $api.useQuery(
    "get",
    "/api/v1/admin/rewards",
    {
      params: {
        query: {
          page: list.page,
          pageSize: list.pageSize,
          search: list.query.search,
          category: category === "all" ? undefined : (category as RewardCategory),
          isActive: status === "all" ? undefined : status === "Active",
        },
      },
    },
    { placeholderData: keepPreviousData },
  );
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Reward | undefined>();
  const [stockReward, setStockReward] = useState<Reward | null>(null);
  const [toggleReward, setToggleReward] = useState<Reward | null>(null);
  const [historyReward, setHistoryReward] = useState<Reward | null>(null);

  const columns: Column<Reward>[] = [
    {
      id: "reward",
      header: "Reward",
      cell: (r) => (
        <div className="flex items-center gap-3">
          <RewardIcon category={r.category} className="size-10 shrink-0" />
          <div>
            <p className="font-medium">{r.name}</p>
            <p className="font-mono text-xs text-muted-foreground">{r.id}</p>
          </div>
        </div>
      ),
    },
    {
      id: "category",
      header: "Category",
      cell: (r) => (
        <div>
          <p>{r.category}</p>
          <p className="text-xs text-muted-foreground">{r.type}</p>
        </div>
      ),
    },
    {
      id: "roles",
      header: "Eligible",
      cell: (r) => (
        <div className="flex gap-1">
          {r.eligibleRoles.map((role) => (
            <RoleBadge key={role} role={role} />
          ))}
        </div>
      ),
    },
    {
      id: "points",
      header: "Points",
      align: "right",
      cell: (r) => <span className="font-semibold text-[#8a6a2f]">{formatNumber(r.pointsRequired)}</span>,
    },
    {
      id: "stock",
      header: "Stock",
      align: "right",
      cell: (r) => <span className={r.stock === 0 ? "font-medium text-destructive" : r.stock <= 5 ? "font-medium text-warning" : ""}>{r.stock}</span>,
    },
    { id: "redeemed", header: "Redeemed", align: "right", cell: (r) => r.redeemedCount },
    { id: "status", header: "Status", cell: (r) => <StatusBadge status={r.isActive ? "Active" : "Inactive"} /> },
    {
      id: "actions",
      header: "",
      className: "w-12",
      cell: (r) => (
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${r.name}`} onClick={(e) => e.stopPropagation()} />}>
            <MoreHorizontal />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={() => {
                setEditing(r);
                setFormOpen(true);
              }}
            >
              <Pencil /> Edit reward
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStockReward(r)}>
              <PackagePlus /> Adjust stock
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setHistoryReward(r)}>
              <History /> Redemption history
            </DropdownMenuItem>
            <DropdownMenuItem variant={r.isActive ? "destructive" : "default"} onClick={() => setToggleReward(r)}>
              {r.isActive ? <PowerOff /> : <Power />} {r.isActive ? "Deactivate" : "Activate"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Rewards Catalogue"
        description="Vouchers, gift cards and physical gifts that plumbers and retailers can redeem with points."
        actions={
          <Button
            onClick={() => {
              setEditing(undefined);
              setFormOpen(true);
            }}
          >
            <Plus /> Add reward
          </Button>
        }
      />
      <DemoNotice>Stock changes only through “Adjust stock” (with a reason) and approvals. It can never go below zero, and every change is audited.</DemoNotice>
      <div className="rounded-xl border border-border bg-card">
        <TableToolbar search={list.search} onSearchChange={list.setSearch} placeholder="Search rewards">
          <SimpleSelect value={category} onValueChange={(value) => list.setFilter("category", value)} options={toOptions(REWARD_CATEGORIES, "All categories")} ariaLabel="Filter by category" />
          <SimpleSelect value={status} onValueChange={(value) => list.setFilter("status", value)} options={toOptions(["Active", "Inactive"], "All statuses")} ariaLabel="Filter by status" />
        </TableToolbar>
        <DataTable
          caption="Rewards"
          data={data?.items ?? []}
          columns={columns}
          getRowId={(r) => r.id}
          loading={isFetching}
          pagination={{ page: list.page, pageSize: list.pageSize, total: data?.total ?? 0, onPageChange: list.setPage }}
        />
      </div>

      <RewardFormDialog reward={editing} open={formOpen} onOpenChange={setFormOpen} />
      <StockDialog reward={stockReward} onOpenChange={(open) => !open && setStockReward(null)} />
      <ConfirmDialog
        open={toggleReward !== null}
        onOpenChange={(open) => !open && setToggleReward(null)}
        title={toggleReward?.isActive ? "Deactivate reward?" : "Activate reward?"}
        description={toggleReward?.isActive ? "Users will no longer be able to request this reward. Existing requests are unaffected." : "The reward becomes available for redemption."}
        confirmLabel={toggleReward?.isActive ? "Deactivate" : "Activate"}
        destructive={toggleReward?.isActive}
        onConfirm={() =>
          toggleReward &&
          runAction(
            () => call(api.PATCH("/api/v1/admin/rewards/{id}", { params: { path: { id: toggleReward.id } }, body: { isActive: !toggleReward.isActive } })),
            toggleReward.isActive ? "Reward deactivated" : "Reward activated",
          )
        }
      />
      <Dialog open={historyReward !== null} onOpenChange={(open) => !open && setHistoryReward(null)}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Redemption history</DialogTitle>
            <DialogDescription>{historyReward?.name}</DialogDescription>
          </DialogHeader>
          <div className="-mx-4 max-h-[60vh] overflow-y-auto border-t border-border">
            {historyReward ? <RelatedRedemptions filter={{ rewardId: historyReward.id }} /> : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
