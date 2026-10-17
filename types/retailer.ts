import type { ID, ISODate } from "./common";

export const RETAILER_VERIFICATION_STATUSES = ["Approved", "Pending", "Rejected"] as const;
export type RetailerVerificationStatus = (typeof RETAILER_VERIFICATION_STATUSES)[number];

export const RETAILER_ACCOUNT_STATUSES = ["Active", "Suspended"] as const;
export type RetailerAccountStatus = (typeof RETAILER_ACCOUNT_STATUSES)[number];

export interface Retailer {
  id: ID;
  shopName: string;
  ownerName: string;
  mobile: string;
  email?: string;
  address: string;
  city: string;
  state: string;
  gstin?: string;
  distributor: string;
  registeredAt: ISODate;
  verificationStatus: RetailerVerificationStatus;
  accountStatus: RetailerAccountStatus;
  /** Monthly sales target in INR. */
  monthlyTarget: number;
  rejectionReason?: string;
}
