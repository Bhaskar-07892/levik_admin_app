import { Trophy } from "lucide-react";
import type { SchemeImpact } from "@/lib/mock-api/rules";
import { formatINR, formatPoints } from "@/lib/utils/format";
import { ProgressBar } from "./progress-bar";

export function SchemeImpactList({ impacts }: { impacts: SchemeImpact[] }) {
  if (impacts.length === 0) return <p className="text-sm text-muted-foreground">This transaction does not count towards any live scheme.</p>;
  const fmt = (impact: SchemeImpact, v: number) => (impact.scheme.targetType === "Sales Amount" ? formatINR(v) : `${v} scans`);
  return (
    <ul className="space-y-4">
      {impacts.map((impact) => {
        const pct = Math.min(100, Math.round((impact.after / impact.scheme.targetValue) * 100));
        return (
          <li key={impact.scheme.id}>
            <div className="flex items-start justify-between gap-2 text-sm">
              <span className="font-medium">{impact.scheme.name}</span>
              <span className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">
                {fmt(impact, impact.before)} → {fmt(impact, impact.after)} / {fmt(impact, impact.scheme.targetValue)}
              </span>
            </div>
            <ProgressBar value={pct} className="mt-1.5" tone={impact.willAward || impact.alreadyAwarded ? "gold" : undefined} />
            {impact.willAward ? (
              <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-[#8a6a2f]">
                <Trophy className="size-3.5" /> Approving reaches the target: +{formatPoints(impact.scheme.incentivePoints)} scheme bonus (credited once)
              </p>
            ) : impact.alreadyAwarded ? (
              <p className="mt-1.5 text-xs text-muted-foreground">Scheme bonus already credited to this participant.</p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
