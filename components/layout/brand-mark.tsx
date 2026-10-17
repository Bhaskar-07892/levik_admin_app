import { cn } from "@/lib/utils";

/** Text lock-up approximating the Levik Luxury wordmark (leaves cupped by a hand inside a crescent). */
export function BrandMark({ className, tone = "light" }: { className?: string; tone?: "light" | "dark" }) {
  const color = tone === "light" ? "text-white" : "text-brand-deep";
  return (
    <div className={cn("flex items-center gap-2.5", color, className)}>
      <svg viewBox="0 0 40 40" className="size-9 shrink-0" aria-hidden>
        <path d="M30 6a16 16 0 1 0 4 22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M20 10c3 3 3 8 0 11-3-3-3-8 0-11Z" fill="currentColor" />
        <path d="M12 15c4 0 7 3 7.5 7-4 0-7-3-7.5-7Z" fill="currentColor" opacity=".85" />
        <path d="M28 15c-4 0-7 3-7.5 7 4 0 7-3 7.5-7Z" fill="currentColor" opacity=".85" />
        <path d="M10 25c3 2.5 6.5 3.5 10 3.5s7-1 10-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <div className="leading-none">
        <p className="font-serif text-xl tracking-[0.12em]">LEVIK</p>
        <p className="mt-1 text-[9px] font-medium tracking-[0.42em] opacity-75">LUXURY</p>
      </div>
    </div>
  );
}
