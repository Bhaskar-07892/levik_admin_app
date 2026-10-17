import type { ID, ISODate, StatusEvent } from "./common";

export const INVOICE_STATUSES = [
  "Submitted",
  "Under Review",
  "Approved",
  "Rejected",
  "More Information Required",
] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export interface InvoiceLineItem {
  id: ID;
  productId: ID;
  quantity: number;
  unitPrice: number;
}

export interface Invoice {
  id: ID;
  invoiceNumber: string;
  retailerId: ID;
  buyerName: string;
  invoiceDate: ISODate;
  submittedAt: ISODate;
  status: InvoiceStatus;
  lineItems: InvoiceLineItem[];
  reviewer?: string;
  reviewedAt?: ISODate;
  incentivePoints?: number;
  ledgerTxnId?: ID;
  rejectionReason?: string;
  infoRequest?: string;
  history: StatusEvent[];
}
