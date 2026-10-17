import type { Metadata } from "next";
import { SchemeDetail } from "@/components/schemes/scheme-detail";

export const metadata: Metadata = { title: "Scheme details" };

export default async function SchemeDetailPage(props: PageProps<"/schemes/[id]">) {
  const { id } = await props.params;
  return <SchemeDetail id={id} />;
}
