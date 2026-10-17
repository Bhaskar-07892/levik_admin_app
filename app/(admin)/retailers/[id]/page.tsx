import type { Metadata } from "next";
import { RetailerDetail } from "@/components/retailers/retailer-detail";

export const metadata: Metadata = { title: "Retailer details" };

export default async function RetailerDetailPage(props: PageProps<"/retailers/[id]">) {
  const { id } = await props.params;
  return <RetailerDetail id={id} />;
}
