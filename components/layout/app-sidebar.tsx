"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { NAV_SECTIONS } from "@/lib/navigation";
import { useNotifications, useSettings } from "@/lib/api/hooks";
import { cn } from "@/lib/utils";
import { BrandMark } from "./brand-mark";

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { data: settings } = useSettings();
  const { data: notifications } = useNotifications();
  const counts = notifications?.counts;
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const badges: Record<string, number | undefined> = {
    "/scans": counts?.pendingScans,
    "/invoices": counts?.pendingInvoices,
    "/redemptions": counts?.requestedRedemptions,
    "/retailers": counts?.pendingRetailers,
    "/support": counts?.openTickets,
  };

  return (
    <nav aria-label="Main navigation" className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="border-b border-sidebar-border px-5 py-5">
        <BrandMark />
        <p className="mt-3 text-[11px] font-medium tracking-wide text-sidebar-foreground/70 uppercase">{settings?.programmeName ?? "Levik Rewards Programme"}</p>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
        {NAV_SECTIONS.map((section) => {
          const isCollapsed = collapsed[section.title];
          const sectionId = `nav-${section.title.replace(/\W+/g, "-").toLowerCase()}`;
          return (
            <div key={section.title}>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded px-2 py-1 text-[11px] font-semibold tracking-wider text-sidebar-foreground/60 uppercase hover:text-white"
                aria-expanded={!isCollapsed}
                aria-controls={sectionId}
                onClick={() => setCollapsed((prev) => ({ ...prev, [section.title]: !prev[section.title] }))}
              >
                {section.title}
                <ChevronDown className={cn("size-3.5 transition-transform", isCollapsed && "-rotate-90")} />
              </button>
              {!isCollapsed ? (
                <ul id={sectionId} className="mt-1 space-y-0.5">
                  {section.items.map((item) => {
                    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    const badge = badges[item.href];
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={onNavigate}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none",
                            active
                              ? "bg-sidebar-accent font-medium text-white shadow-[inset_2px_0_0_var(--gold)]"
                              : "text-sidebar-foreground/85 hover:bg-white/5 hover:text-white",
                          )}
                        >
                          <item.icon className={cn("size-4 shrink-0", active ? "text-[#e2cc9f]" : "text-sidebar-foreground/60 group-hover:text-white")} />
                          <span className="flex-1 truncate">{item.title}</span>
                          {badge ? (
                            <span className="rounded-full bg-[#e2cc9f] px-1.5 text-[10px] font-semibold text-brand-deep tabular-nums">{badge}</span>
                          ) : null}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="border-t border-sidebar-border px-5 py-3 text-[11px] text-sidebar-foreground/60">Connected to Levik API</div>
    </nav>
  );
}
