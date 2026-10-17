"use client";

import { NotFoundCard } from "@/components/shared/not-found-card";
import { useDb } from "@/lib/mock-api/store";
import { SchemeForm } from "./scheme-form";

export function SchemeEdit({ id }: { id: string }) {
  const db = useDb();
  const scheme = db.schemes.find((s) => s.id === id);
  if (!scheme) return <NotFoundCard entity="Scheme" backHref="/schemes" backLabel="Back to schemes" />;
  if (scheme.status !== "Draft" && scheme.status !== "Scheduled") {
    return <NotFoundCard entity="Editable scheme" backHref={`/schemes/${id}`} backLabel="Back to scheme" />;
  }
  return <SchemeForm scheme={scheme} />;
}
