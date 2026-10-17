import type { ID, ISODate } from "./common";

/** Retailer-reported stock. Not live warehouse inventory. */
export interface InventoryItem {
  id: ID;
  retailerId: ID;
  productId: ID;
  quantity: number;
  updatedAt: ISODate;
  updatedBy: string;
}

export type StockStatus = "In Stock" | "Low Stock" | "Out of Stock";
