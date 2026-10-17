import type { Metadata } from "next";
import { PlumberDetail } from "@/components/plumbers/plumber-detail";

export const metadata: Metadata = { title: "Plumber details" };

export default async function PlumberDetailPage(props: PageProps<"/plumbers/[id]">) {
  const { id } = await props.params;
  return <PlumberDetail id={id} />;
}
