import { Boxes, FileText, Gift, LayoutDashboard, LifeBuoy, Megaphone, Package, PieChart, ScanLine, ScrollText, Settings, ShoppingCart, Store, Truck, Wallet, Wrench, type LucideIcon } from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  { title: "Overview", items: [{ title: "Dashboard", href: "/dashboard", icon: LayoutDashboard }] },
  {
    title: "Network",
    items: [
      { title: "Plumbers", href: "/plumbers", icon: Wrench },
      { title: "Retailers", href: "/retailers", icon: Store },
    ],
  },
  {
    title: "Products & Sales",
    items: [
      { title: "Product Catalogue", href: "/products", icon: Package },
      { title: "Orders", href: "/orders", icon: ShoppingCart },
      { title: "Inventory", href: "/inventory", icon: Boxes },
      { title: "Product Scans", href: "/scans", icon: ScanLine },
      { title: "Invoice Management", href: "/invoices", icon: FileText },
    ],
  },
  {
    title: "Rewards & Schemes",
    items: [
      { title: "Rewards Catalogue", href: "/rewards", icon: Gift },
      { title: "Redemptions", href: "/redemptions", icon: Truck },
      { title: "Points Ledger", href: "/ledger", icon: Wallet },
      { title: "Schemes", href: "/schemes", icon: Megaphone },
    ],
  },
  {
    title: "Operations",
    items: [
      { title: "Support Tickets", href: "/support", icon: LifeBuoy },
      { title: "Reports", href: "/reports", icon: PieChart },
    ],
  },
  {
    title: "Administration",
    items: [
      { title: "Settings", href: "/settings", icon: Settings },
      { title: "Audit Logs", href: "/audit-logs", icon: ScrollText },
    ],
  },
];

export const ALL_NAV_ITEMS = NAV_SECTIONS.flatMap((s) => s.items);

export const EXTRA_SEGMENT_LABELS: Record<string, string> = { new: "New scheme", edit: "Edit" };

