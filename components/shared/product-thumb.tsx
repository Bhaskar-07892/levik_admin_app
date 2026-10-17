import Image from "next/image";
import { Bath } from "lucide-react";
import { cn } from "@/lib/utils";

export function ProductThumb({ src, alt, className, sizes = "64px" }: { src?: string; alt: string; className?: string; sizes?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-lg bg-gradient-to-br from-[#4a7aa3] to-[#23496d]", className)}>
      {src ? (
        <Image src={src} alt={alt} fill sizes={sizes} className="object-cover" />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-white/85">
          <Bath className="size-1/3 max-h-10 max-w-10" aria-hidden />
          <span className="sr-only">No image available</span>
        </div>
      )}
    </div>
  );
}
