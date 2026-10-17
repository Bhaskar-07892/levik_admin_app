import type { Metadata } from "next";
import { ScansView } from "@/components/scans/scans-view";

export const metadata: Metadata = { title: "Product Scans" };

export default function ScansPage() {
  return <ScansView />;
}
