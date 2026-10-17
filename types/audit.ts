import type { ID, ISODate } from "./common";

export type AuditEntityType =
  | "Product"
  | "Plumber"
  | "Retailer"
  | "Scan"
  | "Invoice"
  | "Points"
  | "Reward"
  | "Redemption"
  | "Scheme"
  | "Inventory"
  | "Support"
  | "Settings"
  | "Session";

export interface AuditLog {
  id: ID;
  at: ISODate;
  admin: string;
  action: string;
  entityType: AuditEntityType;
  entityId: ID;
  summary: string;
}
