import { CircleAlert, CircleCheck, CircleX } from "lucide-react";
import type { CheckDto } from "@/lib/api/types";

export function ChecksList({ checks }: { checks: CheckDto[] }) {
  return (
    <ul className="space-y-3">
      {checks.map((check) => {
        const Icon = check.passed ? CircleCheck : check.blocking ? CircleX : CircleAlert;
        const color = check.passed ? "text-success" : check.blocking ? "text-destructive" : "text-warning";
        return (
          <li key={check.label} className="flex gap-3">
            <Icon className={`mt-0.5 size-4 shrink-0 ${color}`} aria-hidden />
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                {check.label}
                <span className="sr-only">{check.passed ? " – passed" : check.blocking ? " – failed" : " – warning"}</span>
              </p>
              <p className="text-xs text-muted-foreground">{check.detail}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
