"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { Field } from "@/components/forms/field";
import { SimpleSelect, toOptions } from "@/components/forms/simple-select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { api, call } from "@/lib/api/client";
import type { RewardDto } from "@/lib/api/types";
import { runAction } from "@/lib/utils/run-action";
import { rewardSchema, type RewardInput } from "@/lib/validations";
import { REWARD_CATEGORIES } from "@/types";

const EMPTY: RewardInput = {
  name: "",
  category: "Shopping Voucher",
  type: "Digital",
  description: "",
  pointsRequired: 1000,
  stock: 10,
  isActive: true,
  eligibleRoles: ["plumber", "retailer"],
};

const toValues = (r?: RewardDto): RewardInput =>
  r
    ? {
        name: r.name,
        category: r.category,
        type: r.type,
        description: r.description,
        pointsRequired: r.pointsRequired,
        stock: r.stock,
        isActive: r.isActive,
        eligibleRoles: r.eligibleRoles,
      }
    : EMPTY;

export function RewardFormDialog({ reward, open, onOpenChange }: { reward?: RewardDto; open: boolean; onOpenChange: (open: boolean) => void }) {
  const form = useForm<RewardInput>({ resolver: zodResolver(rewardSchema), defaultValues: toValues(reward) });
  const { errors } = form.formState;

  useEffect(() => {
    if (open) form.reset(toValues(reward));
  }, [open, reward, form]);

  const submit = form.handleSubmit(async ({ stock, ...values }) => {
    // Stock of an existing reward only changes through audited stock adjustments.
    const result = reward
      ? await runAction(() => call(api.PATCH("/api/v1/admin/rewards/{id}", { params: { path: { id: reward.id } }, body: values })), "Reward updated")
      : await runAction(() => call(api.POST("/api/v1/admin/rewards", { body: { ...values, stock } })), (r) => `${r.name} added to rewards`);
    if (result.ok) onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>{reward ? "Edit reward" : "Add reward"}</DialogTitle>
            <DialogDescription>Points required and stock are programme settings – changes are recorded in the audit log.</DialogDescription>
          </DialogHeader>
          <div className="grid max-h-[62vh] gap-4 overflow-y-auto pr-1 sm:grid-cols-2">
            <Field label="Reward name" htmlFor="rw-name" error={errors.name?.message} className="sm:col-span-2">
              <Input id="rw-name" aria-invalid={Boolean(errors.name)} {...form.register("name")} />
            </Field>
            <Field label="Category" htmlFor="rw-cat">
              <Controller
                control={form.control}
                name="category"
                render={({ field }) => <SimpleSelect id="rw-cat" value={field.value} onValueChange={field.onChange} options={toOptions(REWARD_CATEGORIES)} />}
              />
            </Field>
            <Field label="Fulfilment type" htmlFor="rw-type">
              <Controller
                control={form.control}
                name="type"
                render={({ field }) => (
                  <SimpleSelect
                    id="rw-type"
                    value={field.value}
                    onValueChange={field.onChange}
                    options={[
                      { value: "Digital", label: "Digital (voucher code)" },
                      { value: "Physical", label: "Physical (courier)" },
                    ]}
                  />
                )}
              />
            </Field>
            <Field label="Description" htmlFor="rw-desc" error={errors.description?.message} className="sm:col-span-2">
              <Textarea id="rw-desc" rows={2} aria-invalid={Boolean(errors.description)} {...form.register("description")} />
            </Field>
            <Field label="Points required" htmlFor="rw-points" error={errors.pointsRequired?.message}>
              <Input id="rw-points" type="number" min={0} step={100} aria-invalid={Boolean(errors.pointsRequired)} {...form.register("pointsRequired", { valueAsNumber: true })} />
            </Field>
            <Field
              label={reward ? "Stock quantity" : "Opening stock"}
              htmlFor="rw-stock"
              error={errors.stock?.message}
              hint={reward ? "Use “Adjust stock” to change stock with a reason." : undefined}
            >
              <Input id="rw-stock" type="number" min={0} disabled={Boolean(reward)} aria-invalid={Boolean(errors.stock)} {...form.register("stock", { valueAsNumber: true })} />
            </Field>
            <Field label="Eligible roles" error={errors.eligibleRoles?.message}>
              <Controller
                control={form.control}
                name="eligibleRoles"
                render={({ field }) => (
                  <div className="flex gap-4 pt-1">
                    {(["plumber", "retailer"] as const).map((role) => (
                      <label key={role} className="flex items-center gap-2 text-sm capitalize">
                        <Checkbox
                          checked={field.value.includes(role)}
                          onCheckedChange={(checked) =>
                            field.onChange(checked ? [...new Set([...field.value, role])] : field.value.filter((r) => r !== role))
                          }
                        />
                        {role}s
                      </label>
                    ))}
                  </div>
                )}
              />
            </Field>
            <Controller
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <label className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5 text-sm">
                  <span className="font-medium">Active in catalogue</span>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </label>
              )}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{reward ? "Save changes" : "Add reward"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
