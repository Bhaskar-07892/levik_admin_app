"use client";

import { Bell, ChevronRight, LogOut, Menu, Settings, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ALL_NAV_ITEMS, EXTRA_SEGMENT_LABELS } from "@/lib/navigation";
import { recordSessionEvent } from "@/lib/mock-api/services";
import { useDb } from "@/lib/mock-api/store";
import { signOut } from "@/lib/storage/session";
import { initials } from "@/lib/utils/format";
import { AppSidebar } from "./app-sidebar";
import { GlobalSearch } from "./global-search";

function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const crumbs = segments.map((segment, index) => {
    const href = `/${segments.slice(0, index + 1).join("/")}`;
    const nav = ALL_NAV_ITEMS.find((item) => item.href === href);
    return { href, label: nav?.title ?? EXTRA_SEGMENT_LABELS[segment] ?? decodeURIComponent(segment) };
  });
  return (
    <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1 text-sm text-muted-foreground md:flex">
      <Link href="/dashboard" className="hover:text-foreground">
        Admin
      </Link>
      {crumbs.map((crumb, index) => (
        <span key={crumb.href} className="flex min-w-0 items-center gap-1">
          <ChevronRight className="size-3.5 shrink-0" aria-hidden />
          {index === crumbs.length - 1 ? (
            <span aria-current="page" className="truncate font-medium text-foreground">
              {crumb.label}
            </span>
          ) : (
            <Link href={crumb.href} className="truncate hover:text-foreground">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}

function Notifications() {
  const db = useDb();
  const router = useRouter();
  const prefs = db.settings.notifications;
  const items = useMemo(() => {
    const list: Array<{ id: string; title: string; detail: string; href: string }> = [];
    const pendingScans = db.scans.filter((s) => s.status === "Pending").length;
    const pendingInvoices = db.invoices.filter((i) => i.status === "Submitted" || i.status === "Under Review").length;
    const requested = db.redemptions.filter((r) => r.status === "Requested").length;
    const lowStock = db.inventory.filter((i) => i.quantity <= db.settings.lowStockThreshold).length;
    const pendingRetailers = db.retailers.filter((r) => r.verificationStatus === "Pending").length;
    if (prefs.pendingScans && pendingScans)
      list.push({ id: "scans", title: `${pendingScans} product scans awaiting verification`, detail: "Review proof of sale before crediting points", href: "/scans" });
    if (prefs.pendingInvoices && pendingInvoices)
      list.push({ id: "invoices", title: `${pendingInvoices} invoices pending review`, detail: "Approve to credit retailer incentives", href: "/invoices" });
    if (prefs.redemptions && requested)
      list.push({ id: "redemptions", title: `${requested} reward requests to process`, detail: "Validate balance and stock", href: "/redemptions" });
    if (pendingRetailers)
      list.push({ id: "retailers", title: `${pendingRetailers} retailer applications pending`, detail: "Approve or reject new shops", href: "/retailers" });
    if (prefs.lowStock && lowStock)
      list.push({ id: "stock", title: `${lowStock} retailer stock lines low or out`, detail: "Retailer-reported inventory", href: "/inventory" });
    return list;
  }, [db, prefs]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="relative" aria-label={`Notifications (${items.length})`} />}>
        <Bell className="size-4.5" />
        {items.length ? (
          <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-semibold text-white">
            {items.length}
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Action items</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">You&apos;re all caught up.</p>
        ) : (
          items.map((item) => (
            <DropdownMenuItem key={item.id} onClick={() => router.push(item.href)} className="flex-col items-start gap-0.5 py-2">
              <span className="text-sm font-medium">{item.title}</span>
              <span className="text-xs text-muted-foreground">{item.detail}</span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ProfileMenu() {
  const db = useDb();
  const router = useRouter();
  const logout = () => {
    recordSessionEvent("Admin signed out");
    signOut();
    router.replace("/login");
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<button type="button" className="flex items-center gap-2.5 rounded-lg px-1.5 py-1 text-left hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none" />}
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">{initials(db.settings.adminName)}</span>
        <span className="hidden leading-tight lg:block">
          <span className="block text-sm font-medium text-foreground">{db.settings.adminName}</span>
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <ShieldCheck className="size-3 text-gold" /> Programme Administrator
          </span>
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <span className="block text-sm font-medium text-foreground">{db.settings.adminName}</span>
            <span className="block text-xs">{db.settings.adminEmail}</span>
            <span className="mt-1 inline-block rounded bg-gold-soft px-1.5 py-0.5 text-[10px] font-semibold text-[#7a5f2c] uppercase">Role: Programme Admin</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/settings")}>
          <Settings /> Settings
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={logout}>
          <LogOut /> Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Topbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur supports-backdrop-filter:bg-card/80">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
          <Menu className="size-5" />
        </Button>
        <div className="flex min-w-0 flex-1 items-center gap-6">
          <GlobalSearch />
          <div className="hidden min-w-0 xl:block">
            <Breadcrumbs />
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Notifications />
          <ProfileMenu />
        </div>
      </div>
      <div className="hidden border-t border-border px-6 py-2 md:block xl:hidden">
        <Breadcrumbs />
      </div>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 border-0 p-0" showCloseButton={false}>
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <AppSidebar onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
    </header>
  );
}
