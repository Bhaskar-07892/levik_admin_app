"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Check, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm, useWatch, type FieldPath } from "react-hook-form";
import { Field } from "@/components/forms/field";
import { SimpleSelect } from "@/components/forms/simple-select";
import { PageHeader } from "@/components/shared/page-header";
import { DetailGrid, SectionCard } from "@/components/shared/section-card";
import { RoleBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createScheme, updateScheme } from "@/lib/mock-api/services";
import { cn } from "@/lib/utils";
import { formatINR, formatPoints } from "@/lib/utils/format";
import { runAction } from "@/lib/utils/run-action";
import { schemeFormSchema, type SchemeFormValues, type SchemeInput } from "@/lib/validations";
import { PRODUCT_CATEGORIES, type Scheme } from "@/types";

const STEPS: Array<{ title: string; fields: FieldPath<SchemeFormValues>[] }> = [
  { title: "Basics", fields: ["name", "description", "role"] },
  { title: "Eligibility & period", fields: ["startDate", "endDate", "eligibleCategories"] },
  { title: "Target & incentive", fields: ["targetValue", "incentivePoints"] },
  { title: "Review", fields: [] },
];

const toDateInput = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const fromDateInput = (value: string, endOfDay: boolean) => {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0).toISOString();
};

function defaults(scheme?: Scheme): SchemeFormValues {
  if (scheme) {
    return {
      name: scheme.name,
      description: scheme.description,
      role: scheme.role,
      startDate: toDateInput(scheme.startDate),
      endDate: toDateInput(scheme.endDate),
      eligibleCategories: scheme.eligibleCategories,
      targetValue: scheme.targetValue,
      incentivePoints: scheme.incentivePoints,
    };
  }
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + 30);
  return {
    name: "",
    description: "",
    role: "retailer",
    startDate: toDateInput(start.toISOString()),
    endDate: toDateInput(end.toISOString()),
    eligibleCategories: [],
    targetValue: 100000,
    incentivePoints: 2000,
  };
}

export function SchemeForm({ scheme }: { scheme?: Scheme }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const form = useForm<SchemeFormValues>({ resolver: zodResolver(schemeFormSchema), defaultValues: defaults(scheme), mode: "onTouched" });
  const { errors } = form.formState;
  const values = useWatch({ control: form.control }) as SchemeFormValues;
  const isRetailer = values.role === "retailer";

  const next = async () => {
    const ok = await form.trigger(STEPS[step].fields);
    if (ok) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const submit = form.handleSubmit((v) => {
    const input: SchemeInput = { ...v, startDate: fromDateInput(v.startDate, false), endDate: fromDateInput(v.endDate, true) };
    if (scheme) {
      const ok = runAction(() => updateScheme(scheme.id, input), "Scheme updated");
      if (ok.ok) router.push(`/schemes/${scheme.id}`);
    } else {
      const created = runAction(() => createScheme(input), (s) => `${s.name} saved as Draft`);
      if (created.ok) router.push(`/schemes/${created.value.id}`);
    }
  });

  return (
    <div>
      <Link href={scheme ? `/schemes/${scheme.id}` : "/schemes"} className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> {scheme ? scheme.name : "Schemes"}
      </Link>
      <PageHeader
        title={scheme ? "Edit scheme" : "Create scheme"}
        description="Configure a simple target-based scheme. Retailer schemes track approved invoice value; plumber campaigns count approved scans."
      />
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <ol className="flex gap-2 overflow-x-auto lg:flex-col" aria-label="Form steps">
          {STEPS.map((s, index) => (
            <li key={s.title}>
              <button
                type="button"
                onClick={async () => {
                  if (index <= step) return setStep(index);
                  for (let i = step; i < index; i++) {
                    if (!(await form.trigger(STEPS[i].fields))) return setStep(i);
                  }
                  setStep(index);
                }}
                aria-current={index === step ? "step" : undefined}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm whitespace-nowrap",
                  index === step ? "bg-card font-medium shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full text-xs",
                    index < step ? "bg-success text-white" : index === step ? "bg-primary text-white" : "bg-muted",
                  )}
                >
                  {index < step ? <Check className="size-3.5" /> : index + 1}
                </span>
                {s.title}
              </button>
            </li>
          ))}
        </ol>

        <form onSubmit={submit} noValidate>
          <SectionCard title={STEPS[step].title}>
            {step === 0 ? (
              <div className="grid gap-4">
                <Field label="Scheme name" htmlFor="sc-name" error={errors.name?.message}>
                  <Input id="sc-name" aria-invalid={Boolean(errors.name)} {...form.register("name")} placeholder="e.g. Diwali Dealer Dhamaka" />
                </Field>
                <Field label="Description" htmlFor="sc-desc" error={errors.description?.message}>
                  <Textarea id="sc-desc" rows={3} aria-invalid={Boolean(errors.description)} {...form.register("description")} />
                </Field>
                <Field label="Eligible user role" htmlFor="sc-role" hint="Retailer schemes use invoice value (₹). Plumber campaigns use approved scan count.">
                  <Controller
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <SimpleSelect
                        id="sc-role"
                        value={field.value}
                        onValueChange={(v) => {
                          field.onChange(v);
                          form.setValue("targetValue", v === "retailer" ? 100000 : 5);
                        }}
                        options={[
                          { value: "retailer", label: "Retailers – sales scheme" },
                          { value: "plumber", label: "Plumbers – installation campaign" },
                        ]}
                      />
                    )}
                  />
                </Field>
              </div>
            ) : null}

            {step === 1 ? (
              <div className="grid gap-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Start date" htmlFor="sc-start" error={errors.startDate?.message}>
                    <Input id="sc-start" type="date" aria-invalid={Boolean(errors.startDate)} {...form.register("startDate")} />
                  </Field>
                  <Field label="End date" htmlFor="sc-end" error={errors.endDate?.message}>
                    <Input id="sc-end" type="date" aria-invalid={Boolean(errors.endDate)} {...form.register("endDate")} />
                  </Field>
                </div>
                <fieldset>
                  <legend className="text-sm font-medium">Eligible product categories</legend>
                  <Controller
                    control={form.control}
                    name="eligibleCategories"
                    render={({ field }) => (
                      <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {PRODUCT_CATEGORIES.map((category) => {
                          const checked = field.value.includes(category);
                          return (
                            <label
                              key={category}
                              className={cn(
                                "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                                checked ? "border-primary bg-accent" : "border-border",
                              )}
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(c) => field.onChange(c ? [...field.value, category] : field.value.filter((x) => x !== category))}
                              />
                              {category}
                            </label>
                          );
                        })}
                      </div>
                    )}
                  />
                  {errors.eligibleCategories ? <p className="mt-2 text-xs text-destructive">{errors.eligibleCategories.message}</p> : null}
                </fieldset>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label={isRetailer ? "Target sales value (₹, pre-GST)" : "Target approved scans"}
                  htmlFor="sc-target"
                  error={errors.targetValue?.message}
                  hint={isRetailer ? "Sum of approved invoice lines in eligible categories" : "Count of approved scans in eligible categories"}
                >
                  <Input id="sc-target" type="number" min={1} aria-invalid={Boolean(errors.targetValue)} {...form.register("targetValue", { valueAsNumber: true })} />
                </Field>
                <Field label="Incentive points on achievement" htmlFor="sc-points" error={errors.incentivePoints?.message} hint="Credited once per participant when the target is reached">
                  <Input id="sc-points" type="number" min={1} aria-invalid={Boolean(errors.incentivePoints)} {...form.register("incentivePoints", { valueAsNumber: true })} />
                </Field>
              </div>
            ) : null}

            {step === 3 ? (
              <DetailGrid
                items={[
                  { label: "Name", value: values.name },
                  { label: "Role", value: <RoleBadge role={values.role} /> },
                  { label: "Description", value: values.description },
                  { label: "Period", value: `${values.startDate} → ${values.endDate}` },
                  { label: "Categories", value: values.eligibleCategories.join(", ") || "—" },
                  { label: "Target", value: isRetailer ? formatINR(values.targetValue || 0) : `${values.targetValue} approved scans` },
                  { label: "Incentive", value: formatPoints(values.incentivePoints || 0) },
                  { label: "Saved status", value: scheme ? scheme.status : "Draft – activate from the scheme page" },
                ]}
              />
            ) : null}

            <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
              <Button type="button" variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
                <ArrowLeft /> Back
              </Button>
              {step < STEPS.length - 1 ? (
                <Button key="continue" type="button" onClick={next}>
                  Continue <ArrowRight />
                </Button>
              ) : (
                // Distinct key so React never reuses the Continue element as a submit button mid-click.
                <Button key="submit" type="submit">
                  <Save /> {scheme ? "Save changes" : "Save as draft"}
                </Button>
              )}
            </div>
          </SectionCard>
        </form>
      </div>
    </div>
  );
}
