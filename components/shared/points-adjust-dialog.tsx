"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/forms/field";
import { SimpleSelect } from "@/components/forms/simple-select";
import { api, call } from "@/lib/api/client";
import { runAction } from "@/lib/utils/run-action";
import { formatNumber } from "@/lib/utils/format";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  available: number;
}

export function PointsAdjustDialog(props: Props) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-md">{props.open ? <AdjustForm {...props} /> : null}</DialogContent>
    </Dialog>
  );
}

function AdjustForm({ onOpenChange, userId, userName, available }: Props) {
  const [direction, setDirection] = useState("credit");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<{ amount?: string; reason?: string }>({});

  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = Number(amount);
    const next: typeof errors = {};
    if (!Number.isInteger(value) || value <= 0) next.amount = "Enter a whole number greater than zero.";
    if (reason.trim().length < 5) next.reason = "A reason of at least 5 characters is required for the audit trail.";
    setErrors(next);
    if (Object.keys(next).length) return;
    const signed = direction === "credit" ? value : -value;
    setSubmitting(true);
    const result = await runAction(
      () => call(api.POST("/api/v1/admin/points/adjustments", { body: { userId, amount: signed, reason: reason.trim() } })),
      `${formatNumber(value)} points ${direction === "credit" ? "credited to" : "debited from"} ${userName}`,
    );
    setSubmitting(false);
    if (result.ok) onOpenChange(false);
  };

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>Adjust points</DialogTitle>
        <DialogDescription>
          Manual adjustment for {userName}. Current available balance: {formatNumber(available)} pts. A ledger entry and audit record are created.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Type" htmlFor="adj-type">
          <SimpleSelect
            id="adj-type"
            value={direction}
            onValueChange={setDirection}
            options={[
              { value: "credit", label: "Credit (+)" },
              { value: "debit", label: "Debit (−)" },
            ]}
          />
        </Field>
        <Field label="Points" htmlFor="adj-amount" error={errors.amount}>
          <Input id="adj-amount" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} aria-invalid={Boolean(errors.amount)} />
        </Field>
      </div>
      <Field label="Reason" htmlFor="adj-reason" error={errors.reason}>
        <Textarea id="adj-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} aria-invalid={Boolean(errors.reason)} placeholder="e.g. Goodwill credit for delayed verification" />
      </Field>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>Post adjustment</Button>
      </DialogFooter>
    </form>
  );
}
