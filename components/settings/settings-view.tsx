"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { DatabaseBackup, RotateCcw, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Field } from "@/components/forms/field";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { DetailGrid, SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { DEMO_DATA_VERSION } from "@/lib/mock-data/seed";
import { resetDemoData, updateSettings } from "@/lib/mock-api/services";
import { useDb } from "@/lib/mock-api/store";
import { STORAGE_KEYS } from "@/lib/storage/browser-storage";
import { formatDateTime } from "@/lib/utils/format";
import { runAction } from "@/lib/utils/run-action";
import { settingsSchema, type SettingsValues } from "@/lib/validations";
import type { ProgrammeSettings } from "@/types";

const NOTIFICATION_LABELS: Record<keyof ProgrammeSettings["notifications"], { title: string; detail: string }> = {
  pendingScans: { title: "Pending product scans", detail: "Show scans awaiting verification in the notification menu" },
  pendingInvoices: { title: "Pending invoices", detail: "Show submitted and under-review invoices" },
  redemptions: { title: "Reward requests", detail: "Show redemptions awaiting approval" },
  lowStock: { title: "Low retailer stock", detail: "Show retailer stock lines at or below the threshold" },
};

export function SettingsView() {
  const db = useDb();
  const { settings } = db;
  const [resetOpen, setResetOpen] = useState(false);
  const form = useForm<SettingsValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      adminName: settings.adminName,
      programmeName: settings.programmeName,
      retailerPointsPer100: settings.retailerPointsPer100,
      lowStockThreshold: settings.lowStockThreshold,
    },
  });
  const { errors, isDirty } = form.formState;

  useEffect(() => {
    form.reset({
      adminName: settings.adminName,
      programmeName: settings.programmeName,
      retailerPointsPer100: settings.retailerPointsPer100,
      lowStockThreshold: settings.lowStockThreshold,
    });
  }, [settings.adminName, settings.programmeName, settings.retailerPointsPer100, settings.lowStockThreshold, form]);

  const submit = form.handleSubmit((values) => {
    runAction(() => updateSettings(values), "Settings saved");
  });

  return (
    <div>
      <PageHeader title="Settings" description="Lightweight programme configuration for the demo. Permission management and production integrations are out of scope for this MVP." />
      <form onSubmit={submit} noValidate className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Admin profile" description="Name shown in the top bar and on audit records">
          <div className="grid gap-4">
            <Field label="Display name" htmlFor="st-name" error={errors.adminName?.message}>
              <Input id="st-name" aria-invalid={Boolean(errors.adminName)} {...form.register("adminName")} />
            </Field>
            <Field label="Email" htmlFor="st-email" hint="Demo login email (read-only)">
              <Input id="st-email" value={settings.adminEmail} readOnly disabled />
            </Field>
            <Field label="Role" htmlFor="st-role" hint="Role management is a future feature">
              <Input id="st-role" value="Programme Administrator" readOnly disabled />
            </Field>
          </div>
        </SectionCard>
        <SectionCard title="Programme" description="Sample rules used by the mock transaction service">
          <div className="grid gap-4">
            <Field label="Programme display name" htmlFor="st-prog" error={errors.programmeName?.message}>
              <Input id="st-prog" aria-invalid={Boolean(errors.programmeName)} {...form.register("programmeName")} />
            </Field>
            <Field
              label="Retailer incentive points per ₹100 (eligible, pre-GST)"
              htmlFor="st-rate"
              error={errors.retailerPointsPer100?.message}
              hint="Applies to invoices approved after the change. Plumber scan points are set per product."
            >
              <Input id="st-rate" type="number" step={0.1} min={0} aria-invalid={Boolean(errors.retailerPointsPer100)} {...form.register("retailerPointsPer100", { valueAsNumber: true })} />
            </Field>
            <Field label="Low-stock threshold (units)" htmlFor="st-low" error={errors.lowStockThreshold?.message}>
              <Input id="st-low" type="number" min={0} aria-invalid={Boolean(errors.lowStockThreshold)} {...form.register("lowStockThreshold", { valueAsNumber: true })} />
            </Field>
          </div>
        </SectionCard>
        <div className="flex justify-end xl:col-span-2">
          <Button type="submit" disabled={!isDirty}>
            <Save /> Save settings
          </Button>
        </div>
      </form>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <SectionCard title="Notification preferences" description="Controls what appears in the top-bar notification menu (saved immediately)">
          <div className="divide-y divide-border">
            {(Object.keys(NOTIFICATION_LABELS) as Array<keyof ProgrammeSettings["notifications"]>).map((key) => (
              <label key={key} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <span>
                  <span className="block text-sm font-medium">{NOTIFICATION_LABELS[key].title}</span>
                  <span className="block text-xs text-muted-foreground">{NOTIFICATION_LABELS[key].detail}</span>
                </span>
                <Switch
                  checked={settings.notifications[key]}
                  onCheckedChange={(checked) => {
                    try {
                      updateSettings({ notifications: { ...settings.notifications, [key]: checked } });
                    } catch {
                      toast.error("Could not save the preference.");
                    }
                  }}
                />
              </label>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Demo data" description="All records live in this browser's localStorage">
          <DetailGrid
            items={[
              { label: "Demo data version", value: `v${DEMO_DATA_VERSION}` },
              { label: "Seeded", value: formatDateTime(db.seededAt) },
              { label: "Storage key", value: <span className="font-mono text-xs">{STORAGE_KEYS.database}</span> },
              {
                label: "Records",
                value: `${db.plumbers.length} plumbers · ${db.retailers.length} retailers · ${db.products.length} products · ${db.ledger.length} ledger entries`,
              },
            ]}
          />
          <div className="mt-5 rounded-lg border border-red-200 bg-red-50/60 p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-destructive">
              <DatabaseBackup className="size-4" /> Reset Demo Data
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Discards every change made in this browser (approvals, new products, schemes, settings, audit entries) and restores the original seed.
            </p>
            <Button variant="destructive" className="mt-3" onClick={() => setResetOpen(true)}>
              <RotateCcw /> Reset Demo Data
            </Button>
          </div>
        </SectionCard>
      </div>

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Reset all demo data?"
        description="This restores the original seed data and cannot be undone. You stay signed in."
        confirmLabel="Reset demo data"
        destructive
        onConfirm={() => runAction(() => resetDemoData(), "Demo data restored to the original seed")}
      />
    </div>
  );
}
