import type { Metadata } from "next";
import { RedemptionDetail } from "@/components/redemptions/redemption-detail";

export const metadata: Metadata = { title: "Redemption" };

export default async function RedemptionDetailPage(props: PageProps<"/redemptions/[id]">) {
  const { id } = await props.params;
  return <RedemptionDetail id={id} />;
}
