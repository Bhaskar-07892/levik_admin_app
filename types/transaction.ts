import type { ID, ISODate, StatusEvent, UserRole } from "./common";

export const SCAN_STATUSES = ["Pending", "Approved", "Rejected", "Flagged"] as const;
export type ScanStatus = (typeof SCAN_STATUSES)[number];

export interface ProductScan {
  id: ID;
  plumberId: ID;
  productId: ID;
  /** Serial code printed on the product label, as submitted by the plumber. */
  submittedCode: string;
  scannedAt: ISODate;
  retailerId?: ID;
  invoiceNumber?: string;
  siteLocation: string;
  status: ScanStatus;
  awardedPoints?: number;
  ledgerTxnId?: ID;
  rejectionReason?: string;
  flagReason?: string;
  reviewedBy?: string;
  reviewedAt?: ISODate;
  history: StatusEvent[];
}

export const POINTS_SOURCES = [
  "Product Scan",
  "Invoice Incentive",
  "Scheme Bonus",
  "Redemption",
  "Redemption Reversal",
  "Manual Adjustment",
  "Opening Balance",
] as const;
export type PointsSource = (typeof POINTS_SOURCES)[number];

export type RelatedEntityType = "scan" | "invoice" | "redemption" | "scheme";

export interface PointsTransaction {
  id: ID;
  userId: ID;
  userRole: UserRole;
  source: PointsSource;
  related?: { type: RelatedEntityType; id: ID };
  credit: number;
  debit: number;
  createdAt: ISODate;
  status: "Posted";
  note: string;
  createdBy: string;
}
