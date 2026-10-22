import type { AuditLog } from "./audit";
import type { InventoryItem } from "./inventory";
import type { Invoice } from "./invoice";
import type { Plumber } from "./plumber";
import type { Product } from "./product";
import type { Retailer } from "./retailer";
import type { Redemption, Reward } from "./reward";
import type { Scheme } from "./scheme";
import type { ProgrammeSettings } from "./settings";
import type { SupportTicket } from "./support";
import type { PointsTransaction, ProductScan } from "./transaction";

export * from "./audit";
export * from "./common";
export * from "./inventory";
export * from "./invoice";
export * from "./plumber";
export * from "./product";
export * from "./retailer";
export * from "./reward";
export * from "./scheme";
export * from "./settings";
export * from "./support";
export * from "./transaction";

export interface Database {
  version: number;
  seededAt: string;
  settings: ProgrammeSettings;
  plumbers: Plumber[];
  retailers: Retailer[];
  products: Product[];
  scans: ProductScan[];
  invoices: Invoice[];
  rewards: Reward[];
  redemptions: Redemption[];
  schemes: Scheme[];
  inventory: InventoryItem[];
  ledger: PointsTransaction[];
  tickets: SupportTicket[];
  auditLogs: AuditLog[];
  /** Per-prefix sequence counters for new record identifiers. */
  counters: Record<string, number>;
}
export * from "./order";
