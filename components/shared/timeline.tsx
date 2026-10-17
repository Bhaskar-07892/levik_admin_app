import type { StatusEvent } from "@/types";
import { formatDateTime } from "@/lib/utils/format";

export function Timeline({ events }: { events: StatusEvent[] }) {
  return (
    <ol className="relative space-y-4 border-l border-border pl-5">
      {events.map((event, index) => (
        <li key={`${event.at}-${index}`} className="relative">
          <span className="absolute top-1.5 -left-[25px] size-2.5 rounded-full border-2 border-card bg-brand-slate ring-1 ring-border" />
          <p className="text-sm font-medium text-foreground">{event.action}</p>
          <p className="text-xs text-muted-foreground">
            {formatDateTime(event.at)} · {event.by}
          </p>
          {event.note ? <p className="mt-1 text-sm text-muted-foreground">{event.note}</p> : null}
        </li>
      ))}
    </ol>
  );
}
