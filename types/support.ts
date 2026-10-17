import type { ID, ISODate, UserRole } from "./common";

export const TICKET_STATUSES = ["Open", "In Progress", "Resolved", "Closed"] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];
export type TicketPriority = "Low" | "Medium" | "High";

export interface TicketNote {
  at: ISODate;
  by: string;
  text: string;
}

export interface SupportTicket {
  id: ID;
  userId: ID;
  userRole: UserRole;
  subject: string;
  category: "Points" | "Scan" | "Invoice" | "Redemption" | "Account" | "Product";
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: ISODate;
  updatedAt: ISODate;
  notes: TicketNote[];
}
