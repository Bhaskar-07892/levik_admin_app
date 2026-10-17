import type { Metadata } from "next";
import { InvoicesView } from "@/components/invoices/invoices-view";

export const metadata: Metadata = { title: "Invoice Management" };

export default function InvoicesPage() {
  return <InvoicesView />;
}
