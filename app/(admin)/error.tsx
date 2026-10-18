"use client";

import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-3 py-20 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-red-50 text-destructive">
        <TriangleAlert className="size-5" />
      </div>
      <h1 className="text-lg font-semibold">This page could not be displayed</h1>
      <p className="text-sm text-muted-foreground">{error.message || "An unexpected error occurred."}</p>
      <p className="text-xs text-muted-foreground">If this keeps happening, check that the Levik API is reachable (Settings → API connection).</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
