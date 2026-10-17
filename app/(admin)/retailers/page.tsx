import type { Metadata } from "next";
import { RetailersView } from "@/components/retailers/retailers-view";

export const metadata: Metadata = { title: "Retailers" };

export default function RetailersPage() {
  return <RetailersView />;
}
