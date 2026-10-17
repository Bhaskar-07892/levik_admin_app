export interface ProgrammeSettings {
  programmeName: string;
  adminName: string;
  adminEmail: string;
  /** Retailer incentive points earned per ₹100 of eligible approved invoice value (sample rule). */
  retailerPointsPer100: number;
  lowStockThreshold: number;
  notifications: {
    pendingScans: boolean;
    pendingInvoices: boolean;
    redemptions: boolean;
    lowStock: boolean;
  };
}
