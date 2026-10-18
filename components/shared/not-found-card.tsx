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
        description={`No ${entity.toLowerCase()} exists with this reference. Check the link or search for it again.`}
        action={
          <Link href={backHref} className={buttonVariants({ variant: "outline" })}>
            {backLabel}
          </Link>
        }
      />
    </div>
  );
}
