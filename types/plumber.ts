import type { ID, ISODate } from "./common";

export const PLUMBER_VERIFICATION_STATUSES = ["Verified", "Pending", "Rejected"] as const;
export type PlumberVerificationStatus = (typeof PLUMBER_VERIFICATION_STATUSES)[number];

export const ACCOUNT_STATUSES = ["Active", "Suspended", "Inactive"] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export interface Plumber {
  id: ID;
  name: string;
  mobile: string;
  email?: string;
  city: string;
  state: string;
  pincode: string;
  registeredAt: ISODate;
  verificationStatus: PlumberVerificationStatus;
  accountStatus: AccountStatus;
  /** Masked mock Aadhaar reference. No real Aadhaar data is stored. */
  aadhaarMasked: string;
  experienceYears: number;
  specialization: string;
  preferredRetailerId?: ID;
  verificationNote?: string;
}
