import { ImageOff } from "lucide-react";
import { API_URL } from "@/lib/api/auth";
import { cn } from "@/lib/utils";

/**
 * A profile or shop photo from the API. `url` is a signed link (photoUrl, shopPhotoUrl) relative to the API
 * origin; it needs no bearer token, so a plain <img> can load it (and the browser caches it).
 */
export function SignedPhoto({ url, alt, className, emptyLabel = "No photo yet" }: { url?: string; alt: string; className?: string; emptyLabel?: string }) {
  if (!url) {
    return (
      <div className={cn("flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-muted/40 text-xs text-muted-foreground", className)}>
        <ImageOff className="size-5" />
        {emptyLabel}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- signed API link that changes daily; next/image would proxy and re-cache it
    <img src={`${API_URL}${url}`} alt={alt} loading="lazy" className={cn("rounded-lg border border-border object-cover", className)} />
  );
}
