import type { Metadata } from "next";
import { ScanDetail } from "@/components/scans/scan-detail";

export const metadata: Metadata = { title: "Scan verification" };

export default async function ScanDetailPage(props: PageProps<"/scans/[id]">) {
  const { id } = await props.params;
  return <ScanDetail id={id} />;
}
