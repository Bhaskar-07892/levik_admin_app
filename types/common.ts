export type ID = string;
export type ISODate = string;
export type UserRole = "plumber" | "retailer";

export interface StatusEvent {
  at: ISODate;
  by: string;
  action: string;
  note?: string;
}

export interface AdminUser {
  id: ID;
  name: string;
  email: string;
  role: "Programme Administrator";
}
