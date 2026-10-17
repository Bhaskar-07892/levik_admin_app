import { Info } from "lucide-react";
import type { ReactNode } from "react";

export function DemoNotice({ children }: { children: ReactNode }) {
  return (
    <div className="mb-5 flex items-start gap-2 rounded-lg border border-[#e7dcc6] bg-gold-soft px-3 py-2 text-xs text-[#6b5326]">
      <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <p>{children}</p>
    </div>
  );
}
