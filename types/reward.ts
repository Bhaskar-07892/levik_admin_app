import type { ID, ISODate, StatusEvent, UserRole } from "./common";

export const REWARD_CATEGORIES = [
  "Shopping Voucher",
  "Gift Card",
  "Air Conditioner",
  "Refrigerator",
  "Television",
  "Home Appliance",
  "Tools & Equipment",
  "Other",
] as const;
export type RewardCategory = (typeof REWARD_CATEGORIES)[number];
export type RewardType = "Digital" | "Physical";

export interface Reward {
  id: ID;
  name: string;
  category: RewardCategory;
  type: RewardType;
  description: string;
  pointsRequired: number;
  stock: number;
  isActive: boolean;
  eligibleRoles: UserRole[];
  createdAt: ISODate;
  updatedAt: ISODate;
}

export const REDEMPTION_STATUSES = [
  "Requested",
  "Approved",
  "Processing",
  "Dispatched",
  "Delivered",
  "Cancelled",
  "Failed",
] as const;
export type RedemptionStatus = (typeof REDEMPTION_STATUSES)[number];

export interface Redemption {
  id: ID;
  userId: ID;
  userRole: UserRole;
  rewardId: ID;
  pointsCost: number;
  requestedAt: ISODate;
  status: RedemptionStatus;
  deliveryAddress: string;
  debitTxnId?: ID;
  reversalTxnId?: ID;
  fulfilmentRef?: string;
  voucherCode?: string;
  courierName?: string;
  trackingNumber?: string;
  cancelReason?: string;
  history: StatusEvent[];
}
