"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { reasonSchema, type ReasonValues } from "@/lib/validations";

/** Dialog that requires a written reason before a consequential action. */
export function ReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  label = "Reason",
  placeholder,
  confirmLabel,
  destructive,
  onSubmit,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  label?: string;
  placeholder?: string;
  confirmLabel: string;
  destructive?: boolean;
  /** Return true to close the dialog. */
  onSubmit: (reason: string) => boolean;
  children?: ReactNode;
}) {
  const form = useForm<ReasonValues>({ resolver: zodResolver(reasonSchema), defaultValues: { reason: "" } });

  useEffect(() => {
    if (open) form.reset({ reason: "" });
  }, [open, form]);

  const submit = form.handleSubmit((values) => {
    if (onSubmit(values.reason)) onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {children}
          <div className="grid gap-1.5">
            <Label htmlFor="reason-input">{label}</Label>
            <Textarea
              id="reason-input"
              rows={3}
              placeholder={placeholder}
              aria-invalid={Boolean(form.formState.errors.reason)}
              {...form.register("reason")}
            />
            {form.formState.errors.reason ? (
              <p className="text-xs text-destructive">{form.formState.errors.reason.message}</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant={destructive ? "destructive" : "default"}>
              {confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
