"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { PlugZap, Save } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Field } from "@/components/forms/field";
import { PageHeader } from "@/components/shared/page-header";
import { DetailSkeleton, ErrorCard } from "@/components/shared/query-states";
import { DetailGrid, SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { API_URL, updateSessionUser } from "@/lib/api/auth";
import { $api, api, call, refreshAfterMutation } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { useAdminProfile, useSettings } from "@/lib/api/hooks";
import type { AdminProfile, SettingsDto } from "@/lib/api/types";
import { formatDateTime } from "@/lib/utils/format";
import { runAction } from "@/lib/utils/run-action";
import { settingsSchema, type SettingsValues } from "@/lib/validations";

type NotificationKey = keyof SettingsDto["notifications"];

const NOTIFICATION_LABELS: Record<NotificationKey, { title: string; detail: string }> = {
  pendingScans: { title: "Pending product scans", detail: "Show scans awaiting verification in the notification menu" },
  pendingInvoices: { title: "Pending invoices", detail: "Show submitted and under-review invoices" },
  redemptions: { title: "Reward requests", detail: "Show redemptions awaiting approval" },
  lowStock: { title: "Low retailer stock", detail: "Show retailer stock lines at or below the threshold" },
};

const toValues = (settings: SettingsDto, profile: AdminProfile): SettingsValues => ({
  adminName: profile.name,
  programmeName: settings.programmeName,
  retailerPointsPer100: settings.retailerPointsPer100,
  lowStockThreshold: settings.lowStockThreshold,
  maxDailyScansPerPlumber: settings.maxDailyScansPerPlumber,
});

export function SettingsView() {
  const settings = useSettings();
  const profile = useAdminProfile();
  if (settings.error || profile.error) return <ErrorCard error={settings.error ?? profile.error} onRetry={() => void Promise.all([settings.refetch(), profile.refetch()])} />;
  if (!settings.data || !profile.data) return <DetailSkeleton />;
  return <SettingsForm settings={settings.data} profile={profile.data} />;
}

function SettingsForm({ settings, profile }: { settings: SettingsDto; profile: AdminProfile }) {
  const form = useForm<SettingsValues>({ resolver: zodResolver(settingsSchema), defaultValues: toValues(settings, profile) });
  const { errors, isDirty, isSubmitting } = form.formState;
  const health = $api.useQuery("get", "/api/v1/health/ready", {}, { retry: false, refetchInterval: 30_000 });

  useEffect(() => {
    form.reset(toValues(settings, profile));
  }, [settings, profile, form]);

  const submit = form.handleSubmit(async ({ adminName, ...programme }) => {
    await runAction(async () => {
      if (adminName !== profile.name) {
        const updated = await call(api.PATCH("/api/v1/admin/me", { body: { name: adminName } }));
        updateSessionUser({ name: updated.name });
      }
      return call(api.PATCH("/api/v1/admin/settings", { body: programme }));
    }, "Settings saved");
  });

  const toggleNotification = async (key: NotificationKey, checked: boolean) => {
    try {
      await call(api.PATCH("/api/v1/admin/settings", { body: { notifications: { ...settings.notifications, [key]: checked } } }));
      await refreshAfterMutation();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <div>
      <PageHeader title="Settings" description="Programme configuration. Changes apply immediately to the admin portal and the mobile app, and are recorded in the audit log." />
      <form onSubmit={submit} noValidate className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Admin profile" description="Name shown in the top bar and on audit records">
          <div className="grid gap-4">
            <Field label="Display name" htmlFor="st-name" error={errors.adminName?.message}>
              <Input id="st-name" aria-invalid={Boolean(errors.adminName)} {...form.register("adminName")} />
            </Field>
            <Field label="Email" htmlFor="st-email" hint="Sign-in email (read-only)">
              <Input id="st-email" value={profile.email} readOnly disabled />
            </Field>
            <Field label="Role" htmlFor="st-role" hint={profile.lastLoginAt ? `Last sign-in ${formatDateTime(profile.lastLoginAt)}` : undefined}>
              <Input id="st-role" value={profile.role} readOnly disabled />
            </Field>
          </div>
        </SectionCard>
        <SectionCard title="Programme" description="Rules applied by the API when approving scans and invoices">
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
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Low-stock threshold (units)" htmlFor="st-low" error={errors.lowStockThreshold?.message}>
                <Input id="st-low" type="number" min={0} aria-invalid={Boolean(errors.lowStockThreshold)} {...form.register("lowStockThreshold", { valueAsNumber: true })} />
              </Field>
              <Field label="Max scans per plumber per day" htmlFor="st-scans" error={errors.maxDailyScansPerPlumber?.message} hint="Fraud guard for the mobile app">
                <Input
                  id="st-scans"
                  type="number"
                  min={1}
                  aria-invalid={Boolean(errors.maxDailyScansPerPlumber)}
                  {...form.register("maxDailyScansPerPlumber", { valueAsNumber: true })}
                />
              </Field>
            </div>
          </div>
        </SectionCard>
        <div className="flex justify-end xl:col-span-2">
          <Button type="submit" disabled={!isDirty || isSubmitting}>
            <Save /> Save settings
          </Button>
        </div>
      </form>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <SectionCard title="Notification preferences" description="Controls what appears in the top-bar notification menu (saved immediately)">
          <div className="divide-y divide-border">
            {(Object.keys(NOTIFICATION_LABELS) as NotificationKey[]).map((key) => (
              <label key={key} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <span>
                  <span className="block text-sm font-medium">{NOTIFICATION_LABELS[key].title}</span>
                  <span className="block text-xs text-muted-foreground">{NOTIFICATION_LABELS[key].detail}</span>
                </span>
                <Switch checked={settings.notifications[key]} onCheckedChange={(checked) => void toggleNotification(key, checked)} />
              </label>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="API connection" description="The portal reads and writes all programme data through the Levik API">
          <DetailGrid
            items={[
              { label: "API endpoint", value: <span className="font-mono text-xs break-all">{API_URL}/api/v1</span> },
              {
                label: "Status",
                value: health.isLoading ? (
                  "Checking…"
                ) : health.error ? (
                  <StatusBadge status="Unavailable" tone="danger" />
                ) : (
                  <span className="flex items-center gap-1.5">
                    <PlugZap className="size-4 text-success" /> <StatusBadge status="Connected" tone="success" />
                  </span>
                ),
              },
              { label: "Settings last changed", value: formatDateTime(settings.updatedAt) },
              { label: "Signed in as", value: profile.email },
            ]}
          />
        </SectionCard>
      </div>
    </div>
  );
}
