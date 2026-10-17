import type { Metadata } from "next";
import { RedemptionsView } from "@/components/redemptions/redemptions-view";

export const metadata: Metadata = { title: "Redemptions" };

export default function RedemptionsPage() {
  return <RedemptionsView />;
}
