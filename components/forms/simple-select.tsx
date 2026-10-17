"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface Option {
  value: string;
  label: string;
}

/** Single-value select with labelled options, built on the shadcn/Base UI select. */
export function SimpleSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select…",
  className,
  id,
  ariaLabel,
  invalid,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  id?: string;
  ariaLabel?: string;
  invalid?: boolean;
}) {
  const items = Object.fromEntries(options.map((o) => [o.value, o.label]));
  return (
    <Select items={items} value={value || null} onValueChange={(v) => onValueChange((v as string | null) ?? "")}>
      <SelectTrigger id={id} aria-label={ariaLabel} aria-invalid={invalid} className={cn("h-9 w-full bg-card", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export const toOptions = (values: readonly string[], allLabel?: string): Option[] => [
  ...(allLabel ? [{ value: "all", label: allLabel }] : []),
  ...values.map((v) => ({ value: v, label: v })),
];
