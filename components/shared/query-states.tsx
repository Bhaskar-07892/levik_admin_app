"use client";

import { RefreshCw, ServerCrash } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage, isApiError } from "@/lib/api/errors";
import { EmptyState } from "./empty-state";
import { NotFoundCard } from "./not-found-card";

export function DetailSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-9 w-72" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-xl" />
    </div>
  );
}

export function ErrorCard({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <EmptyState
        icon={ServerCrash}
        title="Could not load this page"
        description={errorMessage(error)}
        action={
          onRetry ? (
            <Button variant="outline" onClick={onRetry}>
              <RefreshCw /> Try again
            </Button>
          ) : undefined
        }
      />
    </div>
  );
}

/**
 * Renders loading / not-found / error states for a detail query, then `children(data)`.
 */
export function QueryBoundary<T>({
  query,
  entity,
  backHref,
  backLabel,
  children,
}: {
  query: { data?: T; error: unknown; isLoading: boolean; refetch: () => unknown };
  entity: string;
  backHref: string;
  backLabel: string;
  children: (data: T) => ReactNode;
}) {
  if (query.isLoading) return <DetailSkeleton />;
  if (query.error) {
    if (isApiError(query.error) && (query.error.status === 404 || query.error.status === 400))
      return <NotFoundCard entity={entity} backHref={backHref} backLabel={backLabel} />;
    return <ErrorCard error={query.error} onRetry={() => void query.refetch()} />;
  }
  if (query.data === undefined) return <DetailSkeleton />;
  return <>{children(query.data)}</>;
}
