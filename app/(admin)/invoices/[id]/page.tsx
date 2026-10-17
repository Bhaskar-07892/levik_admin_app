import type { Metadata } from "next";
import { InvoiceDetail } from "@/components/invoices/invoice-detail";

export const metadata: Metadata = { title: "Invoice review" };

export default async function InvoiceDetailPage(props: PageProps<"/invoices/[id]">) {
  const { id } = await props.params;
  return <InvoiceDetail id={id} />;
}
