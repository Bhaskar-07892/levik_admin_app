/** Retailer stock orders to Levik (mirrors the API's ORDER_STATUSES). */
export const ORDER_STATUSES = ["Placed", "Confirmed", "Dispatched", "Delivered", "Cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Why a retailer's stock changed. */
export const STOCK_REASONS = ["Opening stock", "Order delivered", "Plumber sale", "Customer bill", "Manual adjustment"] as const;
export type StockReason = (typeof STOCK_REASONS)[number];
