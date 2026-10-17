import type { Metadata } from "next";
import { SchemesView } from "@/components/schemes/schemes-view";

export const metadata: Metadata = { title: "Schemes" };

export default function SchemesPage() {
  return <SchemesView />;
}
