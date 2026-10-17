import { SearchX } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "./empty-state";

export function NotFoundCard({ entity, backHref, backLabel }: { entity: string; backHref: string; backLabel: string }) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <EmptyState
        icon={SearchX}
        title={`${entity} not found`}
        description={`This ${entity.toLowerCase()} does not exist in the current demo data. It may have been removed by a data reset.`}
        action={
          <Link href={backHref} className={buttonVariants({ variant: "outline" })}>
            {backLabel}
          </Link>
        }
      />
    </div>
  );
}
