"use client";

import { History, MoreHorizontal, PackagePlus, Pencil, Plus, Power, PowerOff } from "lucide-react";
import { useMemo, useState } from "react";
import { DataTable, type Column } from "@/components/data-table/data-table";
import { matches, TableToolbar } from "@/components/data-table/table-toolbar";
import { Field } from "@/components/forms/field";
import { SimpleSelect, toOptions } from "@/components/forms/simple-select";
import { RedemptionsTable } from "@/components/redemptions/redemptions-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DemoNotice } from "@/components/shared/demo-notice";
import { PageHeader } from "@/components/shared/page-header";
import { RoleBadge, StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { listRedemptions, listRewards, type RewardRow } from "@/lib/mock-api/queries";
import { adjustRewardStock, setRewardActive } from "@/lib/mock-api/services";
import { useDb } from "@/lib/mock-api/store";
import { formatNumber } from "@/lib/utils/format";
import { runAction } from "@/lib/utils/run-action";
import { REWARD_CATEGORIES, type Reward } from "@/types";
import { RewardFormDialog } from "./reward-form-dialog";
import { RewardIcon } from "./reward-icon";

function StockDialog({ reward, onOpenChange }: { reward: Reward | null; onOpenChange: (open: boolean) => void }) {
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
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
          onSubmit={(e) => {
            e.preventDefault();
            if (!reward) return;
            const value = Number(delta);
            if (!Number.isInteger(value) || value === 0) return setError("Enter a non-zero whole number, e.g. 10 or -2.");
            setError(null);
            const ok = runAction(() => adjustRewardStock(reward.id, value, reason), `Stock updated for ${reward.name}`);
            if (ok.ok) {
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
            <Button type="submit">Update stock</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RewardsView() {
  const db = useDb();
  const rewards = useMemo(() => listRewards(db), [db]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Reward | undefined>();
  const [stockReward, setStockReward] = useState<Reward | null>(null);
  const [toggleReward, setToggleReward] = useState<Reward | null>(null);
  const [historyReward, setHistoryReward] = useState<Reward | null>(null);
  const history = useMemo(() => (historyReward ? listRedemptions(db).filter((r) => r.rewardId === historyReward.id) : []), [db, historyReward]);

  const filtered = rewards.filter(
    (r) =>
      matches(search, r.id, r.name, r.category) &&
      (category === "all" || r.category === category) &&
      (status === "all" || (status === "Active" ? r.isActive : !r.isActive)),
  );

  const columns: Column<RewardRow>[] = [
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
      sortValue: (r) => r.name,
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
      sortValue: (r) => r.category,
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
      sortValue: (r) => r.pointsRequired,
    },
    {
      id: "stock",
      header: "Stock",
      align: "right",
      cell: (r) => <span className={r.stock === 0 ? "font-medium text-destructive" : r.stock <= 5 ? "font-medium text-warning" : ""}>{r.stock}</span>,
      sortValue: (r) => r.stock,
    },
    { id: "redeemed", header: "Redeemed", align: "right", cell: (r) => r.redemptionCount, sortValue: (r) => r.redemptionCount },
    { id: "status", header: "Status", cell: (r) => <StatusBadge status={r.isActive ? "Active" : "Inactive"} />, sortValue: (r) => String(r.isActive) },
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
      <DemoNotice>Point thresholds are configurable sample values for demonstration, not official Levik programme rules. Fulfilment uses mock references.</DemoNotice>
      <div className="rounded-xl border border-border bg-card">
        <TableToolbar search={search} onSearchChange={setSearch} placeholder="Search rewards">
          <SimpleSelect value={category} onValueChange={setCategory} options={toOptions(REWARD_CATEGORIES, "All categories")} ariaLabel="Filter by category" />
          <SimpleSelect value={status} onValueChange={setStatus} options={toOptions(["Active", "Inactive"], "All statuses")} ariaLabel="Filter by status" />
        </TableToolbar>
        <DataTable caption="Rewards" data={filtered} columns={columns} getRowId={(r) => r.id} initialSort={{ id: "points", desc: false }} />
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
        onConfirm={() => toggleReward && runAction(() => setRewardActive(toggleReward.id, !toggleReward.isActive), toggleReward.isActive ? "Reward deactivated" : "Reward activated")}
      />
      <Dialog open={historyReward !== null} onOpenChange={(open) => !open && setHistoryReward(null)}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Redemption history</DialogTitle>
            <DialogDescription>{historyReward?.name}</DialogDescription>
          </DialogHeader>
          <div className="-mx-4 max-h-[60vh] overflow-y-auto border-t border-border">
            <RedemptionsTable rows={history} pageSize={8} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
