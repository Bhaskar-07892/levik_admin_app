"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Field } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { updateRetailer } from "@/lib/mock-api/services";
import { runAction } from "@/lib/utils/run-action";
import { retailerEditSchema, type RetailerEditInput } from "@/lib/validations";
import type { Retailer } from "@/types";

const toValues = (r: Retailer): RetailerEditInput => ({
  shopName: r.shopName,
  ownerName: r.ownerName,
  mobile: r.mobile,
  email: r.email ?? "",
  address: r.address,
  city: r.city,
  state: r.state,
  gstin: r.gstin ?? "",
  distributor: r.distributor,
  monthlyTarget: r.monthlyTarget,
});

export function RetailerEditDialog({ retailer, open, onOpenChange }: { retailer: Retailer; open: boolean; onOpenChange: (open: boolean) => void }) {
  const form = useForm<RetailerEditInput>({ resolver: zodResolver(retailerEditSchema), defaultValues: toValues(retailer) });
  const { errors } = form.formState;

  useEffect(() => {
    if (open) form.reset(toValues(retailer));
  }, [open, retailer, form]);

  const submit = form.handleSubmit((values) => {
    const ok = runAction(() => updateRetailer(retailer.id, values), "Shop information updated");
    if (ok.ok) onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>Edit shop information</DialogTitle>
            <DialogDescription>Changes are recorded in the audit log.</DialogDescription>
          </DialogHeader>
          <div className="grid max-h-[60vh] gap-4 overflow-y-auto pr-1 sm:grid-cols-2">
            <Field label="Shop name" htmlFor="r-shop" error={errors.shopName?.message}>
              <Input id="r-shop" aria-invalid={Boolean(errors.shopName)} {...form.register("shopName")} />
            </Field>
            <Field label="Owner name" htmlFor="r-owner" error={errors.ownerName?.message}>
              <Input id="r-owner" aria-invalid={Boolean(errors.ownerName)} {...form.register("ownerName")} />
            </Field>
            <Field label="Mobile" htmlFor="r-mobile" error={errors.mobile?.message}>
              <Input id="r-mobile" aria-invalid={Boolean(errors.mobile)} {...form.register("mobile")} />
            </Field>
            <Field label="Email (optional)" htmlFor="r-email" error={errors.email?.message}>
              <Input id="r-email" type="email" aria-invalid={Boolean(errors.email)} {...form.register("email")} />
            </Field>
            <Field label="Address" htmlFor="r-address" error={errors.address?.message} className="sm:col-span-2">
              <Input id="r-address" aria-invalid={Boolean(errors.address)} {...form.register("address")} />
            </Field>
            <Field label="City" htmlFor="r-city" error={errors.city?.message}>
              <Input id="r-city" aria-invalid={Boolean(errors.city)} {...form.register("city")} />
            </Field>
            <Field label="State" htmlFor="r-state" error={errors.state?.message}>
              <Input id="r-state" aria-invalid={Boolean(errors.state)} {...form.register("state")} />
            </Field>
            <Field label="GSTIN (if registered)" htmlFor="r-gstin" error={errors.gstin?.message}>
              <Input id="r-gstin" className="font-mono uppercase" aria-invalid={Boolean(errors.gstin)} {...form.register("gstin")} />
            </Field>
            <Field label="Distributor" htmlFor="r-dist" error={errors.distributor?.message}>
              <Input id="r-dist" aria-invalid={Boolean(errors.distributor)} {...form.register("distributor")} />
            </Field>
            <Field label="Monthly sales target (₹)" htmlFor="r-target" error={errors.monthlyTarget?.message}>
              <Input id="r-target" type="number" min={0} step={1000} aria-invalid={Boolean(errors.monthlyTarget)} {...form.register("monthlyTarget", { valueAsNumber: true })} />
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
