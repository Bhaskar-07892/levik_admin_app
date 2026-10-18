"use client";

import { useQuery } from "@tanstack/react-query";
import { ExternalLink, FileWarning } from "lucide-react";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchObjectUrl } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";

/** Shows an uploaded image or PDF (scan photo, invoice document). Uploads need the bearer token, so they are fetched as blobs. */
export function UploadedFile({ fileKey, alt }: { fileKey: string; alt: string }) {
  const { data, error, isLoading } = useQuery({
    queryKey: ["upload", fileKey],
    queryFn: () => fetchObjectUrl(`/api/v1/uploads/${encodeURIComponent(fileKey)}`),
    staleTime: Infinity,
    gcTime: 60_000,
  });

  useEffect(() => () => (data ? URL.revokeObjectURL(data.url) : undefined), [data]);

  if (isLoading) return <Skeleton className="h-64 w-full rounded-lg" />;
  if (error || !data)
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <FileWarning className="size-4" /> {errorMessage(error)}
      </p>
    );

  return (
    <div className="space-y-2">
      {data.type === "application/pdf" ? (
        <object data={data.url} type="application/pdf" className="h-[520px] w-full rounded-lg border border-border" aria-label={alt} />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- blob: URL, not optimisable by next/image
        <img src={data.url} alt={alt} className="max-h-[520px] w-full rounded-lg border border-border object-contain" />
      )}
      <a href={data.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
        <ExternalLink className="size-3.5" /> Open full size
      </a>
    </div>
  );
}
