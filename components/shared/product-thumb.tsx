import Image from "next/image";
import { Bath } from "lucide-react";
import { API_URL } from "@/lib/api/auth";
import { cn } from "@/lib/utils";

/**
 * A product's imageUrl is one of:
 * - a catalogue photo served by this portal ("/images/products/1012.jpg") → next/image;
 * - a signed link to an uploaded image, relative to the API ("/api/v1/files/…") → plain <img> on the API origin;
 * - an absolute http(s) URL → plain <img> (next/image would need every host listed in next.config).
 * Anything else falls back to the placeholder instead of throwing and taking the page down.
 */
function resolveImage(src?: string): { optimise: boolean; url: string } | null {
  if (!src) return null;
  if (src.startsWith("/api/")) return { optimise: false, url: `${API_URL}${src}` };
  if (src.startsWith("/")) return { optimise: true, url: src };
  if (/^https?:\/\//i.test(src)) return { optimise: false, url: src };
  return null;
}

export function ProductThumb({ src, alt, className, sizes = "64px" }: { src?: string; alt: string; className?: string; sizes?: string }) {
  const image = resolveImage(src);
  return (
    <div className={cn("relative overflow-hidden rounded-lg bg-gradient-to-br from-[#4a7aa3] to-[#23496d]", className)}>
      {image?.optimise ? (
        <Image src={image.url} alt={alt} fill sizes={sizes} className="object-cover" />
      ) : image ? (
        // eslint-disable-next-line @next/next/no-img-element -- signed API link or external URL; see resolveImage
        <img src={image.url} alt={alt} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-white/85">
          <Bath className="size-1/3 max-h-10 max-w-10" aria-hidden />
          <span className="sr-only">No image available</span>
        </div>
      )}
    </div>
  );
}
