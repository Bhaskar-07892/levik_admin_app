import type { ID, ISODate } from "./common";

export const PRODUCT_CATEGORIES = [
  "One-Piece Western WC",
  "Wall-Hung WC",
  "Floor-Mounted EWC",
  "Indian Pan",
  "Half-Pedestal Basin",
  "Pedestal Basin",
  "Wall-Hung Basin",
  "Countertop Basin",
  "Urinal",
  "Cistern",
  "Kitchen Sink",
] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export interface Product {
  id: ID;
  name: string;
  modelCode: string;
  category: ProductCategory;
  description: string;
  /** Only populated when published in the Levik catalogue. */
  dimensions?: string;
  features: string[];
  image?: string;
  sku: string;
  barcode: string;
  /** Demo MRP in INR, used for invoice values. Not an official price list. */
  mrp: number;
  /** Points a plumber earns for an approved scan (sample value). */
  plumberPoints: number;
  isActive: boolean;
  rewardEligible: boolean;
  createdAt: ISODate;
  updatedAt: ISODate;
}
