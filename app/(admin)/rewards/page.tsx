import type { Metadata } from "next";
import { RewardsView } from "@/components/rewards/rewards-view";

export const metadata: Metadata = { title: "Rewards Catalogue" };

export default function RewardsPage() {
  return <RewardsView />;
}
