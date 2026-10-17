import type { ID, ISODate, UserRole } from "./common";
import type { ProductCategory } from "./product";

export const SCHEME_STATUSES = ["Draft", "Scheduled", "Active", "Completed", "Paused"] as const;
export type SchemeStatus = (typeof SCHEME_STATUSES)[number];

/** Retailer schemes measure approved invoice value; plumber campaigns count approved scans. */
export type SchemeTargetType = "Sales Amount" | "Approved Scans";

export interface Scheme {
  id: ID;
  name: string;
  description: string;
  role: UserRole;
  startDate: ISODate;
  endDate: ISODate;
  eligibleCategories: ProductCategory[];
  targetType: SchemeTargetType;
  targetValue: number;
  incentivePoints: number;
  status: SchemeStatus;
  awardedUserIds: ID[];
  createdAt: ISODate;
  updatedAt: ISODate;
}
