"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Field } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { updatePlumber } from "@/lib/mock-api/services";
import { runAction } from "@/lib/utils/run-action";
import { plumberEditSchema, type PlumberEditInput } from "@/lib/validations";
import type { Plumber } from "@/types";

const toValues = (p: Plumber): PlumberEditInput => ({
  name: p.name,
  mobile: p.mobile,
  email: p.email ?? "",
  city: p.city,
  state: p.state,
  pincode: p.pincode,
  experienceYears: p.experienceYears,
  specialization: p.specialization,
});

export function PlumberEditDialog({ plumber, open, onOpenChange }: { plumber: Plumber; open: boolean; onOpenChange: (open: boolean) => void }) {
  const form = useForm<PlumberEditInput>({ resolver: zodResolver(plumberEditSchema), defaultValues: toValues(plumber) });
  const { errors } = form.formState;

  useEffect(() => {
    if (open) form.reset(toValues(plumber));
  }, [open, plumber, form]);

  const submit = form.handleSubmit((values) => {
    const ok = runAction(() => updatePlumber(plumber.id, values), "Plumber profile updated");
    if (ok.ok) onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>Edit plumber profile</DialogTitle>
            <DialogDescription>KYC identity fields (Aadhaar reference) cannot be edited here.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" htmlFor="p-name" error={errors.name?.message}>
              <Input id="p-name" aria-invalid={Boolean(errors.name)} {...form.register("name")} />
            </Field>
            <Field label="Mobile" htmlFor="p-mobile" error={errors.mobile?.message}>
              <Input id="p-mobile" aria-invalid={Boolean(errors.mobile)} {...form.register("mobile")} />
            </Field>
            <Field label="Email (optional)" htmlFor="p-email" error={errors.email?.message} className="sm:col-span-2">
              <Input id="p-email" type="email" aria-invalid={Boolean(errors.email)} {...form.register("email")} />
            </Field>
            <Field label="City" htmlFor="p-city" error={errors.city?.message}>
              <Input id="p-city" aria-invalid={Boolean(errors.city)} {...form.register("city")} />
            </Field>
            <Field label="State" htmlFor="p-state" error={errors.state?.message}>
              <Input id="p-state" aria-invalid={Boolean(errors.state)} {...form.register("state")} />
            </Field>
            <Field label="Pincode" htmlFor="p-pin" error={errors.pincode?.message}>
              <Input id="p-pin" inputMode="numeric" aria-invalid={Boolean(errors.pincode)} {...form.register("pincode")} />
            </Field>
            <Field label="Experience (years)" htmlFor="p-exp" error={errors.experienceYears?.message}>
              <Input id="p-exp" type="number" min={0} aria-invalid={Boolean(errors.experienceYears)} {...form.register("experienceYears", { valueAsNumber: true })} />
            </Field>
            <Field label="Specialisation" htmlFor="p-spec" error={errors.specialization?.message} className="sm:col-span-2">
              <Input id="p-spec" aria-invalid={Boolean(errors.specialization)} {...form.register("specialization")} />
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
