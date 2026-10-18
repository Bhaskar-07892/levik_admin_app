"use client";

import { NotFoundCard } from "@/components/shared/not-found-card";
import { QueryBoundary } from "@/components/shared/query-states";
import { $api } from "@/lib/api/client";
import { SchemeForm } from "./scheme-form";

export function SchemeEdit({ id }: { id: string }) {
  const query = $api.useQuery("get", "/api/v1/admin/schemes/{id}", { params: { path: { id } } });
  return (
    <QueryBoundary query={query} entity="Scheme" backHref="/schemes" backLabel="Back to schemes">
      {(scheme) =>
        scheme.status === "Draft" || scheme.status === "Scheduled" ? (
          <SchemeForm scheme={scheme} />
        ) : (
          <NotFoundCard entity="Editable scheme" backHref={`/schemes/${id}`} backLabel="Back to scheme" />
        )
      }
    </QueryBoundary>
  );
}
