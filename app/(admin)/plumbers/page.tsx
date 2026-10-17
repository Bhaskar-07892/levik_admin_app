import type { Metadata } from "next";
import { PlumbersView } from "@/components/plumbers/plumbers-view";

export const metadata: Metadata = { title: "Plumbers" };

export default function PlumbersPage() {
  return <PlumbersView />;
}
